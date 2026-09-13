import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import blasterUrl from './assets/cartoon-macaroni-blaster.glb?url';

// Independent fixed-FOV viewmodel pass: never clips into the equipment/floorplan,
// never participates in measurement/collision raycasts, and has stable ADS framing.
export class CheeseBlaster {
 constructor(environment) {
  this.scene=new THREE.Scene();this.scene.environment=environment;this.scene.environmentIntensity=.65;
  this.camera=new THREE.PerspectiveCamera(45,1,.01,10);
  this.scene.add(new THREE.HemisphereLight(0xfff5df,0x68534a,2));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-2,3,3);this.scene.add(key);
  this.root=new THREE.Group();this.root.scale.setScalar(.62);this.scene.add(this.root);
  this.status='idle';this.recoil=0;this.enabled=false;this.lastShot=null;
  this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  this.fallback=new THREE.Group();
  const noodle=new THREE.Mesh(new THREE.TorusGeometry(.14,.045,8,20,Math.PI*1.5),new THREE.MeshStandardMaterial({color:0xfdb431,roughness:.5}));
  noodle.position.set(0,.1,-.15);this.fallback.add(noodle);
  const pod=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),new THREE.MeshStandardMaterial({color:0xef771f,roughness:.5}));pod.scale.set(1,.75,1.3);this.fallback.add(pod);this.root.add(this.fallback);
  this.muzzle=new THREE.Object3D();this.muzzle.position.set(0,.1,-.29);this.root.add(this.muzzle);
  this.pose(0,0,false);
 }
 load() {
  if(this.status!=='idle')return;this.status='loading';
  new GLTFLoader().load(blasterUrl,gltf=>{
   const muzzle=gltf.scene.getObjectByName('Muzzle');
   if(!muzzle){this.disposeAsset(gltf.scene);this.status='fallback';return;}
   this.root.remove(this.fallback,this.muzzle);this.disposeAsset(this.fallback);
   this.root.add(gltf.scene);this.muzzle=muzzle;this.status='ready';
  },undefined,()=>{this.status='fallback';});
 }
 disposeAsset(root){root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();}});}
 setEnabled(value){this.enabled=value;if(value)this.load();else{this.recoil=0;this.lastShot=null;this.pose(0,0,false);}}
 pose(dt,time,aiming){
  const motion=!this.reducedMotion.matches,blend=dt?1-Math.exp(-dt*12):1;
  this.recoil=Math.max(0,this.recoil-dt*5);
  const bob=motion&&!aiming?Math.sin(time*.0018)*.003:0;
  this.root.position.lerp(new THREE.Vector3(aiming?.075:.40,-.34+bob,-.96+(motion?this.recoil*.045:0)),blend);
  this.root.rotation.set(motion?this.recoil*.065:0,aiming?0:-.16,aiming?0:-.08);
  this.scene.updateMatrixWorld(true);
 }
 render(renderer,aspect,dt,time,aiming){
  if(!this.enabled)return;this.camera.aspect=aspect;this.camera.updateProjectionMatrix();this.pose(dt,time,aiming);
  const autoClear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.scene,this.camera);renderer.autoClear=autoClear;
 }
 shot(camera){
  this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const ndc=this.muzzle.getWorldPosition(new THREE.Vector3()).project(this.camera);
  // Map the visible viewmodel anchor into the world-camera frustum. Using camera
  // coordinates (not a fixed right/up offset) keeps alignment exact through ADS.
  const local=new THREE.Vector3(ndc.x,ndc.y,.5).unproject(camera).sub(camera.position);
  const forward=camera.getWorldDirection(new THREE.Vector3());
  local.multiplyScalar(.72/local.dot(forward));
  const origin=camera.position.clone().add(local);
  this.lastShot={origin:origin.toArray(),muzzleNdc:[ndc.x,ndc.y],asset:this.status};this.recoil=1;
  return origin;
 }
 snapshot(){const ndc=this.muzzle.getWorldPosition(new THREE.Vector3()).project(this.camera);return {status:this.status,visible:this.enabled,muzzleNdc:[ndc.x,ndc.y],lastShot:this.lastShot};}
}
