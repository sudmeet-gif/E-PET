'use strict';
const fs=require('node:fs');const path=require('node:path');
const sharp=require(process.env.KITTEN_SHARP||'sharp');
const root=path.join(__dirname,'..');
async function cleanCell(buffer,w,h){
  const count=w*h,visited=new Uint8Array(count),queue=new Int32Array(count);let largest=[];
  for(let p=0;p<count;p++){
    if(visited[p]||buffer[p*4+3]<150)continue;let head=0,tail=0;queue[tail++]=p;visited[p]=1;
    while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);for(const n of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])if(n>=0&&!visited[n]&&buffer[n*4+3]>=150){visited[n]=1;queue[tail++]=n;}}
    if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
  }
  if(largest.length<count*.08)throw Error('Missing kitten silhouette');
  const keep=new Uint8Array(count);for(const p of largest){const x=p%w,y=Math.floor(p/w);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)keep[yy*w+xx]=1;}}
  let x0=w,y0=h,x1=0,y1=0;
  for(let p=0;p<count;p++){if(!keep[p])buffer[p*4+3]=0;if(buffer[p*4+3]>20){const x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
  const cw=x1-x0+1,ch=y1-y0+1;const ratio=Math.min(480/w,480/cw,464/ch);
  const bw=Math.round(cw*ratio),bh=Math.round(ch*ratio);
  const png=await sharp(buffer,{raw:{width:w,height:h,channels:4}}).extract({left:x0,top:y0,width:cw,height:ch}).resize(bw,bh).png().toBuffer();
  return sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:png,left:Math.round((512-bw)/2),top:490-bh}]).png().toBuffer();
}
async function main(){
  const summary={};
  for(const outfit of ['none','rose','sailor','honey']){
    const dir=path.join(root,'assets','frames',outfit);fs.mkdirSync(dir,{recursive:true});const frames=[];
    for(const [suffix,rows,count,offset] of [['',4,16,0],['-extra',3,12,16],['-fish',2,8,28]]){
      const source=path.join(root,'assets','source',outfit+suffix+'.png');const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      for(let i=0;i<count;i++){const c=i%4,r=Math.floor(i/4),x0=Math.round(c*info.width/4),y0=Math.round(r*info.height/rows),x1=Math.round((c+1)*info.width/4),y1=Math.round((r+1)*info.height/rows),w=x1-x0,h=y1-y0;const cell=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)data.copy(cell,y*w*4,((y0+y)*info.width+x0)*4,((y0+y)*info.width+x1)*4);const frame=await cleanCell(cell,w,h);fs.writeFileSync(path.join(dir,(offset+i)+'.png'),frame);frames.push(frame);}
    }
    summary[outfit]={frames:36,frameSize:[512,512]};
    const composite=frames.map((input,i)=>({input,left:(i%4)*256,top:Math.floor(i/4)*256}));
    await sharp({create:{width:1024,height:2304,channels:4,background:'#dddedb'}}).composite(await Promise.all(composite.map(async item=>({...item,input:await sharp(item.input).resize(256).toBuffer()})))).png().toFile(path.join(root,'assets','source',outfit+'-contact.png'));
  }
  const icon=await sharp(path.join(root,'assets/frames/none/0.png')).resize(256).png().toBuffer();
  const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(icon.length,14);header.writeUInt32LE(22,18);fs.writeFileSync(path.join(root,'assets/icon.ico'),Buffer.concat([header,icon]));
  await sharp(icon).resize(32).png().toFile(path.join(root,'assets/tray.png'));
  fs.writeFileSync(path.join(root,'assets/manifest.json'),JSON.stringify(summary,null,2));console.log(summary);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
