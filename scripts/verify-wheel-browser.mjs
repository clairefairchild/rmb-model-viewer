import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,devices} from '@playwright/test';

const origin=process.argv[2]||'http://127.0.0.1:4173';
const output=process.env.WHEEL_EVIDENCE||'evidence/wheel-zoom';
const eventsPerCorner=Number(process.env.WHEEL_EVENTS_PER_CORNER||25);
assert(Number.isInteger(eventsPerCorner)&&eventsPerCorner>0);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={origin,checks:[],errors:[],screenshots:[]};
const distance=state=>Math.hypot(...state.position.map((value,index)=>value-state.target[index]));
const close=(a,b,epsilon=1e-7)=>a.length===b.length&&a.every((value,index)=>Math.abs(value-b[index])<=epsilon);
const wheel=async(page,x,y,deltaY,deltaMode=0)=>page.evaluate(({x,y,deltaY,deltaMode})=>document.getElementById('canvas').dispatchEvent(new WheelEvent('wheel',{clientX:x,clientY:y,deltaY,deltaMode,bubbles:true,cancelable:true})),{x,y,deltaY,deltaMode});
const resetHome=page=>page.evaluate(()=>document.getElementById('home').click());
const clickControl=(page,id)=>page.evaluate(id=>document.getElementById(id).click(),id);
async function ready(context,path){const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);await page.waitForFunction(()=>window.modelViewer?.().ready,{timeout:180000});return page;}
try{
 const desktop=await browser.newContext({viewport:{width:1440,height:960}}),page=await ready(desktop,'/roll-em-up-la-vista-floorplan-v001/');
 const state=()=>page.evaluate(()=>window.modelViewer());await resetHome(page);await page.waitForTimeout(250);const home=await state(),box=await page.locator('#canvas').boundingBox();report.before=home;await page.screenshot({path:`${output}/before-home.png`});report.screenshots.push(`${output}/before-home.png`);
 const corners=[[box.x+3,box.y+3],[box.x+box.width-3,box.y+3],[box.x+3,box.y+box.height-3],[box.x+box.width-3,box.y+box.height-3]];
 for(let corner=0;corner<corners.length;corner++){
  await resetHome(page);const initial=await state();await wheel(page,...corners[corner],0,0);assert.equal((await state()).lastZoom.kind,'target',`corner ${corner} must be empty canvas`);
  for(let i=0;i<eventsPerCorner;i++)await wheel(page,...corners[corner],i%2?-(i%7?120:100000):(i%5?120:100000),i%3);
  const after=await state();assert(close(after.target,initial.target,1e-6),`corner ${corner} cannot move target`);assert(after.position.concat(after.target).every(Number.isFinite));assert(distance(after)>=after.lastZoom.distanceAfter-1e-6&&distance(after)<=after.lastZoom.distanceAfter+1e-6);assert(distance(after)>=after.zoomLimits.minDistance-1e-8&&distance(after)<=after.zoomLimits.maxDistance+1e-8);assert(after.target.every((value,index)=>value>=after.lastZoom.envelope.min[index]-1e-8&&value<=after.lastZoom.envelope.max[index]+1e-8));
 }
 report.checks.push(`all four empty corners survive ${eventsPerCorner*4} total mixed pixel/line/page wheel events; target stays fixed and state finite/bounded`);
 await resetHome(page);let hitPoint=null;for(const fy of [.35,.45,.55,.65]){for(const fx of [.3,.4,.5,.6,.7]){await wheel(page,box.x+box.width*fx,box.y+box.height*fy,0,0);if((await state()).lastZoom.kind==='model'){hitPoint=[box.x+box.width*fx,box.y+box.height*fy];break;}}if(hitPoint)break;}assert(hitPoint,'a real model-hit screen point is required');const hitBefore=await state();await wheel(page,...hitPoint,-120,0);const hitAfter=await state();assert.equal(hitAfter.lastZoom.kind,'model');assert(hitAfter.lastZoom.factor<1);assert(!close(hitAfter.target,hitBefore.target,1e-7));report.modelHit={point:hitPoint,before:hitBefore,after:hitAfter};report.checks.push('real geometry hit zooms toward cursor focus without nonfinite drift');
 await resetHome(page);const recovered=await state();assert(close(recovered.position,home.position,1e-5)&&close(recovered.target,home.target,1e-5));report.checks.push('Home fully restores camera and target');
 const beforeButton=await state();await clickControl(page,'zoom-in');assert(distance(await state())<distance(beforeButton));await clickControl(page,'zoom-out');report.checks.push('zoom buttons remain operational');
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.55,{steps:8});await page.mouse.up();assert(!close((await state()).position,recovered.position));await clickControl(page,'pan-mode');const panBefore=await state();await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.47,box.y+box.height*.5,{steps:8});await page.mouse.up();assert(!close((await state()).target,panBefore.target));report.checks.push('orbit and pan remain operational');
 await clickControl(page,'measure');assert((await state()).measure.active);await clickControl(page,'measure');await page.keyboard.press('w');await page.waitForFunction(()=>window.modelViewer().walk);await page.keyboard.press('r');await page.waitForTimeout(200);assert((await state()).shooter.enabled);await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.modelViewer().walk);report.checks.push('measurement and walkthrough/Cheesy Experience enter and exit cleanly');
 await resetHome(page);await page.screenshot({path:`${output}/after-stress-home.png`});report.screenshots.push(`${output}/after-stress-home.png`);report.after=await state();await desktop.close();
 const mobile=await browser.newContext({...devices['iPhone 13']}),touch=await ready(mobile,'/equipment/vollrath-38002/'),touchState=()=>touch.evaluate(()=>window.modelViewer()),cdp=await mobile.newCDPSession(touch);const touchBefore=await touchState();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:370,id:1},{x:220,y:370,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:90,y:370,id:1},{x:250,y:370,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForTimeout(250);assert(Math.abs(distance(await touchState())-distance(touchBefore))>.01);assert.equal(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await touch.screenshot({path:`${output}/mobile-touch.png`});report.screenshots.push(`${output}/mobile-touch.png`);report.checks.push('mobile responsive equipment page loads and real two-finger pinch remains operational');await mobile.close();
 if(origin.startsWith('http://127.0.0.1:')){report.expectedLocalFontErrors=report.errors.filter(message=>message.includes('ronis.rmbsuite.com/api/fonts/')||message==='Failed to load resource: net::ERR_FAILED');report.errors=report.errors.filter(message=>!report.expectedLocalFontErrors.includes(message));}
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
