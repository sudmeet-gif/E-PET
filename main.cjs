'use strict';
const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,screen,dialog}=require('electron');
const fs=require('node:fs');const path=require('node:path');
const {PetEngine}=require('./engine.cjs');const settings=require('./settings.cjs');
app.setName('E-PET');app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
if(process.env.KITTEN_DEBUG_PORT){app.commandLine.appendSwitch('remote-debugging-address','127.0.0.1');app.commandLine.appendSwitch('remote-debugging-port',process.env.KITTEN_DEBUG_PORT);}
let pet,panel,tray,engine,config,profile,file,drag=null,timer=null,ignore=false,closing=false,saveTimer;
const SIZE={width:360,height:350};
const asset=name=>path.join(__dirname,'assets',name);
function startupPath(){return process.env.PORTABLE_EXECUTABLE_FILE||process.execPath;}
function startupEnabled(){return app.isPackaged&&app.getLoginItemSettings({path:startupPath(),args:[]}).openAtLogin;}
function state(){return {...engine.snapshot(),config:{...config,autostart:startupEnabled()},visible:pet?.isVisible()??true};}
function broadcast(){for(const w of [pet,panel])if(w&&!w.isDestroyed())w.webContents.send('state',state());updateTray();}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{settings.atomicWrite(file,config);}catch(e){dialog.showErrorBox('设置未能保存','请将桌宠移动到可写入的文件夹后重试。\n'+e.message);}},180);}
function keepOnScreen(bounds){const d=screen.getDisplayMatching(bounds).workArea;return {x:Math.max(d.x,Math.min(bounds.x,d.x+d.width-bounds.width)),y:Math.max(d.y,Math.min(bounds.y,d.y+d.height-bounds.height))};}
function place(){const old=pet.getBounds();const w=Math.round(SIZE.width*config.scale),h=Math.round(SIZE.height*config.scale);const pos=keepOnScreen({x:old.x+old.width-w,y:old.y+old.height-h,width:w,height:h});pet.setBounds({...pos,width:w,height:h});config.x=pos.x;config.y=pos.y;}
function showPanel(){
  if(panel&&!panel.isDestroyed()){panel.show();panel.focus();return;}
  const b=pet.getBounds(),d=screen.getDisplayMatching(b).workArea;
  const panelHeight=Math.min(800,d.height-24);
  panel=new BrowserWindow({width:396,height:panelHeight,x:Math.max(d.x,Math.min(b.x-390,d.x+d.width-396)),y:Math.max(d.y,Math.min(b.y-140,d.y+d.height-panelHeight)),title:config.name+'的小窝',resizable:false,autoHideMenuBar:true,backgroundColor:config.theme==='night'?'#252b32':'#faf8f5',icon:asset('icon.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  secure(panel);panel.loadFile('panel.html');panel.on('closed',()=>panel=null);
}
function secure(win){win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('file://'))e.preventDefault();});}
function updateTray(){if(!tray||!engine)return;tray.setToolTip(config.name+' · '+engine.snapshot().label);tray.setContextMenu(Menu.buildFromTemplate([
  {label:config.name+'的小窝',click:showPanel}, {type:'separator'},
  ...[['idle','待机'],['play','逗猫'],['feed','喂食'],['fish','抓鱼'],['rest','休息'],['sleep','睡觉']].map(([id,label])=>({label,type:'radio',checked:engine.action===id,click:()=>command('action',id)})),
  {type:'separator'},{label:engine.paused?'继续活动':'暂停活动',click:()=>command('pause',!engine.paused)},
  {label:config.muted?'打开音效':'静音',click:()=>command('settings',{muted:!config.muted})},
  {label:pet.isVisible()?'隐藏小猫':'显示小猫',click:()=>command('visible',!pet.isVisible())},
  {label:'把小猫找回来',click:()=>{const d=screen.getPrimaryDisplay().workArea;pet.setPosition(d.x+d.width-pet.getBounds().width-30,d.y+d.height-pet.getBounds().height-20);pet.show();}},
  {type:'separator'},{label:'退出',click:()=>app.quit()}
 ]));}
