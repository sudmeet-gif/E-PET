'use strict';
const { EventEmitter } = require('node:events');
const AUTO = Object.freeze(['lick','wash','roll','stretch','pounce','tail','look','knead','yawn','greet']);
const SLEEP_AUTO = Object.freeze(['sleepStretch','sleepTurn','snuggle']);
const LABELS = Object.freeze({idle:'待机',rest:'休息',sleep:'睡觉',play:'逗猫',feed:'喂食',fish:'抓鱼',pet:'摸摸',lick:'舔爪',wash:'洗脸',roll:'打滚',stretch:'伸懒腰',pounce:'小扑跳',tail:'摇尾巴',look:'左顾右盼',knead:'踩奶',yawn:'打哈欠',greet:'举爪撒娇',sleepStretch:'睡梦伸腰',sleepTurn:'轻轻翻身',snuggle:'蜷身蹭蹭'});
const DURATIONS = {play:14000,feed:10000,fish:18000,pet:4000,lick:4800,wash:4800,roll:4400,stretch:4600,pounce:3600,tail:4000,look:4200,knead:4800,yawn:3600,greet:3600,sleepStretch:4600,sleepTurn:4200,snuggle:4000};
class PetEngine extends EventEmitter {
  constructor(config={}, rng=Math.random) {
    super(); this.rng=rng; this.mode=['idle','rest','sleep'].includes(config.mode)?config.mode:'idle';
    this.action=this.mode; this.elapsed=0; this.autoElapsed=0; this.paused=false; this.seq=0; this.caught=Number(config.caught)||0; this.lastAuto='';this.fishResult=null;this.fishAttempt=0;
  }
  snapshot(){return {mode:this.mode,action:this.action,label:LABELS[this.action],elapsed:this.elapsed,autoElapsed:this.autoElapsed,paused:this.paused,seq:this.seq,caught:this.caught,fishResult:this.fishResult};}
  emitState(){this.emit('state',this.snapshot());}
  select(action){
    if(!['idle','rest','sleep','play','feed','fish','pet'].includes(action))return false;
    if(action==='pet'){this.start('pet');return true;}
    this.mode=['idle','rest','sleep'].includes(action)?action:'idle'; this.autoElapsed=0;
    this.start(action); return true;
  }
  start(action){this.action=action;this.elapsed=0;this.seq++;this.fishResult=null;this.fishAttempt=0;this.emitState();}
  pause(value){this.paused=Boolean(value);this.emitState();}
  tick(ms){
    if(this.paused||!Number.isFinite(ms)||ms<=0)return;
    // Advance across boundaries so delayed ticks do not count an interaction as idle time.
    let remaining=ms;
    while(remaining>0){
      const eligible=['idle','rest','sleep',...AUTO,...SLEEP_AUTO].includes(this.action);
      if(!eligible)this.autoElapsed=0;
      const untilEnd=(DURATIONS[this.action]??Infinity)-this.elapsed;
      const untilAuto=eligible?30000-this.autoElapsed:Infinity;
      const untilFish=this.action==='fish'&&this.fishAttempt<3?[3800,9400,15000][this.fishAttempt]-this.elapsed:Infinity;
      const step=Math.min(remaining,untilEnd,untilAuto,untilFish);
      this.elapsed+=step;if(eligible)this.autoElapsed+=step;remaining-=step;
      if(this.action==='fish'&&this.fishAttempt<3&&this.elapsed>=[3800,9400,15000][this.fishAttempt])this.attemptFish();
      if(this.autoElapsed>=30000){this.autoElapsed=0;const pool=(this.mode==='idle'?AUTO:SLEEP_AUTO).filter(a=>a!==this.lastAuto);const action=pool[Math.min(pool.length-1,Math.floor(this.rng()*pool.length))];this.lastAuto=action;this.start(action);}
      else if(this.elapsed>=(DURATIONS[this.action]??Infinity))this.start(this.mode);
    }
  }
  attemptFish(){if(this.action!=='fish'||this.paused)return false;this.fishAttempt++;const success=this.rng()<.55;this.fishResult={attempt:this.fishAttempt,success,at:this.elapsed};if(success){this.caught++;this.emit('catch',this.caught);}this.emitState();return success;}
}
module.exports={PetEngine,AUTO,SLEEP_AUTO,LABELS,DURATIONS};
