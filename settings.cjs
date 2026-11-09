'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const defaults={name:'奶糖',outfit:'none',theme:'day',volume:0.32,muted:false,scale:1,topmost:true,mode:'idle',caught:0};
function clean(value={}){
  const result={...defaults};
  if(typeof value.name==='string'&&value.name.trim())result.name=Array.from(value.name.trim()).slice(0,12).join('');
  if(['none','rose','sailor','honey'].includes(value.outfit))result.outfit=value.outfit;
  if(['day','night'].includes(value.theme))result.theme=value.theme;
  if(Number.isFinite(value.volume))result.volume=Math.max(0,Math.min(1,value.volume));
  if([0.8,1,1.25,1.5].includes(value.scale))result.scale=value.scale;
  for(const k of ['muted','topmost'])if(typeof value[k]==='boolean')result[k]=value[k];
  if(['idle','rest','sleep'].includes(value.mode))result.mode=value.mode;
  if(Number.isSafeInteger(value.caught)&&value.caught>=0)result.caught=value.caught;
  if(Number.isFinite(value.x)&&Number.isFinite(value.y)){result.x=Math.round(value.x);result.y=Math.round(value.y);}
  return result;
}
function atomicWrite(file,value){
  const tmp=file+'.'+crypto.randomUUID()+'.tmp';
  try{fs.writeFileSync(tmp,JSON.stringify(value,null,2),'utf8');fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function probe(dir){
  const file=path.join(dir,'.write-probe-'+crypto.randomUUID());
  try{fs.mkdirSync(dir,{recursive:true});atomicWrite(file,{v:1});atomicWrite(file,{v:2});return JSON.parse(fs.readFileSync(file,'utf8')).v===2;}catch{return false;}finally{try{fs.unlinkSync(file);}catch{}}
}
function read(file){try{return clean(JSON.parse(fs.readFileSync(file,'utf8')));}catch{return clean();}}
module.exports={defaults,clean,atomicWrite,probe,read};
