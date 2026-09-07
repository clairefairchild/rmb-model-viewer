import {chromium,devices} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='https://models.ronismacbar.com/';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[];
try{
 const desktop=await browser.newContext({viewport:{width:1440,height:960}});const page=await desktop.newPage();
 assert.equal((await page.goto(base)).status(),200);await page.locator('.card').waitFor();assert.equal(await page.locator('.card').count(),1);await page.waitForFunction(()=>[...document.querySelectorAll('.card img')].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:new URL('../evidence/library.png',import.meta.url).pathname,fullPage:true});checks.push('Live library renders first project');
 await page.goto(base+'not-a-real-project/');await page.locator('#error').waitFor();assert.match(await page.locator('#error-message').textContent(),/not in the catalog/);checks.push('Unknown project gives useful recovery link');
 await page.route('**/*.glb',async route=>{await new Promise(r=>setTimeout(r,750));await route.abort('failed');});
 await page.goto(base+'ronis-renovation-001/');await page.locator('#loading').waitFor();await page.locator('#error').waitFor();assert.match(await page.locator('#error-message').textContent(),/could not be downloaded/);checks.push('Loading status and failed model download recovery work');await desktop.close();
 const mobile=await browser.newContext(devices['iPhone 13']);const touch=await mobile.newPage();await touch.goto(base+'ronis-renovation-001/');await touch.waitForFunction(()=>window.modelViewer?.().ready);const cdp=await mobile.newCDPSession(touch);
 const state=()=>touch.evaluate(()=>window.modelViewer());
 const gesture=async(points,next)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map((p,j)=>({...p,x:p.x+(next[j].x-p.x)*i/10,y:p.y+(next[j].y-p.y)*i/10}))});}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForTimeout(200);};
 let before=await state();await gesture([{x:150,y:370,id:1}],[{x:200,y:400}]);assert.notDeepEqual((await state()).position,before.position);checks.push('Real one-finger touch orbits');
 before=await state();await gesture([{x:130,y:360,id:1},{x:230,y:360,id:2}],[{x:150,y:390},{x:250,y:390}]);assert.notDeepEqual((await state()).target,before.target);checks.push('Real two-finger touch pans');
 before=await state();const distance=s=>Math.hypot(...s.position.map((n,i)=>n-s.target[i]));await gesture([{x:140,y:370,id:1},{x:220,y:370,id:2}],[{x:110,y:370},{x:250,y:370}]);assert(Math.abs(distance(await state())-distance(before))>.01);checks.push('Real pinch gesture zooms');
 await mobile.close();console.log(JSON.stringify({passed:true,checks},null,2));await fs.writeFile(new URL('../evidence/resilience-verification.json',import.meta.url),JSON.stringify({passed:true,checks},null,2));
}finally{await browser.close();}
