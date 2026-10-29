'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=async()=>{await page.waitForFunction(()=>window.FoundryRendererInfo&&!document.getElementById('loading'),null,{timeout:60000});await page.evaluate(()=>OrbitFoundry.pause());};
  const state=()=>page.evaluate(()=>({view:OrbitFoundry.getView(),earth:OrbitFoundry.bodies.find(b=>b.planet==='earth'),following:OrbitFoundry.following,anchor:OrbitFoundry.cameraAnchorId,selected:OrbitFoundry.selected}));
  const locked=async()=>{const s=await state();assert.equal(s.following,s.earth.id);assert.equal(s.anchor,s.earth.id);for(const k of ['x','y','z'])assert.equal(s.view.cam[k],s.earth[k]);return s;};
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:8038/');await ready();
  assert.equal(await page.evaluate(()=>OrbitFoundry.bodies.length),9);await locked();
  // Selecting a non-Earth planet must not change the view, including its scale.
  const initial=await state();await page.locator('[data-planet-id="5"]').click();await page.waitForTimeout(250);
  let s=await locked();assert.equal(s.selected,5);assert.equal(s.view.scale,initial.view.scale);assert.equal(s.view.yaw,initial.view.yaw);
  for(const key of ['r','c','f','t','Home']){await page.keyboard.press(key);await page.waitForTimeout(150);await locked();}
  await page.evaluate(()=>{OrbitFoundry.focusShowcase(true);OrbitFoundry.zoomBy(.5);});await page.waitForTimeout(500);
  const combinations=[];
  for(const key of ['w','a','s','d','q','e']){
   await page.mouse.move(800,450);await page.mouse.down({button:'right'});const before=await state();
   await page.keyboard.down(key);await page.waitForFunction(({key,v})=>{const n=OrbitFoundry.getView();return key==='w'||key==='s'?Math.abs(n.scale-v.scale)>1:key==='a'||key==='d'?Math.abs(n.yaw-v.yaw)>.01:Math.abs(n.tilt-v.tilt)>.01;},{key,v:before.view},{timeout:10000});await page.keyboard.up(key);
   await page.mouse.move(820,458,{steps:3});await page.mouse.up({button:'right'});s=await locked();
   assert.notEqual(s.view.yaw,before.view.yaw);
   if(key==='w'||key==='s')assert.notEqual(s.view.scale,before.view.scale);
   if(key==='q'||key==='e')assert.notEqual(s.view.tilt,before.view.tilt);
   combinations.push(key);
  }
  // Left and middle drags may rotate, never pan away.
  for(const button of ['left','middle']){await page.mouse.move(800,450);await page.mouse.down({button});await page.mouse.move(840,470,{steps:4});await page.mouse.up({button});await locked();}
  const deltas=[];
  for(const value of [.5,1,2]){
   await page.evaluate(v=>{const el=document.getElementById('lookSensitivity');el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));OrbitFoundry.focusShowcase(true);},value);
   await page.mouse.move(800,450);const before=await state();await page.mouse.down({button:'right'});await page.mouse.move(840,450,{steps:4});await page.mouse.up({button:'right'});s=await locked();deltas.push(s.view.yaw-before.view.yaw);
  }
  assert(Math.abs(deltas[1]/deltas[0]-2)<1e-8);assert(Math.abs(deltas[2]/deltas[1]-2)<1e-8);
  await page.reload();await ready();assert.equal(await page.locator('#lookSensitivity').inputValue(),'2');await locked();
  // Imported follow and camera targets are untrusted, and Earth IDs/names are editable.
  await page.evaluate(()=>{const a=OrbitFoundry,p=a.payload(),e=p.bodies.find(b=>b.planet==='earth');e.id=104;e.name='Renamed Earth';p.selected=5;p.follow=5;p.camera.x=100; a.restore(p);});
  await page.waitForTimeout(250);s=await locked();assert.equal(s.anchor,104);assert.equal(s.selected,5);
  const before=await state();await page.evaluate(()=>{OrbitFoundry.simulate(.00001);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});s=await locked();assert.notEqual(s.earth.y,before.earth.y);
  // No Earth in an imported world means no fallback to another planet.
  await page.evaluate(()=>{const a=OrbitFoundry,p=a.payload();p.bodies=p.bodies.filter(b=>b.planet!=='earth');a.restore(p);});await page.waitForTimeout(250);
  const missing=await state();assert.equal(missing.anchor,null);assert.equal(missing.following,null);
  await page.keyboard.press('r');await page.keyboard.press('f');await page.waitForTimeout(150);
  assert.deepEqual((await state()).view.cam,missing.view.cam);
  await page.waitForFunction(()=>document.getElementById('navMode').textContent.includes('Земля отсутствует'));
  await page.evaluate(()=>OrbitFoundry.loadScene('solar'));await page.evaluate(()=>{OrbitFoundry.pause();OrbitFoundry.focusShowcase(true);});await locked();
  await page.locator('[data-left="display"]').click();await page.locator('#resetLookSensitivity').click();
  await page.screenshot({path:process.env.SHOT_PATH||'/data/earth-camera.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({combinations,deltas,earthLock:true,selectionIndependent:true,importOverride:true,missingEarth:true,errors}));console.log('navigation-smoke: OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
