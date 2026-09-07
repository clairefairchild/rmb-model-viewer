import {chromium,devices} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.argv[2]||'https://models.ronismacbar.com/ronis-renovation-001/';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const output=new URL('../evidence/',import.meta.url);await fs.mkdir(output,{recursive:true});
const report={url,time:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?{...devices['iPhone 13'],defaultBrowserType:undefined}:{viewport:{width:1440,height:960}});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text()+' '+JSON.stringify(m.location()));});
  const response=await page.goto(url);assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.modelViewer?.().ready,{},{timeout:30000});await page.waitForFunction(()=>window.modelViewer().frames>15);
  const snapshot=()=>page.evaluate(()=>window.modelViewer());
  const before=await snapshot();assert(before.meshes>0);report.meshes=before.meshes;
  const box=await page.locator('#canvas').boundingBox();
  await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.53,{steps:12});await page.mouse.up();
  await page.waitForTimeout(300);assert.notDeepEqual((await snapshot()).position,before.position);report.checks.push(`${mobile?'mobile':'desktop'} orbit drag changes camera`);
  await page.locator('#pan-mode').click();const prePan=await snapshot();await page.mouse.move(box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.width*.45,box.y+box.height*.5,{steps:8});await page.mouse.up();await page.waitForTimeout(250);assert.notDeepEqual((await snapshot()).target,prePan.target);report.checks.push('pan changes target');
  const preZoom=await snapshot();await page.locator('#zoom-in').click();assert.notDeepEqual((await snapshot()).position,preZoom.position);await page.locator('#zoom-out').click();report.checks.push('zoom controls operate');
  await page.locator('#bird').click();assert.equal((await snapshot()).mode,'bird');await page.waitForTimeout(200);await page.screenshot({path:new URL(mobile?'mobile-bird.png':'desktop-bird.png',output).pathname});
  await page.locator('#home').click();await page.waitForTimeout(300);assert.equal((await snapshot()).mode,'home');
  await page.screenshot({path:new URL(mobile?'mobile-home.png':'desktop-home.png',output).pathname});report.screenshots.push(mobile?'mobile-home.png':'desktop-home.png');
  await page.locator('#walk').click();assert.equal((await snapshot()).walk,true);const preWalk=await snapshot();
  if(mobile){const pad=await page.locator('[data-move=forward]').boundingBox();await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();}
  else{await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');}
  assert.notDeepEqual((await snapshot()).position,preWalk.position);
  await page.mouse.move(box.width*.5,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.width*.6,box.y+box.height*.4,{steps:8});await page.mouse.up();assert.notDeepEqual((await snapshot()).rotation,preWalk.rotation);
  await page.screenshot({path:new URL(mobile?'mobile-walk.png':'desktop-walk.png',output).pathname});report.checks.push(`${mobile?'mobile pad':'desktop WASD'} walkthrough movement and look operate`);
  await page.locator('#home').click();assert.equal((await snapshot()).walk,false);
  if(!mobile){await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.locator('#fullscreen').click();report.checks.push('fullscreen enters and exits');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const id of ['home','bird','walk','fullscreen'])assert(await page.locator('#'+id).isVisible());
  report.checks.push(`${mobile?'mobile':'desktop'} layout fits viewport`);
  await context.close();
 }
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));report.passed=true;
}finally{await fs.writeFile(new URL('live-verification.json',output),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));}
