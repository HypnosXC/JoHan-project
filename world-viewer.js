import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';
const host=document.querySelector('#world-canvas'), status=document.querySelector('#world-status');
const play=document.querySelector('#world-play'), slider=document.querySelector('#world-frame');
let initialized=false;
document.querySelector('#world-load').addEventListener('click',async function(){
 if(initialized)return; this.disabled=true; status.textContent='Loading world-space meshes…';
 let renderer;
 try {
 const base='assets/world/';
 const get=async(name,json=false)=>{const r=await fetch(base+name);if(!r.ok)throw new Error('Could not load '+name);return json?r.json():r.arrayBuffer();};
 const meta=await get('sequence.json',true), faces=new Uint16Array(await get('faces.bin'));
 const scene=new THREE.Scene(); scene.background=new THREE.Color('#f4f7fa');
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Interactive world-space hand mesh. Drag to rotate; scroll or pinch to zoom.');
 const camera=new THREE.PerspectiveCamera(38,1,.001,100); camera.up.set(0,0,1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 scene.add(new THREE.HemisphereLight(0xffffff,0x788698,2.4));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(1,-2,3);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.near=.01;light.shadow.camera.far=12;light.shadow.camera.left=-2;light.shadow.camera.right=2;light.shadow.camera.top=2;light.shadow.camera.bottom=-2;light.shadow.normalBias=.003;scene.add(light);
 const fill=new THREE.DirectionalLight(0xd6e8ff,1);fill.position.set(-2,1,.5);scene.add(fill);
 const models={},colors={ours:0x377fc4,gt:0x29a89c,hawor:0xd6a24a};
 for(const key of Object.keys(colors)){
  const [vb,wb]=await Promise.all([get(key+'.bin'),get(key+'-wrist.bin')]);
  const vertices=new Float32Array(vb), wrists=new Float32Array(wb);
  const geo=new THREE.BufferGeometry();geo.setIndex(new THREE.BufferAttribute(faces,1));geo.setAttribute('position',new THREE.BufferAttribute(vertices.slice(0,meta.vertexCount*3),3));
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:colors[key],roughness:.6,metalness:.02,side:THREE.DoubleSide}));mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(wrists,3));
  const line=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:colors[key],transparent:true,opacity:.7}));
  scene.add(mesh,line);models[key]={vertices,mesh,line};mesh.visible=line.visible=document.querySelector(`[data-world-model="${key}"]`).checked;
 }
 // A fixed reference plane provides scale; it is not estimated scene geometry.
 const environment=new THREE.Group();environment.visible=document.querySelector('#world-environment').checked;scene.add(environment);
 const referenceBounds=new THREE.Box3();
 for(const model of Object.values(models)){const referenceVertices=model.vertices;
 for(let i=0;i<referenceVertices.length;i+=3)referenceBounds.expandByPoint(new THREE.Vector3(referenceVertices[i],referenceVertices[i+1],referenceVertices[i+2]));}
 const referenceCenter=referenceBounds.getCenter(new THREE.Vector3());
 let floorZ=Math.floor((referenceBounds.min.z-.12)*10)/10;
 const extent=Math.max(1.6,Math.ceil(referenceBounds.getSize(new THREE.Vector3()).length()*1.5*10)/10);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(extent,extent),new THREE.MeshStandardMaterial({color:0xe5eaf0,roughness:1,side:THREE.DoubleSide}));
 floor.position.set(referenceCenter.x,referenceCenter.y,floorZ);floor.receiveShadow=true;environment.add(floor);
 const grid=new THREE.GridHelper(extent,Math.round(extent/.1),0xa6b7c8,0xc4d0dc);grid.rotation.x=Math.PI/2;grid.position.copy(floor.position);grid.position.z+=.0005;environment.add(grid);
 const dropGeo=new THREE.BufferGeometry();dropGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
 const drop=new THREE.Line(dropGeo,new THREE.LineDashedMaterial({color:0x8296aa,dashSize:.018,gapSize:.012,transparent:true,opacity:.65}));environment.add(drop);
 const marker=new THREE.Mesh(new THREE.RingGeometry(.014,.02,32),new THREE.MeshBasicMaterial({color:0x377fc4,side:THREE.DoubleSide}));environment.add(marker);
 function referenceAt(i){const w=models.ours.line.geometry.attributes.position.array;const x=w[i*3],y=w[i*3+1],z=w[i*3+2];dropGeo.attributes.position.array.set([x,y,z,x,y,floorZ+.002]);dropGeo.attributes.position.needsUpdate=true;drop.computeLineDistances();drop.frustumCulled=false;marker.position.set(x,y,floorZ+.003);drop.visible=marker.visible=models.ours.mesh.visible;}
 document.querySelector('#world-environment').disabled=false;
 document.querySelector('#world-environment').addEventListener('change',e=>{environment.visible=e.target.checked;});
 function reset(){
  camera.fov=38;camera.up.set(0,0,1);camera.updateProjectionMatrix();
  const bounds=new THREE.Box3();
  for(const m of Object.values(models))if(m.mesh.visible){const v=m.vertices;for(let i=0;i<v.length;i+=3)bounds.expandByPoint(new THREE.Vector3(v[i],v[i+1],v[i+2]));}
  if(bounds.isEmpty())return;
  floorZ=Math.floor((bounds.min.z-.12)*10)/10;floor.position.z=floorZ;grid.position.z=floorZ+.0005;referenceAt(frame);
  const center=bounds.getCenter(new THREE.Vector3()),span=bounds.getSize(new THREE.Vector3()).length();
  controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(.85,-1.3,.85).multiplyScalar(span/Math.min(camera.aspect,1)));controls.update();
 }
 const axes=new THREE.AxesHelper(.15);scene.add(axes);
 function label(text,color,pos){const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.font='bold 36px Arial';ctx.fillStyle=color;ctx.fillText(text,12,44);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));s.position.copy(pos);s.scale.set(.08,.04,1);scene.add(s);}
 label('X','#b94b48',new THREE.Vector3(.18,0,0));label('Y','#368346',new THREE.Vector3(0,.18,0));label('Z','#417bbd',new THREE.Vector3(0,0,.18));
 let frame=0,playing=false,last=0,elapsed=0;
 function show(i){frame=i;referenceAt(i);for(const m of Object.values(models)){m.mesh.geometry.attributes.position.array.set(m.vertices.subarray(i*meta.vertexCount*3,(i+1)*meta.vertexCount*3));m.mesh.geometry.attributes.position.needsUpdate=true;m.mesh.geometry.computeVertexNormals();}slider.value=i;document.querySelector('#world-count').textContent=`Frame ${i} / ${meta.frameCount-1}`;}
 show(0);slider.max=meta.frameCount-1;slider.disabled=false;play.disabled=false;
 play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'Pause':'Play';elapsed=0;});
 slider.addEventListener('input',()=>{playing=false;play.textContent='Play';show(Number(slider.value));});
 document.querySelector('#world-reset').disabled=false;document.querySelector('#world-reset').addEventListener('click',reset);
 document.querySelectorAll('[data-world-model]').forEach(el=>{el.disabled=false;el.addEventListener('change',()=>{const m=models[el.dataset.worldModel];m.mesh.visible=el.checked;m.line.visible=el.checked&&document.querySelector('#world-trail').checked;referenceAt(frame);reset();});});
 document.querySelector('#world-trail').addEventListener('change',e=>{for(const m of Object.values(models))m.line.visible=m.mesh.visible&&e.target.checked;});
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();reset();
 renderer.setAnimationLoop(now=>{const delta=Math.min((now-last)/1000,.1);last=now;if(playing&&!document.hidden){elapsed+=delta;const step=1/Number(document.querySelector('#world-fps').value);if(elapsed>=step){const count=Math.floor(elapsed/step);show((frame+count)%meta.frameCount);elapsed%=step;}}controls.update();renderer.render(scene,camera);});
 status.textContent='Loading reconstructed scene…';
 // Scene reconstruction is a separate artifact: a failure must not disable hand playback.
 try {
  const info=await get('scene/scene.json',true);
  const [pb,cb]=await Promise.all([get('scene/scene-positions.bin'),get('scene/scene-colors.bin')]);
  const positions=new Float32Array(pb),srgb=new Uint8Array(cb),linear=new Float32Array(srgb.length);
  if(positions.length!==info.pointCount*3||srgb.length!==positions.length)throw new Error('Invalid scene buffer lengths');
  for(let i=0;i<srgb.length;i++){const c=srgb[i]/255;linear[i]=c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(linear,3));
  const material=new THREE.PointsMaterial({size:.007,vertexColors:true,sizeAttenuation:true});
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};
  const cloud=new THREE.Points(geo,material);scene.add(cloud);
  const toggle=document.querySelector('#world-scene');toggle.disabled=false;cloud.visible=toggle.checked;
  toggle.addEventListener('change',()=>{cloud.visible=toggle.checked;});
  const recorded=document.querySelector('#world-recorded');recorded.disabled=false;
  const recordedCamera=()=>{camera.position.fromArray(info.cameraPosition);camera.up.fromArray(info.cameraUp);controls.target.fromArray(info.cameraTarget);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(info.cameraFov/2))/Math.min(camera.aspect,1)));camera.updateProjectionMatrix();controls.update();};
  recorded.addEventListener('click',()=>{playing=false;play.textContent='Play';show(info.referenceFrame);recordedCamera();});
  recordedCamera();
  document.querySelector('#scene-status').textContent=`Scene: ${info.sourceFrames.length} depth keyframes · ${info.pointCount.toLocaleString()} coloured points · dataset camera registration`;
 }catch(error){document.querySelector('#world-scene').checked=false;document.querySelector('#scene-status').textContent='Scene data could not load. Hand motion remains available.';console.error(error);}
 this.hidden=true;initialized=true;status.textContent='Drag to orbit · Scroll or pinch to zoom · Right-drag to pan';
 }catch(error){renderer?.dispose();host.querySelector('canvas')?.remove();status.textContent='Unable to load the 3D viewer. Please check WebGL support and try again.';this.disabled=false;console.error(error);}
});
