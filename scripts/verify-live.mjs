import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const projectUrl=process.argv[2]||'https://models.ronismacbar.com/ronis-renovation-001/';
const libraryUrl=new URL('../',projectUrl).href;
const localRun=['127.0.0.1','localhost'].includes(new URL(projectUrl).hostname);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const output=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])+path.sep):new URL('../evidence/',import.meta.url);await fs.mkdir(output,{recursive:true});
const report={libraryUrl,projectUrl,time:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:960}});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{const fontCors=localRun&&(/api\/fonts\/|blocked by CORS policy/.test(m.text())||/api\/fonts\//.test(m.location().url||''));if(m.type()==='error'&&!fontCors)report.errors.push(m.text()+' '+JSON.stringify(m.location()));});
  let response=await page.goto(libraryUrl);assert.equal(response.status(),200);
  await page.locator('.card').first().waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.card img,.brand-mark')].every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
  const libraryBrand=await page.evaluate(()=>{const root=getComputedStyle(document.documentElement),header=getComputedStyle(document.querySelector('.suite-header')),nav=getComputedStyle(document.querySelector('.suite-nav-link.active'));return{primary:root.getPropertyValue('--brand-primary').trim(),secondary:root.getPropertyValue('--brand-secondary').trim(),accent:root.getPropertyValue('--brand-accent').trim(),font:root.fontFamily,fontLoaded:document.fonts.check('16px "RMB Cheddar"'),header:header.backgroundColor,rule:header.borderBottomColor,active:nav.backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth};});
  report[mobile?'mobileBrand':'desktopBrand']=libraryBrand;
  assert.match(libraryBrand.primary,/^#(?:fff|ffffff)$/);assert.match(libraryBrand.secondary,/^#(?:000|000000)$/);assert.equal(libraryBrand.accent,'#fdb431');assert.match(libraryBrand.font,/RMB Cheddar/);if(!localRun)assert.equal(libraryBrand.fontLoaded,true);assert.equal(libraryBrand.header,'rgb(26, 26, 26)');assert.match(libraryBrand.rule,/^rgba?\(253, 180, 49(?:, (?:1|0\.996))?\)$/);assert.match(libraryBrand.active,/^rgba?\(253, 180, 49(?:, (?:1|0\.996))?\)$/);assert.equal(libraryBrand.overflow,false);
  const libraryShot=mobile?'mobile-library.png':'desktop-library.png';await page.screenshot({path:new URL(libraryShot,output).pathname,fullPage:true});report.screenshots.push(libraryShot);report.checks.push(`${mobile?'mobile':'desktop'} library loads with authoritative RMB Suite branding`);
  response=await page.goto(projectUrl);assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.modelViewer?.().ready,{},{timeout:30000});await page.waitForFunction(()=>window.modelViewer().frames>15);
  const snapshot=()=>page.evaluate(()=>window.modelViewer());
  const before=await snapshot();assert(before.meshes>0);report.meshes=before.meshes;const equipment=before.pageType==='equipment-detail';
  if(equipment){
   const slug=new URL(projectUrl).pathname.split('/').filter(Boolean).at(-1);const catalog=await page.evaluate(async()=>{const response=await fetch('/equipment.json',{cache:'no-store'});if(!response.ok)throw new Error(`Equipment catalog returned ${response.status}`);return response.json();});const item=catalog.equipment.find(entry=>entry.slug===slug);assert(item,`Missing equipment catalog entry for ${slug}`);
   const expectedDimensions=item.dimensionLabel||`${item.envelope.width} × ${item.envelope.depth} × ${item.envelope.height} ${item.envelope.unit} (W × D × H)`;
   assert.equal(await page.locator('#equipment-title').textContent(),item.name);assert.equal(await page.locator('#equipment-model').textContent(),item.productName);assert.equal(await page.locator('#equipment-envelope').textContent(),expectedDimensions);assert.equal(await page.locator('#equipment-dimension-heading').textContent(),item.dimensionHeading||(item.dimensionLabel?'Certified dimensions':'Exact envelope'));assert.equal(await page.locator('#equipment-source').textContent(),item.sourceRow);assert.equal(await page.locator('#equipment-quantity').textContent(),String(item.quantity));assert.equal(await page.locator('#approval-status').textContent(),item.approvalStatus);assert.equal(await page.locator('#equipment-fidelity').textContent(),item.fidelityNote);
   assert.equal(await page.locator('#equipment-assembly-row').isVisible(),Boolean(item.assemblyHeightLabel));if(item.assemblyHeightLabel)assert.equal(await page.locator('#equipment-assembly-height').textContent(),item.assemblyHeightLabel);
   for(const id of ['bird','walk'])assert.equal(await page.locator('#'+id).isVisible(),false);for(const id of ['front','rear'])assert(await page.locator('#'+id).isVisible());report.checks.push('equipment review metadata and equipment-only controls are correct');
  }
  const box=await page.locator('#canvas').boundingBox();
  await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.53,{steps:12});await page.mouse.up();
  await page.waitForTimeout(300);assert.notDeepEqual((await snapshot()).position,before.position);report.checks.push(`${mobile?'mobile':'desktop'} orbit drag changes camera`);
  await page.locator('#pan-mode').click();const prePan=await snapshot();await page.mouse.move(box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.width*.45,box.y+box.height*.5,{steps:8});await page.mouse.up();await page.waitForTimeout(250);assert.notDeepEqual((await snapshot()).target,prePan.target);report.checks.push('pan changes target');
  const preZoom=await snapshot();await page.locator('#zoom-in').click();assert.notDeepEqual((await snapshot()).position,preZoom.position);await page.locator('#zoom-out').click();report.checks.push('zoom controls operate');
  if(equipment){
   await page.locator('#front').click();const frontView=await snapshot();assert.equal(frontView.mode,'front');assert(frontView.position[2]>frontView.target[2]);
   const frontShot=`equipment-${mobile?'mobile':'desktop'}-front.png`;await page.screenshot({path:new URL(frontShot,output).pathname});report.screenshots.push(frontShot);
   await page.locator('#rear').click();const rearView=await snapshot();assert.equal(rearView.mode,'rear');assert(rearView.position[2]<rearView.target[2]);
   const rearShot=`equipment-${mobile?'mobile':'desktop'}-rear.png`;await page.screenshot({path:new URL(rearShot,output).pathname});report.screenshots.push(rearShot);report.checks.push('equipment Front (+Z operator side) and Rear (-Z panel side) presets operate');
  }else{
   await page.locator('#bird').click();assert.equal((await snapshot()).mode,'bird');await page.waitForTimeout(200);await page.screenshot({path:new URL(mobile?'mobile-bird.png':'desktop-bird.png',output).pathname});
  }
  await page.locator('#home').click();await page.waitForTimeout(300);assert.equal((await snapshot()).mode,'home');
  const homeShot=(equipment?'equipment-':'')+(mobile?'mobile-home.png':'desktop-home.png');await page.screenshot({path:new URL(homeShot,output).pathname});report.screenshots.push(homeShot);
  if(!equipment){
   await page.locator('#walk').click();assert.equal((await snapshot()).walk,true);const preWalk=await snapshot();
   if(mobile){const pad=await page.locator('[data-move=forward]').boundingBox();await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();}
   else{await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');}
   assert.notDeepEqual((await snapshot()).position,preWalk.position);
   await page.mouse.move(box.width*.5,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.width*.6,box.y+box.height*.4,{steps:8});await page.mouse.up();assert.notDeepEqual((await snapshot()).rotation,preWalk.rotation);
   await page.screenshot({path:new URL(mobile?'mobile-walk.png':'desktop-walk.png',output).pathname});report.checks.push(`${mobile?'mobile pad':'desktop WASD'} walkthrough movement and look operate`);
   await page.locator('#home').click();assert.equal((await snapshot()).walk,false);
  }
  if(!mobile){await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.locator('#fullscreen').click();report.checks.push('fullscreen enters and exits');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const id of equipment?['home','front','rear','fullscreen']:['home','bird','walk','fullscreen'])assert(await page.locator('#'+id).isVisible());
  report.checks.push(`${mobile?'mobile':'desktop'} layout fits viewport`);
  await context.close();
 }
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));report.passed=true;
}finally{await fs.writeFile(new URL('live-verification.json',output),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));}
