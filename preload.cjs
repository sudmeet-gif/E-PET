const { contextBridge,ipcRenderer }=require('electron');
contextBridge.exposeInMainWorld('kitten',{
  get:()=>ipcRenderer.invoke('get'),command:(name,value)=>ipcRenderer.invoke('command',name,value),
  onState:callback=>{const fn=(_,state)=>callback(state);ipcRenderer.on('state',fn);return()=>ipcRenderer.removeListener('state',fn);},
  onCatch:callback=>ipcRenderer.on('catch',(_,n)=>callback(n)),
  hit:value=>ipcRenderer.send('hit',value),drag:(phase)=>ipcRenderer.send('drag',phase)
});
