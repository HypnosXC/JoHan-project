"""Rank existing evaluation clips by JoHan mean world-joint error.
Does not realign, smooth, or change any prediction.
"""
import argparse,json
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--ours',required=True);p.add_argument('--baseline',required=True);p.add_argument('--faces-archive',required=True);p.add_argument('--output',required=True);a=p.parse_args()
o=np.load(a.ours,allow_pickle=False);h=np.load(a.baseline,allow_pickle=False);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
def units(d):
 lens=d['unit_len'];vids=d['unit_video'];frames=d['frames'];w=d['w'];pa=d['pa'];mp=d['mpjpe'];offs=np.r_[0,np.cumsum(lens)];rows=[]
 for i,n in enumerate(lens):
  s,e=int(offs[i]),int(offs[i+1]);f=frames[s:e]
  if not np.isfinite(w[s:e]).all():continue
  rows.append(dict(video=str(vids[i]),start=int(f[0]),end=int(f[-1]),n=int(n),w=float(w[s:e].mean()),pa=float(pa[s:e].mean()),mpjpe=float(mp[s:e].mean()),offset=[s,e],frames=f.tolist()))
 return rows
rows=sorted(units(o),key=lambda r:r['w']);br={(r['video'],tuple(r['frames'])):r for r in units(h)}
long=[r for r in rows if (r['video'],tuple(r['frames'])) in br]
assert long
report={'criterion':'Lowest JoHan mean first-aligned world-joint error among all saved matched clips','allClips':len(rows),'eligibleClips':len(long),'overallMinimum':rows[0],'top10':long[:10]}
(out/'selection.json').write_text(json.dumps(report,indent=2)+'\n')
r=long[0];b=br[(r['video'],tuple(r['frames']))];s,e=r['offset'];hs,he=b['offset']
arrays={'video':np.array(r['video']),'frames':np.array(r['frames']),'faces':np.load(a.faces_archive,allow_pickle=False)['faces']}
for target,source,d,start,end in [('ours','pred',o,s,e),('gt','gt',o,s,e),('hawor','pred',h,hs,he)]:
 for suffix in ['world_v','world_j','cam_v']:arrays[target+'_'+suffix]=d[source+'_'+suffix][start:end].astype(np.float32)
np.savez_compressed(out/'selected.npz',**arrays)
print(json.dumps({k:v for k,v in report.items() if k!='top10'}),flush=True)
print('TOP10',json.dumps([{k:v for k,v in r.items() if k not in ['frames','offset']} for r in long[:10]]),flush=True)
