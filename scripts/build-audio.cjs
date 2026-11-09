'use strict';
const fs=require('node:fs'),path=require('node:path');const rate=24000;let seed=165391;
const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2147483648-1;};
const gauss=(x,c,w)=>Math.exp(-Math.pow((x-c)/w,2));const smooth=x=>Math.max(0,Math.min(1,x));
function wave(name,duration,fn){const count=Math.round(rate*duration),b=Buffer.alloc(44+count*2);b.write('RIFF');b.writeUInt32LE(36+count*2,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(count*2,40);for(let i=0;i<count;i++)b.writeInt16LE(Math.round(Math.tanh(fn(i/rate,i))*23000),44+i*2);const dir=path.join(__dirname,'../assets/audio');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.wav'),b);}
let phase=0;wave('meow',2.2,t=>{const start=t<1.12?0:1.18,d=t-start;if(d<0||d>.88)return 0;const q=d/.88;const f=530+240*Math.sin(q*Math.PI*.9)-210*q+12*Math.sin(t*40);phase+=2*Math.PI*f/rate;const f1=1900-1200*q,f2=2900-900*q;let v=0;for(let k=1;k<13;k++){const freq=k*f;const weight=(.20/k+gauss(freq,f1,320)*.34+gauss(freq,f2,470)*.18);v+=Math.sin(phase*k)*weight;}const env=Math.pow(Math.sin(q*Math.PI),.65)*smooth(d/.06);return v*env*.63;});
let lp=0;wave('purr',4,t=>{const n=noise();lp=lp*.89+n*.11;const pulse=Math.pow(.5+.5*Math.sin(2*Math.PI*26*t),3),breath=.58+.42*Math.sin(Math.PI*t/2)**2;return (lp*.7+Math.sin(2*Math.PI*52*t)*.09+Math.sin(2*Math.PI*78*t)*.035)*pulse*breath;});
wave('crunch',6,t=>{const p=t%.44,env=Math.exp(-p*42)*(1-Math.exp(-p*350));return (noise()*.65+Math.sin(2*Math.PI*(950+Math.sin(t*50)*600)*t)*.17)*env*.9;});
wave('lick',2.2,t=>{const p=t%.48,env=Math.exp(-Math.pow((p-.12)/.043,2));return(noise()*.15+Math.sin(2*Math.PI*(1300+t*90)*t)*.11)*env;});
let smoothNoise=0;wave('splash',.85,t=>{smoothNoise=smoothNoise*.6+noise()*.4;return (smoothNoise*.75+Math.sin(2*Math.PI*(500-300*t)*t)*.12)*Math.exp(-t*5)*smooth(t/.01);});
wave('bell',.8,t=>Math.sin(2*Math.PI*1250*t)*Math.exp(-t*7)*smooth(t/.01)*.23);
console.log('Created 6 original local sound effects (24 kHz PCM WAV).');
