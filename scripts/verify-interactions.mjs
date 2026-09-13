import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin=process.env.VIEWER_ORIGIN||'http://127.0.0.1:4177';
const out=new URL('../evidence/global-viewer-upgrades/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const report={origin,pages:[],pointerLock:null,consoleErrors:[]};

async function ready(page,path){
 const errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.modelViewer?.().ready,{timeout:120000});
 report.pages.push({path,meshes:(await page.evaluate(()=>window.modelViewer())).meshes});return errors;
}

const desktop=await browser.newContext({viewport:{width:1440,height:900}}),page=await desktop.newPage();
let errors=await ready(page,'/equipment/vollrath-38002/');
const canvas=page.locator('#canvas'),box=await canvas.boundingBox();assert(box);

// Plain primary drag orbits. Shift can be pressed and released without mouse-up;
// each switch consumes one move as the jump-free baseline, then continues in the new mode.
const start=await page.evaluate(()=>window.modelViewer());
await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.60,box.y+box.height*.57,{steps:3});
const orbited=await page.evaluate(()=>window.modelViewer());assert.notDeepEqual(orbited.position,start.position,'plain primary drag orbits');
await page.keyboard.down('Shift');const beforeSwitch=await page.evaluate(()=>window.modelViewer());await page.mouse.move(box.x+box.width*.64,box.y+box.height*.59);const baseline=await page.evaluate(()=>window.modelViewer());assert.deepEqual(baseline.position,beforeSwitch.position,'mode switch resets its movement baseline');
await page.mouse.move(box.x+box.width*.69,box.y+box.height*.62,{steps:2});const panned=await page.evaluate(()=>window.modelViewer());assert.notDeepEqual(panned.target,baseline.target,'held drag continues as pan after Shift is pressed');
await page.keyboard.up('Shift');await page.mouse.move(box.x+box.width*.72,box.y+box.height*.63);const releaseBaseline=await page.evaluate(()=>window.modelViewer());await page.mouse.move(box.x+box.width*.76,box.y+box.height*.64,{steps:2});const orbitAgain=await page.evaluate(()=>window.modelViewer());assert.notDeepEqual(orbitAgain.position,releaseBaseline.position,'held drag returns to orbit after Shift release');await page.mouse.up();

// Wheel focus follows the pointer, including a no-hit fallback near a corner.
await page.getByRole('button',{name:/Home/}).click();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.wheel(0,-120);const centerFocus=(await page.evaluate(()=>window.modelViewer())).lastZoomFocus;
await page.getByRole('button',{name:/Home/}).click();await page.mouse.move(box.x+18,box.y+box.height-18);await page.mouse.wheel(0,-120);const cornerFocus=(await page.evaluate(()=>window.modelViewer())).lastZoomFocus;assert.notDeepEqual(cornerFocus,centerFocus,'cursor-targeted zoom focus differs at center and bottom corner');
await page.getByRole('button',{name:/Home/}).click();
await page.screenshot({path:new URL('equipment-before-measure.png',out).pathname,fullPage:true});

// Measurement two-click state, persistent label, selection/delete, and reload reset.
await page.getByRole('button',{name:/Measure/}).click();assert.equal((await page.evaluate(()=>window.modelViewer())).measure.active,true);
const points=[];for(let y=.2;y<=.75;y+=.08)for(let x=.22;x<=.78;x+=.08)points.push([x,y]);
for(const [x,y] of points){await page.mouse.move(box.x+box.width*x,box.y+box.height*y);if(!(await page.evaluate(()=>window.modelViewer())).measure.hover)continue;await page.mouse.click(box.x+box.width*x,box.y+box.height*y);if((await page.evaluate(()=>window.modelViewer())).measure.draft)break;}
assert.equal((await page.evaluate(()=>window.modelViewer())).measure.draft,true,'first measurement click locks point A');
for(const [x,y] of points.slice().reverse()){await page.mouse.move(box.x+box.width*x,box.y+box.height*y);if(!(await page.evaluate(()=>window.modelViewer())).measure.hover)continue;await page.mouse.click(box.x+box.width*x,box.y+box.height*y);if((await page.evaluate(()=>window.modelViewer())).measure.completed)break;}
let measured=await page.evaluate(()=>window.modelViewer());assert.equal(measured.measure.completed,1,'second click creates a session measurement');assert.match(await page.locator('.measurement-saved').textContent(),/ in$/);assert(measured.measure.selectedId);
await page.screenshot({path:new URL('equipment-measure.png',out).pathname,fullPage:true});
await page.keyboard.press('Delete');assert.equal((await page.evaluate(()=>window.modelViewer())).measure.completed,0,'Delete removes selected measurement');
await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.modelViewer?.().ready,{timeout:120000});assert.equal((await page.evaluate(()=>window.modelViewer())).measure.completed,0,'reload clears session-only measurements');
await page.screenshot({path:new URL('equipment-desktop.png',out).pathname,fullPage:true});

report.consoleErrors.push(...errors);await desktop.close();

