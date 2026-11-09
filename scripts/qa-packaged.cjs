const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),os=require('node:os');
const {chromium}=require(process.env.KITTEN_PLAYWRIGHT||'playwright-core');
const output=path.resolve(process.env.KITTEN_QA_OUTPUT||path.join(__dirname,'../../qa'));fs.mkdirSync(output,{recursive:true});
const exe=process.env.KITTEN_QA_EXE||path.join(os.homedir(),'Desktop','E-PET.exe');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await chromium.connectOverCDP('http://127.0.0.1:19372');const pet=b.contexts()[0].pages().find(p=>p.url().endsWith('pet.html'));assert.ok(pet);await pet.waitForFunction(()=>images.length===36&&audioReady&&Object.keys(sounds).length===6);
const cmd=(n,v)=>pet.evaluate(([n,v])=>window.kitten.command(n,v),[n,v]);await cmd('panel');await delay(300);const panel=b.contexts()[0].pages().find(p=>p.url().endsWith('panel.html'));const report={packaged:true,exe,all36FramesDecoded:await pet.evaluate(()=>images.every(im=>im.naturalWidth===512)),sounds:await pet.evaluate(()=>Object.keys(sounds))};
const baseline=(await cmd('get')).config.autostart;assert.equal(baseline,false);
try{
await panel.locator('#autostart').check();await delay(250);assert.equal((await cmd('get')).config.autostart,true);
const registry=cp.execFileSync('reg.exe',['query','HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'],{encoding:'utf8',windowsHide:true});
assert.ok(registry.includes(exe));report.autostartRegistryPathCorrect=true;
}finally{await cmd('autostart',false);}
assert.equal((await cmd('get')).config.autostart,false);report.autostartRemoved=true;
await cmd('action','fish');let seen=0;const outcomes=[];
for(let i=0;i<92;i++){await delay(200);const s=await cmd('get');if(s.fishResult&&s.fishResult.attempt!==seen){seen=s.fishResult.attempt;outcomes.push(s.fishResult);if(!s.fishResult.success)await pet.screenshot({path:path.join(output,'fish-failure.png'),omitBackground:true});}}
report.fishOutcomes=outcomes;assert.equal(outcomes.length,3);
await cmd('settings',{name:'雪球',outfit:'rose',theme:'night',volume:.22});await cmd('action','sleep');await delay(350);
await panel.screenshot({path:path.join(output,'packaged-night.png')});report.savedBeforeRestart=(await cmd('get')).config;
fs.writeFileSync(path.join(output,'packaged-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await cmd('quit').catch(()=>{});await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
