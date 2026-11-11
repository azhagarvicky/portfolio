const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+__dirname+'/ad.html');
console.log(JSON.stringify(await p.evaluate(()=>window.CUTS)));await b.close()})();