const floor=await browser.newContext({viewport:{width:1440,height:900}}),floorPage=await floor.newPage();errors=await ready(floorPage,'/roll-em-up-la-vista-floorplan-v001/');assert(await floorPage.getByRole('button',{name:/Measure/}).isVisible());await floorPage.screenshot({path:new URL('floorplan-desktop.png',out).pathname,fullPage:true});
// Pointer lock is exercised when Chromium permits it; lifecycle tests remain authoritative if denied.
await floorPage.getByRole('button',{name:/Walk through/}).click();await floorPage.waitForTimeout(500);let walkState=await floorPage.evaluate(()=>window.modelViewer());report.pointerLock=walkState.pointerLocked;
if(walkState.pointerLocked){
 const beforeLook=await floorPage.evaluate(()=>window.modelViewer());await floorPage.mouse.move(700,520);const afterLook=await floorPage.evaluate(()=>window.modelViewer());assert.notDeepEqual(afterLook.rotation,beforeLook.rotation,'pointer-lock mouse movement changes yaw/pitch');await floorPage.keyboard.down('w');await floorPage.waitForTimeout(180);await floorPage.keyboard.up('w');assert.notDeepEqual((await floorPage.evaluate(()=>window.modelViewer())).position,afterLook.position,'WASD moves relative to walkthrough camera');
 await floorPage.keyboard.press('r');assert.equal((await floorPage.evaluate(()=>window.modelViewer())).shooter.enabled,true);const normalFov=(await floorPage.evaluate(()=>window.modelViewer())).fov;await floorPage.mouse.down({button:'right'});assert.equal((await floorPage.evaluate(()=>window.modelViewer())).shooter.aiming,true);await floorPage.waitForTimeout(180);assert((await floorPage.evaluate(()=>window.modelViewer())).fov<normalFov,'ADS narrows the camera FOV');await floorPage.mouse.up({button:'right'});assert.equal((await floorPage.evaluate(()=>window.modelViewer())).shooter.aiming,false);await floorPage.mouse.move(720,700);await floorPage.mouse.click(720,700);await floorPage.waitForFunction(()=>window.modelViewer().shooter.effects.splats>0,{timeout:4000});assert((await floorPage.evaluate(()=>window.modelViewer())).shooter.effects.splats>0,'macaroni projectile must collide and create a cheese splat');await floorPage.screenshot({path:new URL('floorplan-cheesy.png',out).pathname});await floorPage.keyboard.press('Escape');await floorPage.waitForFunction(()=>!window.modelViewer().walk);const exited=await floorPage.evaluate(()=>window.modelViewer());assert.equal(exited.shooter.enabled,false);assert.deepEqual(exited.shooter.effects,{projectiles:0,splats:0});assert.equal(exited.fov,normalFov,'Escape restores normal FOV');
}else assert.equal(walkState.walk,false,'pointer-lock denial exits without stuck controls');
report.consoleErrors.push(...errors);await floor.close();

const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mobilePage=await mobile.newPage();errors=await ready(mobilePage,'/roll-em-up-la-vista-floorplan-v001/');assert(await mobilePage.getByRole('button',{name:/Home/}).isVisible());assert(await mobilePage.getByRole('button',{name:/Measure/}).isVisible());assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'mobile toolbar must not overflow the viewport');
const mobileCanvas=await mobilePage.locator('#canvas').boundingBox(),cdp=await mobile.newCDPSession(mobilePage),mobileBefore=await mobilePage.evaluate(()=>window.modelViewer());assert(mobileCanvas);const cx=mobileCanvas.x+mobileCanvas.width/2,cy=mobileCanvas.y+mobileCanvas.height/2;
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+45,y:cy+18,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobilePage.waitForTimeout(120);const touchOrbited=await mobilePage.evaluate(()=>window.modelViewer());assert.notDeepEqual(touchOrbited.position,mobileBefore.position,'one-finger touch orbit remains active');
const distance=state=>Math.hypot(...state.position.map((value,index)=>value-state.target[index])),pinchBefore=distance(touchOrbited);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-35,y:cy,id:1},{x:cx+35,y:cy,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-75,y:cy,id:1},{x:cx+75,y:cy,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobilePage.waitForTimeout(120);assert.notEqual(distance(await mobilePage.evaluate(()=>window.modelViewer())),pinchBefore,'two-finger pinch zoom remains active');
await mobilePage.getByRole('button',{name:/Measure/}).tap();assert.equal((await mobilePage.evaluate(()=>window.modelViewer())).measure.active,true);await mobilePage.getByRole('button',{name:/Measure/}).tap();await mobilePage.screenshot({path:new URL('floorplan-mobile.png',out).pathname,fullPage:true});report.consoleErrors.push(...errors);await mobile.close();

report.consoleErrors=report.consoleErrors.filter(message=>!message.includes('Access to font at')&&message!=='Failed to load resource: net::ERR_FAILED'&&!message.includes('Failed to decode downloaded font'));
assert.deepEqual(report.consoleErrors,[],'viewer must have no console/runtime errors');await fs.writeFile(new URL('report.json',out),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify(report,null,2));
