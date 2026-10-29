'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8038/');await page.waitForFunction(()=>window.FoundryRendererInfo&&!document.getElementById('loading'),null,{timeout:60000});
 const snapshot=await page.evaluate(()=>{OrbitFoundry.pause();OrbitFoundry.focusShowcase(true);return OrbitFoundry.payload();});
 assert.equal(await page.locator('[data-planet-id]').count(),1);assert.equal(await page.locator('#preset').inputValue(),'asteroid');assert.equal(await page.locator('#launchFrame').inputValue(),'relative');
 const cases=[];
 for(const tilt of [0,.45,1.04,Math.PI/2,2.2,Math.PI-.025]){
  await page.evaluate(({snapshot,tilt})=>{const p=structuredClone(snapshot);p.camera.tilt=tilt;p.bodies.find(b=>b.planet==='earth').z=.0004;OrbitFoundry.restore(p);document.getElementById('spawnZ').value='0';}, {snapshot,tilt});
  await page.keyboard.press('2');
  // Off-center vertical click is where the old world-XY intersection failed.
  const point=await page.evaluate(()=>{const a=OrbitFoundry,w=a.creationPoint(1120,400);return {w,screen:a.project(w.x,w.y,w.z),earth:a.bodies.find(b=>b.planet==='earth'),count:a.bodies.length};});
  assert(Math.hypot(point.screen.x-1120,point.screen.y-400)<1e-5);assert(Object.values(point.w).every(Number.isFinite));
  await page.mouse.click(1120,400);
  const result=await page.evaluate(()=>{const a=OrbitFoundry,b=a.bodies.find(b=>b.id===a.selected),earth=a.bodies.find(b=>b.planet==='earth'),p=a.project(b.x,b.y,b.z);return {count:a.bodies.length,b,earth,p,follow:a.following};});
  assert.equal(result.count,10);for(const k of ['x','y','z'])assert(Math.abs(result.b[k]-point.w[k])<1e-14);
  assert(Math.hypot(result.p.x-1120,result.p.y-400)<1e-5);assert.equal(result.follow,result.earth.id);
  const dx=result.b.x-result.earth.x,dy=result.b.y-result.earth.y,dz=result.b.z-result.earth.z,vx=result.b.vx-result.earth.vx,vy=result.b.vy-result.earth.vy,vz=result.b.vz-result.earth.vz;
  assert(Math.abs(dx*vx+dy*vy+dz*vz)<1e-12,'circular velocity must be tangential');assert(Math.hypot(vx,vy,vz)>0);
  cases.push({tilt,count:result.count,reprojectionError:Math.hypot(result.p.x-1120,result.p.y-400)});
 }
 // A real 3D launch drag, with its start point and velocity tested against the preview.
 await page.evaluate(snapshot=>{OrbitFoundry.restore(snapshot);document.getElementById('spawnZ').value='.00001';},snapshot);await page.keyboard.press('3');
 await page.mouse.move(1140,420);await page.mouse.down();await page.mouse.move(1080,500,{steps:4});
 const aim=await page.evaluate(()=>{const a=OrbitFoundry,w=a.pointer.world,v=a.launchVelocity(w,{x:1080,y:500});a.previewLaunch();return {w,v,total:a.initialLaunchVelocity(v),path:a.launchPath,paused:a.paused};});
 assert(aim.paused);assert(aim.path.length>0);for(const k of ['x','y','z'])assert.equal(aim.path[0][k],aim.w[k]);assert(Math.abs(aim.v.vz)>1e-6);
 await page.mouse.up();
 const launched=await page.evaluate(()=>{const a=OrbitFoundry,b=a.bodies.find(b=>b.id===a.selected);return {b,count:a.bodies.length,cam:a.getView().cam,earth:a.bodies.find(b=>b.planet==='earth')};});
 assert.equal(launched.count,10);for(const k of ['x','y','z'])assert(Math.abs(launched.b[k]-aim.w[k])<1e-14);for(const k of ['vx','vy','vz'])assert(Math.abs(launched.b[k]-aim.total[k])<1e-10);
 // Creation must not accept physical overlaps or non-finite positions.
 const rejected=await page.evaluate(()=>{const a=OrbitFoundry,n=a.bodies.length,e=a.bodies.find(b=>b.planet==='earth');a.spawn({x:e.x,y:e.y,z:e.z});a.spawn({x:NaN,y:0,z:0});return {before:n,after:a.bodies.length};});assert.equal(rejected.before,rejected.after);
 await page.waitForFunction(()=>document.querySelectorAll('#planetNavigator [data-planet-id]').length===1);assert.equal(await page.evaluate(()=>OrbitFoundry.bodies.filter(b=>b.planet).length),9);
 await page.evaluate(()=>{document.getElementById('spawnZ').value='0';OrbitFoundry.select(OrbitFoundry.cameraAnchorId);});await page.locator('[data-left="create"]').click();await page.mouse.move(1120,400);await page.screenshot({path:process.env.SHOT_PATH||'/data/earth-spawn.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({cases,launch3D:true,previewMatches:true,onlyEarthListed:true,allPlanetsSimulated:true,overlapRejected:true,errors}));console.log('spawn-smoke: OK');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
