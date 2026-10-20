'use strict';
// The app starts normally. Bounded, read-only production checks run after readiness.
const {spawn}=require('node:child_process');
const child=spawn(process.execPath,[require('node:path').join(__dirname,'install.js')],{env:process.env,stdio:'inherit'});
let timer;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearTimeout(timer);child.kill(signal);});
child.on('exit',code=>process.exit(code||0));
const origin='https://casa-de-loco-uhlalaa-live.onrender.com';
const delay=ms=>new Promise(r=>{timer=setTimeout(r,ms);timer.unref();});
(async()=>{
 await delay(18000);
 for(let attempt=0;attempt<6;attempt++){
  try{
   const h=await fetch(origin+'/health',{signal:AbortSignal.timeout(15000)});const health=await h.json();
   if(!h.ok||health.version!=='4.0-bildedition'){await delay(15000);continue;}
   const paths=['/','/regie','/app.js','/style.css','/assets/home.avif','/assets/archive.avif','/assets/degusta.avif','/assets/news.avif','/assets/market.avif','/assets/kitchen.avif','/assets/show.avif','/assets/finale.avif','/assets/director.avif','/assets/detail-1.avif','/assets/detail-2.avif','/assets/detail-3.avif'];
   for(const p of paths){const r=await fetch(origin+p,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('GET '+p+' HTTP '+r.status);await r.arrayBuffer();console.log('CASA PUBLIC CHECK PASS '+p);}
   for(const role of ['markus','andrea','regie']){
    const r=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(role==='regie'?{role,pin:process.env.ADMIN_PIN}:{role,code:process.env.ROOM_CODE||'LOCO13'}),signal:AbortSignal.timeout(15000)});
    const d=await r.json();if(!r.ok||!d.token)throw Error('Anmeldung '+role+' nicht erfolgreich');
    const s=await fetch(origin+'/api/state',{headers:{Authorization:'Bearer '+d.token},signal:AbortSignal.timeout(15000)});if(!s.ok)throw Error('Spielansicht '+role+' nicht erfolgreich');await s.json();
    const c=new AbortController();const f=setTimeout(()=>c.abort(),8000);let reader;
    try{const stream=await fetch(origin+'/api/stream',{headers:{Authorization:'Bearer '+d.token},signal:c.signal});if(!stream.ok)throw Error('Livekanal '+role);reader=stream.body.getReader();const first=await reader.read();if(!new TextDecoder().decode(first.value).includes('ready'))throw Error('Livekanal nicht bereit');}finally{clearTimeout(f);if(reader)await reader.cancel().catch(()=>{});c.abort();}
    console.log('CASA PUBLIC CHECK PASS login/state/live '+role);
   }
   console.log('CASA PUBLIC CHECK COMPLETE: public assets, all three role logins and authenticated live streams passed. No game round was started or reset.');return;
  }catch(e){console.log('CASA PUBLIC CHECK retry '+(attempt+1)+': '+String(e.message).slice(0,180));await delay(15000);}
 }
 console.log('CASA PUBLIC CHECK INCOMPLETE: app remains running; inspect live service before claiming verification.');
})();
