import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const origin=(process.env.VIEWER_ORIGIN||'http://127.0.0.1:4177').replace(/\/$/,'');
const output=path.resolve(process.env.EVIDENCE_DIR||'evidence/measure-square-markers');
const targets=[
 {name:'la-vista',path:'/roll-em-up-la-vista-floorplan-v001/',pageType:'project'},
 {name:'equipment-vollrath',path:'/equipment/vollrath-38002/',pageType:'equipment'},
];
await fs.mkdir(output,{recursive:true});

const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={origin,targets,checks:[],candidateKinds:[],screenshots:[],consoleErrors:[]};

async function load(context,urlPath){
 const page=await context.newPage(),errors=[];
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto(origin+urlPath,{waitUntil:'domcontentloaded',timeout:180000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.modelViewer?.().ready,{timeout:180000});
 await page.waitForFunction(()=>window.modelViewer().frames>8,{timeout:180000});
 const box=await page.locator('#canvas').boundingBox();assert(box,'viewer canvas must have a measurable viewport');
 return{page,errors,box};
}

function candidatePoints(box,{reverse=false}={}){
 const preferred=reverse?[[.56,.72],[.44,.68],[.6,.58],[.4,.55],[.5,.38]]:[[.5,.48],[.5,.38],[.44,.55],[.58,.58],[.5,.68]],points=preferred.map(([x,y])=>({x:box.x+box.width*x,y:box.y+box.height*y}));
 for(let y=.28;y<=.76;y+=.12)for(let x=.32;x<=.72;x+=.1)points.push({x:box.x+box.width*x,y:box.y+box.height*y});
 return points;
}

async function snapAt(page,box,{reverse=false,farFrom=null,minimumDistance=90}={}){
 for(const point of candidatePoints(box,{reverse})){
  if(farFrom&&Math.hypot(point.x-farFrom.x,point.y-farFrom.y)<minimumDistance)continue;
  await page.mouse.move(point.x,point.y);
  const state=await page.evaluate(()=>window.modelViewer());
  if(state.measure.hover)return{...point,kind:state.measure.hoverKind,state};
 }
 throw new Error('No visible measurement snap candidate was found within the finite desktop grid');
}

async function shot(page,name){await page.screenshot({path:path.join(output,name),fullPage:true,timeout:120000});report.screenshots.push(name);}
const toggleMeasure=page=>page.evaluate(()=>document.getElementById('measure').click());
const snapshot=page=>page.evaluate(()=>window.modelViewer());

async function desktopLifecycle(target){
 console.log(`BEGIN desktop ${target.name}`);
 const context=await browser.newContext({viewport:{width:1440,height:900}}),loaded=await load(context,target.path),{page,box}=loaded;report.consoleErrors.push(...loaded.errors);
 let state=await snapshot(page);assert.equal(state.measure.active,false);assert.equal(state.measure.visuals.hoverVisible,false,'hover marker is absent outside Measure mode');
 await toggleMeasure(page);const a=await snapAt(page,box);state=await snapshot(page);assert.equal(state.measure.visuals.hoverVisible,true);assert.equal(state.measure.markers.hover.kind,a.kind);assert.equal(state.measure.visuals.draftVisible,false);assert(['copy','cell','crosshair'].includes(await page.locator('#canvas').evaluate(element=>getComputedStyle(element).cursor)));await shot(page,`desktop-${target.name}-01-hover-pre-click.png`);
 await page.mouse.click(a.x,a.y);state=await snapshot(page);assert.equal(state.measure.draft,true);assert.equal(state.measure.visuals.draftVisible,true);assert.equal(state.measure.markers.draft.kind,a.kind);
 const b=await snapAt(page,box,{reverse:true,farFrom:a});state=await snapshot(page);assert.equal(state.measure.visuals.hoverVisible,true);assert.equal(state.measure.visuals.draftVisible,true);assert.equal(await page.locator('#measure-live-label').isVisible(),true);assert.match(await page.locator('#measure-live-label').textContent(),/ in$/);await shot(page,`desktop-${target.name}-02-locked-a-live-b.png`);
 await page.mouse.click(b.x,b.y);state=await snapshot(page);assert.equal(state.measure.completed,1);assert.equal(state.measure.visuals.draftVisible,false);assert.equal(state.measure.visuals.savedVisible,2);assert.deepEqual(state.measure.markers.saved.map(marker=>marker.kind),[a.kind,b.kind]);assert.equal(await page.locator('.measurement-saved').count(),1);await shot(page,`desktop-${target.name}-03-completed-endpoints.png`);
 await toggleMeasure(page);state=await snapshot(page);assert.equal(state.measure.active,false);assert.equal(state.measure.visuals.hoverVisible,false);assert.equal(state.measure.visuals.savedVisible,2,'completed endpoint squares persist outside Measure mode');
 await toggleMeasure(page);await page.evaluate(()=>document.querySelector('.measurement-saved').click());await page.keyboard.press('Delete');state=await snapshot(page);assert.equal(state.measure.completed,0);assert.equal(state.measure.visuals.savedVisible,0);assert.equal(await page.locator('.measurement-saved').count(),0);await shot(page,`desktop-${target.name}-04-deleted.png`);
 await toggleMeasure(page);await page.mouse.move(a.x,a.y);assert.equal((await snapshot(page)).measure.visuals.hoverVisible,false,'pointer motion outside Measure mode cannot recreate the snap marker');
 report.candidateKinds.push(a.kind,b.kind);report.checks.push(`desktop ${target.pageType}: hover/pre-click, locked A + live B/inches, completed endpoint persistence, and unified Delete cleanup`);await context.close();console.log(`PASS desktop ${target.name}`);
}

async function mobileLifecycle(target){
 console.log(`BEGIN mobile ${target.name}`);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),loaded=await load(context,target.path),{page,box}=loaded;report.consoleErrors.push(...loaded.errors);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,'mobile page must not overflow horizontally');await toggleMeasure(page);
 const a=await snapAt(page,box);let state=await snapshot(page);assert.equal(state.measure.visuals.hoverVisible,true);assert.equal(state.measure.visuals.draftVisible,false);await shot(page,`mobile-${target.name}-01-hover-pre-click.png`);await page.mouse.click(a.x,a.y);state=await snapshot(page);assert.equal(state.measure.draft,true);assert.equal(state.measure.visuals.draftVisible,true);
 const b=await snapAt(page,box,{reverse:true,farFrom:a,minimumDistance:35});state=await snapshot(page);assert.equal(state.measure.visuals.hoverVisible,true);assert.equal(state.measure.visuals.draftVisible,true);assert.equal(await page.locator('#measure-live-label').isVisible(),true);assert.match(await page.locator('#measure-live-label').textContent(),/ in$/);await shot(page,`mobile-${target.name}-02-locked-a-live-b.png`);await page.mouse.click(b.x,b.y);
 state=await snapshot(page);assert.equal(state.measure.completed,1);assert.equal(state.measure.visuals.draftVisible,false);assert.equal(state.measure.visuals.savedVisible,2);assert.deepEqual(state.measure.markers.saved.map(marker=>marker.kind),[a.kind,b.kind]);await shot(page,`mobile-${target.name}-03-completed-endpoints.png`);
 await toggleMeasure(page);state=await snapshot(page);assert.equal(state.measure.visuals.savedVisible,2,'mobile completed endpoints persist outside Measure mode');await toggleMeasure(page);await page.evaluate(()=>document.querySelector('.measurement-saved').click());await page.keyboard.press('Delete');state=await snapshot(page);assert.equal(state.measure.completed,0);assert.equal(state.measure.visuals.savedVisible,0);assert.equal(await page.locator('.measurement-saved').count(),0);await shot(page,`mobile-${target.name}-04-deleted.png`);
 report.candidateKinds.push(a.kind,b.kind);report.checks.push(`mobile-emulated ${target.pageType}: hover/pre-click, locked A + live B/inches, completed endpoint persistence, and unified Delete cleanup`);await context.close();console.log(`PASS mobile ${target.name}`);
}

try{
 for(const target of targets)await desktopLifecycle(target);
 for(const target of targets)await mobileLifecycle(target);
 report.candidateKinds=[...new Set(report.candidateKinds)];
 report.consoleErrors=report.consoleErrors.filter(message=>!message.includes('Access to font at')&&message!=='Failed to load resource: net::ERR_FAILED'&&!message.includes('Failed to decode downloaded font'));
 assert.deepEqual(report.consoleErrors,[],'measure-marker verification must have zero console/runtime errors');
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
