"""Reconstruct RGB scene points from saved SLAM inverse depths (no inference).

Dataset camera poses register scene context to the evaluation world frame.
Hand predictions are not changed. Inputs remain private; only numeric geometry,
RGB colours and explicit provenance are exported.
"""
import argparse, json
from pathlib import Path
import cv2
import numpy as np
from pycocotools import mask as masktools

p=argparse.ArgumentParser()
for k in ['slam','images','gt-cache','hand-archive','masks','output']:p.add_argument('--'+k,required=True)
p.add_argument('--chunk-start',type=int,required=True)
a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
s=np.load(a.slam,allow_pickle=False);g=np.load(a.gt_cache,allow_pickle=False);hands=np.load(a.hand_archive,allow_pickle=False)
frames=hands['frames'];images=sorted(Path(a.images).glob('*.jpg'))
kframes=s['tstamp'].astype(int)+a.chunk_start
ids=np.where((kframes>=frames[0])&(kframes<=frames[-1]))[0]
if not len(ids):
 # SLAM creates keyframes only when the camera moves. A static-camera interval
 # can have none; use nearby recorded observations of the same environment.
 ids=np.where((kframes>=frames[0]-90)&(kframes<=frames[-1]+90))[0]
 if len(ids)>3:ids=np.sort(ids[np.argsort(np.abs(kframes[ids]-np.mean(frames)))[:3]])
assert len(ids),f'No nearby depth keyframes: {kframes.tolist()}'
if len(ids)>5:ids=ids[np.linspace(0,len(ids)-1,5).round().astype(int)]
# Exact dataset cameras also generated the GT meshes in this evaluation archive.
R=g['R_w2c'];t=g['t_w2c'];recovered=(hands['gt_cam_v']-t[frames,None,:])@R[frames]
err=np.linalg.norm(recovered-hands['gt_world_v'],axis=-1)
assert np.mean(err)<.001 and np.max(err)<.004,(np.mean(err),np.max(err))
print('Camera registration error (m), mean/max:',float(err.mean()),float(err.max()),flush=True)
masks=np.load(a.masks,allow_pickle=True)
views=[]
for ki in ids:
 f=int(kframes[ki]);rgb=cv2.cvtColor(cv2.imread(str(images[f])),cv2.COLOR_BGR2RGB);h0,w0=rgb.shape[:2]
 h1=int(h0*np.sqrt((384*512)/(h0*w0)));w1=int(w0*np.sqrt((384*512)/(h0*w0)))
 H=h1-h1%8;W=w1-w1%8
 rgbsmall=cv2.resize(rgb,(w1,h1))[:H,:W]
 disp=s['disps'][ki].astype(float);assert disp.shape==(H,W),(disp.shape,H,W)
 z=float(s['scale'])/np.maximum(disp,1e-12)
 fx=float(s['img_focal'])*w1/w0;fy=float(s['img_focal'])*h1/h0
 cx=float(s['img_center'][0])*w1/w0;cy=float(s['img_center'][1])*h1/h0
 handmask=masktools.decode(masks[f]);handmask=np.max(handmask,axis=-1) if handmask.ndim==3 else handmask
 handmask=cv2.resize(handmask.astype('uint8'),(w1,h1),interpolation=cv2.INTER_NEAREST)[:H,:W]
 handmask=cv2.dilate(handmask,np.ones((11,11),np.uint8))>0
 valid=np.isfinite(z)&(disp>0)&(z>.15)&(z<4)&(~handmask)
 # Discard depth discontinuities, where lifted pixels can form floating streaks.
 low=cv2.erode(z.astype('float32'),np.ones((3,3),np.uint8));high=cv2.dilate(z.astype('float32'),np.ones((3,3),np.uint8))
 valid &= (high-low)<(.025+.04*z)
 views.append(dict(frame=f,rgb=rgb,rgbsmall=rgbsmall,z=z,valid=valid,fx=fx,fy=fy,cx=cx,cy=cy,R=R[f],t=t[f]))
 print('Depth view',f,'valid pixels',int(valid.sum()),flush=True)
positions=[];colours=[];kept=[]
for v in views:
 yy,xx=np.where(v['valid']);z=v['z'][yy,xx]
 pc=np.stack([(xx-v['cx'])*z/v['fx'],(yy-v['cy'])*z/v['fy'],z],axis=-1)
 pw=(pc-v['t'])@v['R'];supports=np.ones(len(pw),int)
 for other in views:
  if other is v:continue
  q=pw@other['R'].T+other['t'];positive=q[:,2]>.01
  uvx=np.rint(q[:,0]/np.maximum(q[:,2],.01)*other['fx']+other['cx']).astype(int)
  uvy=np.rint(q[:,1]/np.maximum(q[:,2],.01)*other['fy']+other['cy']).astype(int)
  h,w=other['z'].shape;ok=positive&(uvx>=0)&(uvx<w)&(uvy>=0)&(uvy<h)
  ix=np.where(ok)[0];x=uvx[ix];y=uvy[ix];depth=other['z'][y,x]
  agrees=other['valid'][y,x]&(np.abs(q[ix,2]-depth)<(.025+.03*depth))
  supports[ix[agrees]]+=1
 keep=supports>=min(2,len(views));positions.append(pw[keep]);colours.append(v['rgbsmall'][yy[keep],xx[keep]]);kept.append(int(keep.sum()))
points=np.concatenate(positions);colors=np.concatenate(colours);assert len(points)>1000
# Average observations per 5 mm voxel; retain deterministic order.
_,inv=np.unique(np.floor(points/.005).astype(np.int32),axis=0,return_inverse=True)
counts=np.bincount(inv);pts=np.stack([np.bincount(inv,weights=points[:,j])/counts for j in range(3)],axis=1)
cols=np.stack([np.bincount(inv,weights=colors[:,j])/counts for j in range(3)],axis=1).round().astype('uint8')
assert np.isfinite(pts).all();pts.astype('<f4').tofile(out/'scene-positions.bin');cols.tofile(out/'scene-colors.bin')
center=min(views,key=lambda v:abs(v['frame']-np.mean(frames)))
rgb=center['rgb'];rgb=cv2.resize(rgb,(640,round(640*rgb.shape[0]/rgb.shape[1])));cv2.imwrite(str(out/'scene-reference.webp'),cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),[cv2.IMWRITE_WEBP_QUALITY,85])
ci=int(frames[len(frames)//2]);cp=-R[ci].T@t[ci];forward=R[ci].T@np.array([0.,0.,1.]);up=R[ci].T@np.array([0.,-1.,0.])
m={'pointCount':len(pts),'sourceFrames':[v['frame'] for v in views],'referenceFrame':ci-int(frames[0]),'referenceSourceFrame':int(center['frame']),'recordedSourceFrame':ci,'units':'metres','depthSource':'Saved HaWoR masked DROID-SLAM depths, using the saved Metric3D scale','registration':'Dataset camera extrinsics in the GT world coordinate frame; hand predictions unchanged','representation':'Partial RGB point cloud, 5 mm voxel fusion; moving hand masks excluded; cross-view depth consistency required where available','cameraRegistrationMeanErrorM':float(err.mean()),'cameraRegistrationMaxErrorM':float(err.max()),'depthScale':float(s['scale']),'depthValidPoints':[int(v['valid'].sum()) for v in views],'consistentPoints':kept,'cameraPosition':cp.tolist(),'cameraTarget':(cp+forward).tolist(),'cameraUp':up.tolist(),'cameraFov':float(np.degrees(2*np.arctan(float(s['img_center'][1])/float(s['img_focal']))))}
(out/'scene.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m),flush=True)
