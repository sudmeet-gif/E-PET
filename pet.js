'use strict';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const bubble=document.querySelector('#bubble'),badge=document.querySelector('#badge');
let state,images={},loadedOutfit='',loadToken=0,previousFrame=null,frame=0,frameChanged=0,localElapsed=0,lastTime=0,lastSeq=-1,lastHit=null,dragging=false,down=null,clickTimer,bubbleUntil=0,lastFishKey='';
let audioContext,audioReady=false,purr=null,oneShots=new Set(),lastPurrKey='';
const sounds={};const particles=[];let pointer={x:180,y:180};
async function loadOutfit(id){const token=++loadToken;const frames=await Promise.all(Array.from({length:36},(_,i)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=`assets/frames/${id}/${i}.png`;})));if(token===loadToken){images=frames;loadedOutfit=id;}}
function say(text,time=2500){bubble.textContent=text;bubbleUntil=performance.now()+time;bubble.classList.add('show');}
function spark(x,y){for(let i=0;i<8;i++)particles.push({x,y,vx:(Math.random()-.5)*38,vy:-20-Math.random()*35,life:1,color:i%2?'#efabc1':'#ffd77d'});}
async function initAudio(){if(audioReady)return;audioReady=true;try{audioContext=new AudioContext();await audioContext.resume();await Promise.all(['meow','crunch','purr','lick','splash','bell'].map(async name=>{const b=await (await fetch(`assets/audio/${name}.wav`)).arrayBuffer();sounds[name]=await audioContext.decodeAudioData(b);}));syncPurr(true);}catch(e){console.error('音效初始化失败',e);}}
function sound(name,level=1){if(!audioContext||!sounds[name]||!state||state.config.muted||state.paused||!state.visible)return;if(audioContext.state==='suspended')audioContext.resume();const src=audioContext.createBufferSource(),gain=audioContext.createGain();src.buffer=sounds[name];gain.gain.value=state.config.volume*level;src.connect(gain).connect(audioContext.destination);src.start();oneShots.add(src);src.onended=()=>oneShots.delete(src);}
function stopShots(){for(const src of oneShots)try{src.stop();}catch{}oneShots.clear();}
function syncPurr(force=false){if(!state)return;const should=(state.mode==='sleep'||state.mode==='rest'||state.action==='pet')&&!state.paused&&!state.config.muted&&state.visible;const key=should+':'+state.config.volume;if(!force&&key===lastPurrKey)return;lastPurrKey=key;if(purr){try{purr.src.stop();}catch{}purr=null;}if(should&&audioContext&&sounds.purr){const src=audioContext.createBufferSource(),gain=audioContext.createGain();src.buffer=sounds.purr;src.loop=true;gain.gain.value=state.config.volume*.42;src.connect(gain).connect(audioContext.destination);src.start();purr={src,gain};}}
function receive(s){const changed=lastSeq!==s.seq;state=s;if(loadedOutfit!==s.config.outfit&&!images.loading){images.loading=true;loadOutfit(s.config.outfit).catch(console.error);}
  document.title=s.config.name+' · 白猫桌宠';badge.textContent=s.config.name+(s.paused?' · 已暂停':s.mode==='sleep'?' · 好梦':s.mode==='rest'?' · 休息中':'');
  if(changed){lastSeq=s.seq;localElapsed=s.elapsed;previousFrame=null;frameChanged=performance.now();
    const phrases={play:'陪我玩逗猫棒吧～',feed:'开饭啦，吧唧吧唧！',fish:'嘘…我来抓鱼，你看着就好～',rest:'让我趴一会儿…',sleep:'呼噜噜…晚安',pet:'好舒服呀，呼噜噜～'};
    if(phrases[s.action])say(phrases[s.action],s.action==='fish'?5000:2600);
    if(['play','pet'].includes(s.action))sound('meow',.8);if(s.action==='feed')sound('crunch',.85);if(s.action==='fish')sound('splash',.6);if(['lick','wash'].includes(s.action))sound('lick',.6);
  }else if(Math.abs(localElapsed-s.elapsed)>700)localElapsed=s.elapsed;
  if(s.fishResult){const key=s.seq+':'+s.fishResult.attempt;if(key!==lastFishKey){lastFishKey=key;sound('splash',.75);say(s.fishResult.success?'抓到啦！送你一条小鱼 ♡':'哎呀，小鱼溜走啦…',2100);if(s.fishResult.success){sound('meow',.65);spark(140,140);}}}
  if(s.paused||s.config.muted||!s.visible)stopShots();syncPurr();
}
function sequence(a,t){const at=(arr,period)=>arr[Math.floor(t/period)%arr.length];switch(a){
case 'idle':return t%5700>5400?1:0;
case 'rest':case 'sleep':return 10;
case 'lick':return at([2,3,2,3,2,0],650);
case 'wash':return at([3,2,3,1],700);
case 'roll':return at([6,7,6,7,6,0],650);
case 'stretch':return t<650?9:t<3600?8:9;
case 'pounce':return at([4,4,5,5,4,0],430);
case 'tail':return at([22,23,22,23],700);
case 'look':return at([16,25,17,25],950);
case 'knead':return at([20,21],550);
case 'yawn':return t<450?1:t<2250?18:t<3100?19:1;
case 'greet':return at([14,15,14,0],650);
case 'sleepStretch':return t<650?26:t<3500?27:26;
case 'sleepTurn':return at([10,11,11,10],1000);
case 'snuggle':return 26;
case 'play':return at([4,4,5,4,14,5],680);
case 'feed':return at([12,13,12,12],650);
case 'fish':{const p=t%5600;if(p<2200)return 28;if(p<2800)return 29;if(p<3300)return 30;if(p<3800)return 31;const success=state.fishResult?.success;if(p<5200)return success?at([32,33],450):34;return success?33:35;}
case 'pet':return state.mode==='idle'?1:10;
default:return 0;}}
function roundRect(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawFish(x,y,color,size=1){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,16,9,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(25,-10);ctx.lineTo(25,10);ctx.closePath();ctx.fill();ctx.fillStyle='#fff8ed';ctx.beginPath();ctx.arc(-8,-2,2.3,0,7);ctx.fill();ctx.fillStyle='#564f47';ctx.beginPath();ctx.arc(-8,-2,1.1,0,7);ctx.fill();ctx.restore();}
function fishPosition(t){const p=t%5600;return {x:p>2700&&p<3900?95:108+Math.sin(t/850)*55,y:292+Math.sin(t/510)*6};}
function draw(t){let dt=lastTime?Math.min(60,t-lastTime):0;lastTime=t;if(state&&!state.paused)localElapsed+=dt;const dpr=window.devicePixelRatio||1;const w=innerWidth,h=innerHeight;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(canvas.width/360,0,0,canvas.height/350,0,0);ctx.clearRect(0,0,360,350);
  if(state&&images[0]){
    const a=state.action,tm=localElapsed,sec=tm/1000,sleeping=['sleep','rest','sleepTurn','snuggle'].includes(a)||(a==='pet'&&state.mode!=='idle');
    const next=sequence(a,tm);if(next!==frame){previousFrame=frame;frame=next;frameChanged=t;}
    let x=180,y=294,rotation=0,sy=1+Math.sin(sec*(sleeping?2:2.8))*(sleeping?.012:.004),sx=1;
    if(a==='roll')rotation=Math.sin(sec*4)*.13;
    if(a==='pounce'||a==='play'){if(frame===5)y-=18+Math.abs(Math.sin(sec*4))*12;}
    if(a==='knead'){y+=Math.sin(sec*8)*2.5;sx=1+Math.sin(sec*8)*.012;}
    if(a==='snuggle'){rotation=Math.sin(sec*1.8)*.025;}
    if(a==='sleepStretch'||a==='stretch')sx=1+Math.sin(Math.min(1,tm/2200)*Math.PI)*.03;
    if(a==='fish'){x=214;y=301;ctx.fillStyle='#c7edf7dc';ctx.beginPath();ctx.ellipse(110,291,98,29,0,0,7);ctx.fill();ctx.strokeStyle='#78baceaa';ctx.lineWidth=2;ctx.stroke();const p=fishPosition(tm);const resultAge=state.fishResult?tm-state.fishResult.at:Infinity;if(!(state.fishResult?.success&&resultAge>=0&&resultAge<1800))drawFish(p.x,p.y,'#ffa36f',.68);drawFish(104-Math.sin(tm/1200)*52,302,'#9db4e9',.43);if(tm%5600>3100&&tm%5600<4300){ctx.strokeStyle='#eefbff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(100,290,16+Math.sin(sec*20)*4,5,0,0,7);ctx.stroke();for(let i=0;i<4;i++){ctx.fillStyle='#9ed5eb';ctx.beginPath();ctx.arc(95+(i-1.5)*12,276-Math.sin(sec*12+i)*7,2.2,0,7);ctx.fill();}}}
    if(a==='rest'||a==='sleep'||a==='sleepTurn'||a==='snuggle'||a==='sleepStretch'){ctx.fillStyle='#eadfd477';ctx.beginPath();ctx.ellipse(180,292,110,13,0,0,7);ctx.fill();}
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(sx,sy);
    const blend=previousFrame===null?1:Math.min(1,(t-frameChanged)/110);
    if(blend<1){ctx.globalAlpha=1-blend;ctx.drawImage(images[previousFrame],-132,-264,264,264);}ctx.globalAlpha=blend;ctx.drawImage(images[frame],-132,-264,264,264);ctx.restore();
    if(a==='feed'){ctx.fillStyle='#bc9281';ctx.beginPath();ctx.ellipse(160,286,32,11,0,0,7);ctx.fill();roundRect(127,285,66,22,8,'#dfb8a0');ctx.fillStyle='#916449';ctx.beginPath();ctx.ellipse(160,286,28,7,0,0,7);ctx.fill();for(let i=0;i<11;i++){ctx.fillStyle=i%2?'#c49155':'#ddb980';ctx.beginPath();ctx.arc(141+(i*13)%41,284+(i%3)*2,2.4,0,7);ctx.fill();}ctx.fillStyle='#fff9ed';ctx.font='12px sans-serif';ctx.fillText('♥',154,301);}
    if(a==='play'){const tx=180+Math.sin(sec*3)*92,ty=125+Math.cos(sec*4)*25;ctx.strokeStyle='#9c8168';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(320,40);ctx.lineTo(tx+20,ty-42);ctx.stroke();ctx.strokeStyle='#d7b8bd';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(tx+20,ty-42);ctx.quadraticCurveTo(tx+32,ty-5,tx,ty);ctx.stroke();ctx.save();ctx.translate(tx,ty);ctx.rotate(Math.sin(sec*3));ctx.fillStyle='#efa6bf';ctx.beginPath();ctx.ellipse(0,0,8,22,-.4,0,7);ctx.fill();ctx.fillStyle='#b5cfca';ctx.beginPath();ctx.ellipse(9,5,6,17,.5,0,7);ctx.fill();ctx.restore();}
    if(sleeping){ctx.fillStyle='#a7a9bc';ctx.font='15px Georgia';ctx.globalAlpha=.45+.25*Math.sin(sec);ctx.fillText('z',255,162-Math.sin(sec)*5);ctx.font='21px Georgia';ctx.fillText('z',272,141-Math.sin(sec+.5)*7);ctx.globalAlpha=1;}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(!state.paused){p.life-=dt/1300;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;}if(p.life<=0){particles.splice(i,1);continue;}ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.font='18px Segoe UI';ctx.fillText('♥',p.x,p.y);}ctx.globalAlpha=1;
  }
  if(t>bubbleUntil)bubble.classList.remove('show');requestAnimationFrame(draw);
}
function position(e){return{x:e.clientX/innerWidth*360,y:e.clientY/innerHeight*350};}
function hit(e){const a=ctx.getImageData(Math.max(0,Math.min(canvas.width-1,Math.round(e.clientX/innerWidth*canvas.width))),Math.max(0,Math.min(canvas.height-1,Math.round(e.clientY/innerHeight*canvas.height))),1,1).data[3];return a>60;}
document.addEventListener('pointermove',e=>{pointer=position(e);if(down&&Math.hypot(e.screenX-down.x,e.screenY-down.y)>5&&!dragging){dragging=true;clearTimeout(clickTimer);window.kitten.drag('start');}const h=dragging||hit(e);if(h!==lastHit){lastHit=h;window.kitten.hit(h);}});
document.addEventListener('pointerdown',e=>{if(e.button!==0||!hit(e))return;down={x:e.screenX,y:e.screenY};canvas.setPointerCapture(e.pointerId);});
document.addEventListener('pointerup',e=>{if(!down)return;down=null;if(dragging){dragging=false;window.kitten.drag('end');return;}clearTimeout(clickTimer);clickTimer=setTimeout(()=>window.kitten.command('panel'),250);});
document.addEventListener('pointercancel',()=>{down=null;dragging=false;window.kitten.drag('end');});
document.addEventListener('dblclick',()=>{clearTimeout(clickTimer);window.kitten.command('action','pet');spark(180,125);});
document.addEventListener('contextmenu',e=>{e.preventDefault();window.kitten.command('panel');});
document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')window.kitten.command('panel');});
window.kitten.onState(receive);window.kitten.onCatch(()=>spark(180,280));
window.kitten.get().then(async s=>{receive(s);await loadOutfit(s.config.outfit);await initAudio();say('我是'+s.config.name+'，点击我打开小窝 ♡',5500);});
requestAnimationFrame(draw);