async function command(name,value){
  if(name==='action'){engine.select(value);config.mode=engine.mode;save();}
  else if(name==='pause')engine.pause(value);
  else if(name==='settings'&&value&&typeof value==='object'){
    const before=config;config=settings.clean({...config,...Object.fromEntries(Object.entries(value).filter(([k])=>['name','outfit','theme','volume','muted','scale','topmost'].includes(k)))});
    if(before.scale!==config.scale)place();pet.setAlwaysOnTop(config.topmost,'floating');pet.setTitle(config.name+' · 白猫桌宠');if(panel)panel.setTitle(config.name+'的小窝');save();broadcast();
  }else if(name==='autostart'){
    if(app.isPackaged)app.setLoginItemSettings({openAtLogin:Boolean(value),path:startupPath(),args:[]});
    broadcast();
  }else if(name==='panel')showPanel();
  else if(name==='visible'){value?pet.showInactive():pet.hide();broadcast();}
  else if(name==='quit')app.quit();
  return state();
}
app.whenReady().then(()=>{
  const preferred=process.env.KITTEN_PROFILE||path.join(app.getPath('appData'),'WhiteKittenCompanion');
  const fallback=path.join(process.env.PORTABLE_EXECUTABLE_DIR||path.dirname(process.execPath),'白猫桌宠数据');
  profile=settings.probe(preferred)?preferred:settings.probe(fallback)?fallback:null;
  if(!profile){dialog.showErrorBox('无法保存桌宠设置','请将 EXE 放在可写入的文件夹。');app.quit();return;}
  if(profile===fallback&&process.platform==='win32')try{require('node:child_process').execFileSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','attrib.exe'),['+H',profile],{windowsHide:true});}catch{}
  app.setPath('userData',profile);file=path.join(profile,'settings.json');config=settings.read(file);
  if(!app.requestSingleInstanceLock()){app.quit();return;}
  engine=new PetEngine(config);settings.atomicWrite(file,config);
  const d=screen.getPrimaryDisplay().workArea;const w=Math.round(SIZE.width*config.scale),h=Math.round(SIZE.height*config.scale);
  const pos=keepOnScreen({x:config.x??d.x+d.width-w-28,y:config.y??d.y+d.height-h-20,width:w,height:h});
  pet=new BrowserWindow({...pos,width:w,height:h,title:config.name+' · 白猫桌宠',transparent:true,frame:false,hasShadow:false,resizable:false,skipTaskbar:true,alwaysOnTop:config.topmost,show:false,backgroundColor:'#00000000',icon:asset('icon.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  secure(pet);pet.loadFile('pet.html');pet.once('ready-to-show',()=>pet.showInactive());
  pet.on('close',e=>{if(!closing){e.preventDefault();pet.hide();broadcast();}});
  pet.on('move',()=>{const b=pet.getBounds();config.x=b.x;config.y=b.y;save();});
  screen.on('display-removed',()=>place());
  tray=new Tray(nativeImage.createFromPath(asset('tray.png')));tray.on('click',showPanel);updateTray();
  engine.on('state',broadcast);engine.on('catch',n=>{config.caught=n;save();pet.webContents.send('catch',n);});
  let last=performance.now(),dragTicks=0;
  timer=setInterval(()=>{const now=performance.now();engine.tick(Math.min(1000,now-last));last=now;if(drag){const p=screen.getCursorScreenPoint();const b=pet.getBounds();pet.setPosition(drag.x+p.x-drag.cursor.x,drag.y+p.y-drag.cursor.y);if(++dragTicks>2400)drag=null;}},50);
  setInterval(broadcast,1000).unref();
  app.on('second-instance',()=>{pet.showInactive();showPanel();});
  if(process.env.KITTEN_SHOW_PANEL==='1')showPanel();
}).catch(e=>{dialog.showErrorBox('小猫启动失败',String(e.stack||e));app.quit();});
ipcMain.handle('get',()=>state());ipcMain.handle('command',(event,name,value)=>{if(![pet?.webContents,panel?.webContents].includes(event.sender))return;return command(name,value);});
ipcMain.on('hit',(event,hit)=>{if(event.sender!==pet?.webContents||drag)return;const next=!Boolean(hit);if(next!==ignore){ignore=next;pet.setIgnoreMouseEvents(ignore,{forward:true});}});
ipcMain.on('drag',(event,phase)=>{if(event.sender!==pet?.webContents)return;if(phase==='start'){const b=pet.getBounds();drag={x:b.x,y:b.y,cursor:screen.getCursorScreenPoint()};pet.setIgnoreMouseEvents(false);ignore=false;}else{drag=null;const b=pet.getBounds();pet.setPosition(...Object.values(keepOnScreen(b)));save();}});
app.on('before-quit',()=>{closing=true;clearInterval(timer);clearTimeout(saveTimer);if(config&&file)try{settings.atomicWrite(file,config);}catch{}});
app.on('window-all-closed',()=>{if(closing)app.quit();});
