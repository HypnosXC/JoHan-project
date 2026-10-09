"""Export numeric world-space meshes from an existing evaluation archive."""
import argparse, json, hashlib
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser(); p.add_argument('source'); p.add_argument('output'); a=p.parse_args()
src=Path(a.source); out=Path(a.output); out.mkdir(parents=True,exist_ok=True)
d=np.load(src,allow_pickle=False); faces=d['faces']; n=len(d['frames']); nv=d['ours_world_v'].shape[1]
assert faces.min()>=0 and faces.max()<nv
faces.astype('<u2').tofile(out/'faces.bin')
for key in ['ours','gt','hawor']:
    v=d[key+'_world_v']; j=d[key+'_world_j']
    assert v.shape==(n,nv,3) and np.isfinite(v).all() and np.isfinite(j).all()
    v.astype('<f4').tofile(out/(key+'.bin'))
    j[:,0,:].astype('<f4').tofile(out/(key+'-wrist.bin'))
m={'sequence':str(d['video']), 'frameCount':n,'vertexCount':nv,'sourceFrames':d['frames'].tolist(),'units':'metres','coordinateFrame':'First-aligned world evaluation frame','sourceSHA256':hashlib.sha256(src.read_bytes()).hexdigest()}
(out/'sequence.json').write_text(json.dumps(m,indent=2)+'\n')
print('Exported',n,'frames;',nv,'vertices per mesh')
