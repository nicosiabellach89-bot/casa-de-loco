'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),cp=require('node:child_process');
const manifest=require('./manifest.json');
const joined=Array.from({length:manifest.parts},(_,i)=>fs.readFileSync(path.join(__dirname,`part-${String(i+1).padStart(2,'0')}.b64`),'utf8').trim()).join('');
if(joined.length!==manifest.bytesBase64)throw new Error('Unvollständiges Release-Paket');
const packed=Buffer.from(joined,'base64');
if(crypto.createHash('sha256').update(packed).digest('hex')!==manifest.sha256)throw new Error('Release-Prüfsumme stimmt nicht');
const files=JSON.parse(zlib.brotliDecompressSync(packed).toString('utf8'));
const root=path.join(__dirname,'runtime');fs.mkdirSync(root,{recursive:true});
for(const [name,entry]of Object.entries(files)){
 if(!/^(?:public\/[a-zA-Z0-9._/-]+|tests\/[a-zA-Z0-9._/-]+|core\.js|server\.js|package\.json)$/.test(name)||name.split('/').includes('..'))throw new Error('Ungültiger Release-Pfad');
 const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,entry.base64?Buffer.from(entry.base64,'base64'):entry.text,'utf8');
}
// Use the original, edited 1200px-wide artwork from the signed release, never its 384px AVIF thumbnail.
const clientFile=path.join(root,'public','app.js');
const cssFile=path.join(root,'public','style.css');
const serverFile=path.join(root,'server.js');
const fullImage=path.join(root,'public','assets','home.webp');
if(!fs.existsSync(fullImage)||fs.statSync(fullImage).size<100000)throw new Error('Original high-resolution CASA cover missing');
if(fs.existsSync(clientFile)){
 let client=fs.readFileSync(clientFile,'utf8');
 if(!client.includes('src="assets/${esc(name)}.avif"'))throw new Error('Could not locate image source template');
 client=client.replace('src="assets/${esc(name)}.avif"','src="assets/${esc(name)}.webp"');
 client=client.replace('loading="lazy">','loading="${name===\'home\'||name===\'archive\'?\'eager\':\'lazy\'}" fetchpriority="${name===\'home\'?\'high\':\'auto\'}">');
 fs.writeFileSync(clientFile,client,'utf8');
}
if(fs.existsSync(cssFile)){
 fs.appendFileSync(cssFile,'\\n/* Show complete original cover above readable text, never crop or stretch */\\n.lobby-hero{height:auto!important;max-height:none!important;min-height:0!important;display:flex;flex-direction:column;overflow:hidden}.lobby-hero>img{position:relative!important;inset:auto!important;display:block!important;width:100%!important;height:auto!important;aspect-ratio:1200/650!important;object-fit:contain!important;object-position:center!important}.lobby-hero .hero-scrim{display:none!important}.lobby-hero .hero-copy{position:relative!important;left:auto!important;bottom:auto!important;max-width:none!important;padding:24px 32px!important;background:linear-gradient(135deg,#28143d,#401c46)}.lobby-hero .onair{top:12px;right:12px}@media(max-width:780px){.lobby-hero .hero-copy{padding:18px!important}.lobby-hero .hero-copy h1{font-size:2rem!important}}\\n');
}
if(fs.existsSync(serverFile)){
 let server=fs.readFileSync(serverFile,'utf8');
 server=server.replace("'.avif','.json'","'.avif','.webp','.json'");
 server=server.replace("'.avif':'image/avif'","'.avif':'image/avif','.webp':'image/webp'");
 server=server.replace("file.endsWith('.avif')?","(file.endsWith('.avif')||file.endsWith('.webp'))?");
 if(!server.includes("'.webp':'image/webp'"))throw new Error('WebP MIME mapping missing');
 fs.writeFileSync(serverFile,server,'utf8');
}
console.log('CASA Bildedition: Prüfsumme und '+Object.keys(files).length+' Dateien geprüft.');
if(process.argv.includes('--test')){
 cp.execFileSync(process.execPath,['--test','tests/core.test.js'],{cwd:root,stdio:'inherit'});
 cp.execFileSync(process.execPath,['tests/server.test.js'],{cwd:root,stdio:'inherit'});
}else require(path.join(root,'server.js'));
