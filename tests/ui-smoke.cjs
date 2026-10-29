'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 async function ready(w,h){await page.setViewportSize({width:w,height:h});await page.goto(process.env.BASE_URL||'http://127.0.0.1:8038/');await page.waitForFunction(()=>window.FoundryRendererInfo&&!document.getElementById('loading'),null,{timeout:90000});await page.evaluate(()=>{OrbitFoundry.pause();OrbitFoundry.focusShowcase(true);});}
 async function shot(name){await page.screenshot({path:'/data/earth-ui-'+name+'.png',animations:'disabled'});}
 const globalIds=['metricVel','metricDist','metricAcc','metricTemp','metricClock','metricEscape','metricOrbit','metricPeriod','impactLaunch','manualModeBtn','energyLabel','nBodies','simTime','rateLabel','cameraLabel','fps','simStatus','totalMass','totalMomentum','stepCount'];
 async function liveVisible(ids=globalIds){
  const result=await page.evaluate(ids=>ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();let clipped=false;for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){const st=getComputedStyle(a);if(['auto','scroll','hidden'].includes(st.overflowY)){const q=a.getBoundingClientRect();if(r.top<q.top||r.bottom>q.bottom)clipped=true;}}return {id,visible:!!e.getClientRects().length,clipped,inViewport:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};}),ids);
  for(const row of result)assert(row.visible&&!row.clipped&&row.inViewport,JSON.stringify(row));
 }
 for(const [w,h] of [[1600,1000],[1280,720]]){
  await ready(w,h);await liveVisible();await shot('default-'+w);
  const state=await page.evaluate(()=>({ids:[...document.querySelectorAll('[id]')].map(e=>e.id),count:OrbitFoundry.bodies.length,anchor:OrbitFoundry.cameraAnchorId}));assert.equal(state.count,9);assert.equal(state.ids.length,new Set(state.ids).size);
  await page.locator('#settingsBtn').click();assert(await page.locator('#settingsDialog').isVisible());
  for(const name of ['view','physics','system','object']){await page.locator('[data-settings-tab="'+name+'"]').click();assert(await page.locator('#settings-'+name).isVisible());await shot('settings-'+name+'-'+w);}
  const before=await page.evaluate(()=>OrbitFoundry.getView());await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');const after=await page.evaluate(()=>OrbitFoundry.getView());assert.deepEqual(after,before,'Settings must block simulation camera hotkeys');
  await page.keyboard.press('Escape');assert(!(await page.locator('#settingsDialog').isVisible()));
  await page.locator('#manualModeBtn').click();assert.equal(await page.locator('.left').getAttribute('data-mode'),'manual');assert(await page.locator('#tools').isVisible());await shot('manual-'+w);
  await page.locator('#impactModeBtn').click();assert.equal(await page.locator('.left').getAttribute('data-mode'),'impact');assert.equal(await page.evaluate(()=>OrbitFoundry.selected),state.anchor);
  await page.locator('#impactAdvanced summary').click();assert(await page.locator('#impactMass').isVisible());await shot('advanced-'+w);
  await page.locator('#impactAdvanced summary').click();await page.locator('#saveBtn').click();assert(await page.evaluate(()=>!!localStorage.getItem('earth-simulator-v1')));
  await page.locator('#helpBtn').click();assert(await page.locator('#help').isVisible());await shot('help-'+w);await page.keyboard.press('Escape');
 }
 // A real collision report must coexist with persistent diagnostics.
 await ready(1600,1000);const snapshot=await page.evaluate(()=>OrbitFoundry.payload());await page.evaluate(()=>{document.getElementById('impactOffset').value='0';document.getElementById('impactOffset').dispatchEvent(new Event('input'));OrbitFoundry.launchImpact();OrbitFoundry.pause();for(let i=0;i<3000&&!OrbitFoundry.lastImpact;i++)OrbitFoundry.simulate(2e-8);});await page.waitForFunction(()=>!document.getElementById('impactReport').hidden);await liveVisible(globalIds.filter(id=>id!=='impactLaunch'));await page.locator('#inspectImpact').waitFor({state:'visible'});await shot('impact');
 // Missing-Earth state remains explicit in telemetry and does not crash.
 await page.evaluate(p=>{p.bodies=p.bodies.filter(b=>b.planet!=='earth');OrbitFoundry.restore(p);},snapshot);await page.waitForFunction(()=>document.getElementById('cameraLabel').textContent.includes('отсутствует'));await shot('empty');
 await ready(390,844);assert(await page.locator('.desktop-only').isVisible());await shot('mobile');assert.deepEqual(errors,[]);console.log(JSON.stringify({globalTelemetryAlwaysVisible:true,settingsTabs:true,modalBlocksCamera:true,manualMode:true,save:true,help:true,impactReport:true,missingEarth:true,mobileNotice:true,errors}));console.log('ui-smoke: OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
