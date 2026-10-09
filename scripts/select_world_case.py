"""Rank existing evaluation clips by JoHan mean world-joint error.
Does not realign, smooth, or change any prediction.
"""
import argparse,json
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--ours',required=True);p.add_argument('--baseline',required=True);p.add_argument('--faces-archive',required=True);p.add_argument('--output',required=True);p.add_argument('--min-frames',type=int,default=0);p.add_argument('--min-displacement',type=float,default=0);p.add_argument('--min-travel',type=float,default=0);a=p.parse_args()
o=np.load(a.ours,allow_pickle=False);h=np.load(a.baseline,allow_pickle=False);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
def units(d):
 lens=d['unit_len'];vids=d['unit_video'];frames=d['frames'];w=d['w'];pa=d['pa'];mp=d['mpjpe'];offs=np.r_[0,np.cumsum(lens)];rows=[]
 for i,n in enumerate(lens):
  s,e=int(offs[i]),int(offs[i+1]);f=frames[s:e]
  if not np.isfinite(w[s:e]).all():continue
  rows.append(dict(video=str(vids[i]),start=int(f[0]),end=int(f[-1]),n=int(n),w=float(w[s:e].mean()),pa=float(pa[s:e].mean()),mpjpe=float(mp[s:e].mean()),offset=[s,e],frames=f.tolist()))
 return rows
rows=sorted(units(o),key=lambda r:r['w']);br={(r['video'],tuple(r['frames'])):r for r in units(h)}
gt=o['gt_world_j'][:,0]
for r in rows:
 start,end=r['offset'];wrist=gt[start:end].astype(float)
 # World-space GT motion only: sparse samples suppress accumulation of tiny
 # framewise annotation changes in the travel-length criterion.
 sampled=wrist[np.unique(np.r_[np.arange(0,len(wrist),5),len(wrist)-1])]
 r['gtWristDisplacementM']=float(np.linalg.norm(wrist[:,None]-wrist[None,:],axis=-1).max())
 r['gtWristTravelM']=float(np.linalg.norm(np.diff(sampled,axis=0),axis=-1).sum())
long=[r for r in rows if (r['video'],tuple(r['frames'])) in br and r['n']>=a.min_frames and r['gtWristDisplacementM']>=a.min_displacement and r['gtWristTravelM']>=a.min_travel]
assert long
report={'criterion':'Lowest JoHan mean first-aligned world-joint error among matched clips passing GT-motion thresholds','minimumFrames':a.min_frames,'minimumGTWristDisplacementM':a.min_displacement,'minimumGTWristTravelM':a.min_travel,'allClips':len(rows),'eligibleClips':len(long),'overallMinimum':rows[0],'top10':long[:10]}
(out/'selection.json').write_text(json.dumps(report,indent=2)+'\n')
r=long[0];b=br[(r['video'],tuple(r['frames']))];s,e=r['offset'];hs,he=b['offset']
arrays={'video':np.array(r['video']),'frames':np.array(r['frames']),'faces':np.load(a.faces_archive,allow_pickle=False)['faces']}
for target,source,d,start,end in [('ours','pred',o,s,e),('gt','gt',o,s,e),('hawor','pred',h,hs,he)]:
 for suffix in ['world_v','world_j','cam_v']:arrays[target+'_'+suffix]=d[source+'_'+suffix][start:end].astype(np.float32)
np.savez_compressed(out/'selected.npz',**arrays)
print(json.dumps({k:v for k,v in report.items() if k!='top10'}),flush=True)
print('TOP10',json.dumps([{k:v for k,v in r.items() if k not in ['frames','offset']} for r in long[:10]]),flush=True)
