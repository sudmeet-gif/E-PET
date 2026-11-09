'use strict';
let state;const $=s=>document.querySelector(s);let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.opacity=0,2000);}
function active(selector,key,value){for(const b of document.querySelectorAll(selector)){const selected=b.dataset[key]===value;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);}}
function receive(s){
  state=s;document.title=s.config.name+'的小窝';document.body.dataset.theme=s.config.theme;
  $('#pet-name').textContent=s.config.name;$('#status').textContent=s.paused?'时间慢下来，活动已暂停':'正在'+s.label+' · 安静陪着你';
  $('#next').textContent=s.paused?'已暂停':['play','feed','fish','pet'].includes(s.action)?'互动结束后再小动作':Math.ceil((30000-s.autoElapsed)/1000)+' 秒后小动作';
  const portrait=`assets/frames/${s.config.outfit}/0.png`;if($('#portrait').getAttribute('src')!==portrait)$('#portrait').src=portrait;
  active('[data-action]','action',s.action);active('[data-outfit]','outfit',s.config.outfit);active('button[data-theme]','theme',s.config.theme);
  if(document.activeElement!==$('#name'))$('#name').value=s.config.name;
  if(document.activeElement!==$('#volume'))$('#volume').value=Math.round(s.config.volume*100);
  $('#volume-value').textContent=Math.round(s.config.volume*100)+'%';$('#mute').textContent=s.config.muted?'已静音':'音效开';
  $('#size').value=String(s.config.scale);$('#topmost').checked=s.config.topmost;$('#autostart').checked=s.config.autostart;
  $('#pause').textContent=s.paused?'继续活动':'暂停活动';$('#hide').textContent=s.visible?'隐藏小猫':'显示小猫';$('#fish-count').textContent='已抓到 '+s.caught+' 条鱼';
  $('#hint').textContent=s.action==='fish'?'小猫会自己观察、扑抓，小鱼也可能偷偷溜走。':s.mode==='sleep'||s.mode==='rest'?'每 30 秒轻轻翻身或伸腰，拖动和摸摸也不会叫醒它。':'双击小猫可以摸摸它，按住小猫可以拖动。';
}
const cmd=(name,value)=>window.kitten.command(name,value).then(receive).catch(()=>toast('没有设置成功，请重试'));
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>cmd('action',b.dataset.action);
for(const b of document.querySelectorAll('[data-outfit]'))b.onclick=()=>cmd('settings',{outfit:b.dataset.outfit});
for(const b of document.querySelectorAll('button[data-theme]'))b.onclick=()=>cmd('settings',{theme:b.dataset.theme});
$('#rename').onclick=()=>{const name=Array.from($('#name').value.trim()).slice(0,12).join('');if(!name){toast('给小猫取个名字吧');return;}cmd('settings',{name}).then(()=>toast('以后就叫我'+name+'啦 ♡'));};
$('#name').onkeydown=e=>{if(e.key==='Enter')$('#rename').click();};
$('#volume').oninput=()=>{const volume=Number($('#volume').value)/100;$('#volume-value').textContent=Math.round(volume*100)+'%';cmd('settings',{volume});};
$('#mute').onclick=()=>cmd('settings',{muted:!state.config.muted});
$('#size').onchange=()=>cmd('settings',{scale:Number($('#size').value)});
$('#topmost').onchange=()=>cmd('settings',{topmost:$('#topmost').checked});
$('#autostart').onchange=()=>cmd('autostart',$('#autostart').checked);
$('#pause').onclick=()=>cmd('pause',!state.paused);$('#hide').onclick=()=>cmd('visible',!state.visible);$('#quit').onclick=()=>window.kitten.command('quit');
window.kitten.onState(receive);window.kitten.get().then(receive);
