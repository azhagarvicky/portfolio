const {chromium}=require('playwright');
const [,,mode,out]=process.argv;
(async()=>{
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
 pg.on('pageerror',e=>console.error('ERR',e.message));
 await pg.goto('file://'+__dirname+'/reel.html');await pg.evaluate(()=>window.ready);
 const times=mode==='stills'?[0.9,1.8,3.5,5.5,7.5,9.0,10.8,13.0,14.5]:[...Array(450).keys()].map(i=>i/30);
 require('fs').mkdirSync(out,{recursive:true});
 for(const [i,t] of times.entries()){await pg.evaluate(t=>render(t),t);await pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));
  await pg.screenshot({path:`${out}/${String(i).padStart(4,'0')}.${mode==='stills'?'png':'jpg'}`,...(mode==='stills'?{}:{type:'jpeg',quality:95})});}
 await b.close();})();
