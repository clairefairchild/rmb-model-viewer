import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
const $=id=>document.getElementById(id);
const script=document.querySelector('script[type="module"]');
const base=new URL('../',script.src); // Shared bundle lives under assets/ on every host.
$('brand').href=base.href;$('models-nav').href=base.href;$('equipment-nav').href=new URL('equipment/',base).href;$('all-projects').href=base.href;
const relative=decodeURIComponent(location.pathname).slice(base.pathname.length).replace(/^\/+|\/+$/g,'');
const route=relative==='index.html'?'':relative.replace(/\/index.html$/,'');
const equipmentPrefix='equipment/';
const equipmentSlug=route.startsWith(equipmentPrefix)?route.slice(equipmentPrefix.length):'';
const pageType=route==='equipment'?'equipment-library':equipmentSlug?'equipment-detail':route?'project':'project-library';
const slug=pageType==='project'?route:'';
let renderer,scene,camera,controls,model,bounds,center,radius,walk=false,yaw=0,pitch=0,last=0;
let currentEquipment=null;
const pressed=new Set();let gesture=null;const state={ready:false,mode:'orbit',frames:0,pageType};
function fail(message){$('loading').hidden=true;$('error-message').textContent=message;$('error').hidden=false;}
$('retry').onclick=()=>location.reload();
try{
 if(pageType.startsWith('equipment')){
  $('models-nav').classList.remove('active');$('models-nav').removeAttribute('aria-current');$('equipment-nav').classList.add('active');$('equipment-nav').setAttribute('aria-current','page');
  const response=await fetch(new URL('equipment.json',base),{cache:'no-cache'});
  if(!response.ok)throw new Error('Equipment catalog is temporarily unavailable. Please try again.');
  const manifest=await response.json();
  if(pageType==='equipment-library'){
   $('equipment-library').hidden=false;$('library-footer').hidden=false;$('footer-context').textContent='RMB Suite · Equipment Review';document.title='Equipment | Roni’s Mac Bar';
   for(const item of manifest.equipment){
    const card=document.createElement('a');card.className='card equipment-card';card.href=new URL(`equipment/${item.slug}/`,base).href;
    if(item.thumbnail){const img=document.createElement('img');img.src=new URL(item.thumbnail,base);img.alt=item.name+' 3D model preview';card.append(img);}
    const body=document.createElement('div');body.className='card-body';
    const status=document.createElement('span');status.className='approval-status';status.textContent=item.approvalStatus;
    const heading=document.createElement('h2');heading.textContent=item.name;
    const product=document.createElement('p');product.className='equipment-model';product.textContent=item.productName;
    const dimensions=document.createElement('p');dimensions.className='equipment-dimensions';dimensions.textContent=item.dimensionLabel||`${item.envelope.width} × ${item.envelope.depth} × ${item.envelope.height} ${item.envelope.unit} · W × D × H`;
    const assembly=document.createElement('p');assembly.className='equipment-scope';assembly.textContent=item.assemblyHeightLabel||'';assembly.hidden=!item.assemblyHeightLabel;
    const metadata=document.createElement('p');metadata.className='equipment-meta';metadata.textContent=`Quantity ${item.quantity} · Source row ${item.sourceRow}`;
    const open=document.createElement('span');open.className='open';open.textContent='Review in 3D ↗';
    body.append(status,heading,product,dimensions,assembly,metadata,open);card.append(body);$('equipment-grid').append(card);
   }
  }else{
   currentEquipment=manifest.equipment.find(item=>item.slug===equipmentSlug);
   if(!currentEquipment)throw new Error('This equipment link is not in the catalog. Choose All equipment to find an available asset.');
   document.body.classList.add('equipment-detail');$('viewer').hidden=false;$('library-footer').hidden=true;$('all-projects').href=new URL('equipment/',base).href;$('all-projects').textContent='All equipment';
   document.querySelector('.project-info').hidden=true;$('equipment-details').hidden=false;$('canvas').setAttribute('aria-label',`Interactive 3D model of ${currentEquipment.name}`);
   for(const element of document.querySelectorAll('.project-control'))element.hidden=true;
   for(const element of document.querySelectorAll('.equipment-control'))element.hidden=false;
   $('approval-status').textContent=currentEquipment.approvalStatus;$('equipment-title').textContent=currentEquipment.name;$('equipment-model').textContent=currentEquipment.productName;
   $('equipment-dimension-heading').textContent=currentEquipment.dimensionHeading||(currentEquipment.dimensionLabel?'Certified dimensions':'Exact envelope');
   $('equipment-envelope').textContent=currentEquipment.dimensionLabel||`${currentEquipment.envelope.width} × ${currentEquipment.envelope.depth} × ${currentEquipment.envelope.height} ${currentEquipment.envelope.unit} (W × D × H)`;
   $('equipment-assembly-height').textContent=currentEquipment.assemblyHeightLabel||'';$('equipment-assembly-row').hidden=!currentEquipment.assemblyHeightLabel;
   $('equipment-source').textContent=currentEquipment.sourceRow;$('equipment-quantity').textContent=String(currentEquipment.quantity);$('equipment-fidelity').textContent=currentEquipment.fidelityNote;
   $('equipment-note-heading').textContent=currentEquipment.visualizationOnly?'Visualization scope':'Fidelity note';
   $('disclaimer').textContent=currentEquipment.visualizationOnly?'Certified dimensions apply to the body only · Displayed hardware is visualization-only.':'Review asset · Approval required before operational use.';$('help').textContent='Drag to orbit · Right-drag / two fingers to pan · Scroll / pinch to zoom';
   document.title=currentEquipment.name+' | Equipment Review';
   loadViewer(currentEquipment);
  }
 }else{
  const response=await fetch(new URL('projects.json',base),{cache:'no-cache'});
  if(!response.ok)throw new Error('Project catalog is temporarily unavailable. Please try again.');
  const manifest=await response.json();
  if(pageType==='project-library'){
  $('library').hidden=false;
  for(const project of manifest.projects){
   const card=document.createElement('a');card.className='card';card.href=new URL(`${project.slug}/`,base).href;
   if(project.thumbnail){const img=document.createElement('img');img.src=new URL(project.thumbnail,base);img.alt=project.title+' architectural preview';card.append(img);}
   const body=document.createElement('div');body.className='card-body';
   const eyebrow=document.createElement('div');eyebrow.className='eyebrow';eyebrow.textContent='INTERACTIVE 3D / '+(project.revision||'DESIGN MODEL');
   const heading=document.createElement('h2');heading.textContent=project.title;
   const desc=document.createElement('p');desc.textContent=project.description||'Explore this design from every angle.';
   const open=document.createElement('span');open.className='open';open.textContent='View model ↗';
   body.append(eyebrow,heading,desc,open);card.append(body);$('projects').append(card);
  }
 }else{
  $('viewer').hidden=false;$('library-footer').hidden=true;
  const project=manifest.projects.find(p=>p.slug===slug);
  if(!project)throw new Error('This project link is not in the catalog. Choose All projects to find an available space.');
  $('title').textContent=project.title;$('subtitle').textContent=project.revision||'Interactive design model';
  $('disclaimer').textContent=project.disclaimer||'Explicit-design first pass · Not construction documents or verified as-built.';
  document.title=project.title+' | Roni’s Mac Bar';
  loadViewer(project);
 }
 }
}catch(error){$('viewer').hidden=false;$('library-footer').hidden=true;fail(error.message||'This browser could not start the 3D viewer. Try a recent version of Chrome.');}
function loadViewer(record){
  initialize();
  new GLTFLoader().load(new URL(record.asset,base).href,gltf=>{
   model=gltf.scene;scene.add(model);bounds=new THREE.Box3().setFromObject(model);center=bounds.getCenter(new THREE.Vector3());radius=bounds.getSize(new THREE.Vector3()).length()/2;
   if(!Number.isFinite(radius)||radius<=0){fail('The model contains no viewable geometry.');return;}
   const size=bounds.getSize(new THREE.Vector3());
   const ground=new THREE.Mesh(new THREE.PlaneGeometry(radius*14,radius*14),new THREE.MeshStandardMaterial({color:0xe8e9df,roughness:1}));
   ground.rotation.x=-Math.PI/2;ground.position.set(center.x,bounds.min.y-.035,center.z);ground.receiveShadow=true;scene.add(ground);
   const sun=scene.getObjectByName("studio-sun");sun.position.copy(center).add(new THREE.Vector3(-radius,radius*2,radius));sun.target.position.copy(center);Object.assign(sun.shadow.camera,{left:-radius*1.4,right:radius*1.4,top:radius*1.4,bottom:-radius*1.4,near:.1,far:radius*6});sun.shadow.camera.updateProjectionMatrix();model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   controls.minDistance=Math.max(.2,radius*.02);controls.maxDistance=radius*10;camera.near=.025;camera.far=Math.max(1000,radius*40);camera.updateProjectionMatrix();
   state.ready=true;state.meshes=0;model.traverse(o=>{if(o.isMesh)state.meshes++;});state.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
   $('loading').hidden=true;home();
  },event=>{if(event.total){$('progress').value=event.loaded/event.total*100;$('load-message').textContent=`Opening 3D model… ${Math.round(event.loaded/event.total*100)}%`;}},()=>fail('The 3D model could not be downloaded. Check your connection and try again.'));
}
function initialize(){
 renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();scene.background=new THREE.Color(0xe8e9df);
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.35;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xfff9e6,0x7b8976,.65));
 const sun=new THREE.DirectionalLight(0xfff4dc,2.1);sun.name="studio-sun";sun.position.set(-8,18,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;scene.add(sun);scene.add(sun.target);
 camera=new THREE.PerspectiveCamera(45,1,.025,1000);
 controls=new OrbitControls(camera,$('canvas'));controls.enableDamping=true;controls.dampingFactor=.1;controls.maxPolarAngle=Math.PI/2-.01;controls.screenSpacePanning=true;
 new ResizeObserver(resize).observe($('viewer'));resize();
 $('canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();fail('Graphics were interrupted. Reload to reopen this model.');});
 $('home').onclick=home;$('front').onclick=front;$('rear').onclick=rear;$('bird').onclick=bird;$('walk').onclick=()=>setWalk(!walk);
 $('orbit-mode').onclick=()=>navigation('orbit');$('pan-mode').onclick=()=>navigation('pan');
 $('zoom-in').onclick=()=>zoom(.8);$('zoom-out').onclick=()=>zoom(1.25);
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('app').requestFullscreen)await $('app').requestFullscreen();else{$('help').textContent='Use your browser’s full-screen option for this device.';}}catch{$('help').textContent='Fullscreen is unavailable in this browser.';}};
 document.addEventListener('fullscreenchange',()=>{ $('fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));resize(); });
 $('canvas').addEventListener('pointerdown',e=>{if(!walk)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};$('canvas').setPointerCapture(e.pointerId);});
 $('canvas').addEventListener('pointermove',e=>{if(!walk||gesture?.id!==e.pointerId)return;yaw-=(e.clientX-gesture.x)*.004;pitch-=(e.clientY-gesture.y)*.004;pitch=THREE.MathUtils.clamp(pitch,-1.45,1.45);gesture={id:e.pointerId,x:e.clientX,y:e.clientY};orient();});
 const end=()=>{gesture=null;};$('canvas').addEventListener('pointerup',end);$('canvas').addEventListener('pointercancel',end);
 for(const btn of document.querySelectorAll('[data-move]')){
  btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);pressed.add(btn.dataset.move);btn.classList.add('active');});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(type,()=>{pressed.delete(btn.dataset.move);btn.classList.remove('active');});
 }
 addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();if(walk&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){e.preventDefault();pressed.add(key);}else if(key==='h')home();else if(currentEquipment&&key==='f')front();else if(currentEquipment&&key==='r')rear();else if(!currentEquipment&&key==='b')bird();else if(!currentEquipment&&key==='w')setWalk(true);else if(key==='escape')setWalk(false);});
 addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));addEventListener('blur',()=>pressed.clear());document.addEventListener('visibilitychange',()=>pressed.clear());
 renderer.setAnimationLoop(animate);
 // Read-only snapshot for functional verification; no mutation hooks.
 Object.defineProperty(window,'modelViewer',{value:()=>({...state,position:camera.position.toArray(),target:controls.target.toArray(),rotation:camera.rotation.toArray().slice(0,3),walk}),writable:false});
}
function resize(){if(!renderer)return;const r=$('viewer').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
function navigation(mode){if(!controls)return;controls.mouseButtons.LEFT=mode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;controls.touches.ONE=mode==='pan'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;$('orbit-mode').setAttribute('aria-pressed',String(mode==='orbit'));$('pan-mode').setAttribute('aria-pressed',String(mode==='pan'));}
function fit(direction){
 controls.target.copy(center);camera.position.copy(center).add(direction.clone().normalize().multiplyScalar(radius*4));camera.lookAt(center);camera.updateMatrixWorld();
 const inverse=camera.quaternion.clone().invert(),tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanX=tanY*camera.aspect;let distance=0;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse);distance=Math.max(distance,v.z+Math.max(Math.abs(v.x)/tanX,Math.abs(v.y)/tanY));}
 camera.position.copy(center).add(direction.normalize().multiplyScalar(distance*1.35));controls.update();
}
function home(){if(!state.ready)return;setWalk(false);controls.reset();navigation('orbit');fit(new THREE.Vector3(camera.aspect<.8?.8:.25,1.05,1.25));state.mode='home';$('mode-label').textContent='ORBIT VIEW';}
function front(){if(!state.ready||!currentEquipment)return;fit(new THREE.Vector3(0,.08,1));navigation('orbit');state.mode='front';$('mode-label').textContent='FRONT VIEW';}
function rear(){if(!state.ready||!currentEquipment)return;fit(new THREE.Vector3(0,.08,-1));navigation('orbit');state.mode='rear';$('mode-label').textContent='REAR VIEW';}
function bird(){if(!state.ready)return;setWalk(false);fit(new THREE.Vector3(0,1,.0001));state.mode='bird';$('mode-label').textContent='BIRD’S-EYE VIEW';}
function zoom(factor){if(!state.ready||walk)return;const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();}
function orient(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}
function setWalk(value){
 if(!state.ready)return;const previous=walk;walk=value;controls.enabled=!walk;pressed.clear();gesture=null;document.body.classList.toggle('walking',walk);$('walk-pad').hidden=!walk;$('walk').setAttribute('aria-pressed',String(walk));
 $('help').textContent=walk?'Drag to look · WASD / arrows or pad to move · Shift faster · Esc to exit · Free walk (no collisions)':'Drag to orbit · Right-drag / two fingers to pan · Scroll / pinch to zoom';
 $('mode-label').textContent=walk?'WALKTHROUGH':'ORBIT VIEW';state.mode=walk?'walk':'orbit';
 if(walk&&!previous){const size=bounds.getSize(new THREE.Vector3());camera.position.set(bounds.max.x-size.x*.2,Math.max(0,bounds.min.y)+1.65,center.z);yaw=Math.PI/2;pitch=0;orient();}
 if(!walk&&previous){controls.target.copy(camera.position).add(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).multiplyScalar(3));controls.update();}
}
function animate(time){const dt=Math.min((time-last)/1000,.05);last=time;if(walk){let forward=0,side=0;if(['w','arrowup','forward'].some(k=>pressed.has(k)))forward++;if(['s','arrowdown','backward'].some(k=>pressed.has(k)))forward--;if(['a','arrowleft','left'].some(k=>pressed.has(k)))side--;if(['d','arrowright','right'].some(k=>pressed.has(k)))side++;const movement=new THREE.Vector3(side,0,-forward);if(movement.lengthSq()){movement.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(dt*(pressed.has('shift')?5:2));camera.position.add(movement);camera.position.x=THREE.MathUtils.clamp(camera.position.x,bounds.min.x-radius,bounds.max.x+radius);camera.position.z=THREE.MathUtils.clamp(camera.position.z,bounds.min.z-radius,bounds.max.z+radius);}}else controls.update();renderer.render(scene,camera);state.frames++;}
