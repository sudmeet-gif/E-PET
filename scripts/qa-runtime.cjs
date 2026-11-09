const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.KITTEN_PLAYWRIGHT||'playwright-core');
const out=path.resolve(process.env.KITTEN_QA_OUTPUT||path.join(__dirname,'../../qa'));fs.mkdirSync(out,{recursive:true});const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const browser=await chromium.connectOverCDP('http://127.0.0.1:'+(process.env.KITTEN_DEBUG_PORT||19371));
const pages=browser.contexts()[0].pages(),pet=pages.find(p=>p.url().includes('pet.html'));assert.ok(pet);
const errors=[];for(const p of pages){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
const cmd=(name,value)=>pet.evaluate(([n,v])=>window.kitten.command(n,v),[name,value]);
await pet.waitForFunction(()=>images.length===36&&loadedOutfit===state.config.outfit);
await cmd('panel');let panel=browser.contexts()[0].pages().find(p=>p.url().includes('panel.html'));assert.ok(panel);
await panel.waitForSelector('#autostart');
const report={combinations:[],errors,autonomousFish:[],time:new Date().toISOString()};
for(const outfit of ['none','rose','sailor','honey']){
  await panel.locator(`[data-outfit="${outfit}"]`).click();
  await pet.waitForFunction(id=>loadedOutfit===id&&images.length===36,outfit);
  for(const action of ['idle','play','feed','fish','rest','sleep']){
    await panel.locator(`[data-action="${action}"]`).click();
    await pet.waitForFunction(a=>state.action===a,action);await pause(180);
    const result=await pet.evaluate(()=>({outfit:loadedOutfit,action:state.action,frame,loaded:images.every(im=>im.complete&&im.naturalWidth===512),purr:!!purr,audio:audioContext.state}));
    assert.equal(result.loaded,true);assert.equal(result.audio,'running');if(['sleep','rest'].includes(action))assert.equal(result.purr,true);
    report.combinations.push(result);
  }
}
await panel.locator('button[data-theme="night"]').click();await panel.waitForFunction(()=>document.body.dataset.theme==='night');await pause(200);
await panel.screenshot({path:path.join(out,'panel-night.png')});
await panel.locator('button[data-theme="day"]').click();await panel.waitForFunction(()=>document.body.dataset.theme==='day');await pause(200);
await panel.screenshot({path:path.join(out,'panel-day.png')});
report.layout=await panel.evaluate(()=>({height:innerHeight,scrollHeight:document.body.scrollHeight,bodyWidth:document.body.scrollWidth,width:innerWidth}));assert.equal(report.layout.bodyWidth,report.layout.width);
await panel.locator('#name').fill('棉花糖');await panel.locator('#rename').click();await pet.waitForFunction(()=>state.config.name==='棉花糖');
report.renamed=await pet.title();assert.ok(report.renamed.includes('棉花糖'));
await cmd('action','sleep');await pause(300);await cmd('pause',true);const frozen=await pet.evaluate(()=>localElapsed);await pause(1400);assert.equal(await pet.evaluate(()=>localElapsed),frozen);assert.equal(await pet.evaluate(()=>purr===null),true);await cmd('pause',false);await pause(300);assert.ok(await pet.evaluate(()=>localElapsed)>frozen);report.pauseResume=true;
await cmd('action','pet');await pause(4200);assert.equal((await cmd('get')).mode,'sleep'); // read-only command returns the current snapshot
report.sleepSurvivesPetting=true;
await cmd('visible',false);await pause(200);assert.equal(await pet.evaluate(()=>purr===null),true);await cmd('visible',true);
await cmd('settings',{muted:true});await pause(100);assert.equal(await pet.evaluate(()=>purr===null),true);await cmd('settings',{muted:false});
await cmd('settings',{outfit:'none'});await pet.waitForFunction(()=>loadedOutfit==='none');
await cmd('action','fish');const initial=(await cmd('get')).caught;let seen=0;
for(let i=0;i<93;i++){await pause(200);const s=await cmd('get');if(s.fishResult&&s.fishResult.attempt!==seen){seen=s.fishResult.attempt;report.autonomousFish.push(s.fishResult);await pet.screenshot({path:path.join(out,'fish-result-'+seen+'.png'),omitBackground:true});}if(i===13)await pet.screenshot({path:path.join(out,'fish-paw.png'),omitBackground:true});if(i===16)await pet.screenshot({path:path.join(out,'fish-pounce.png'),omitBackground:true});}
const final=await cmd('get');assert.equal(report.autonomousFish.length,3);assert.equal(final.caught-initial,report.autonomousFish.filter(r=>r.success).length);assert.equal(final.action,'idle');
report.autonomousFishCountMatches=true;
await cmd('settings',{name:'奶糖',theme:'night',outfit:'none',volume:.32,muted:false,scale:1});
await cmd('action','sleep');console.log('Testing real 30-second sleeping interval...');await pause(30500);const timed=await cmd('get');assert.ok(['sleepStretch','sleepTurn','snuggle'].includes(timed.action));report.realSleepAuto=timed.action;
await pet.screenshot({path:path.join(out,'sleep-auto.png'),omitBackground:true});
assert.equal(errors.length,0);fs.writeFileSync(path.join(out,'runtime-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
