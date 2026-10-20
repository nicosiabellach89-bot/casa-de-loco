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
// The release contains low-resolution AVIF placeholders. Keep the stable image
// rendering until the original 1200px WebP assets are included in a verified release.
const clientFile=path.join(root,'public','app.js');
if(fs.existsSync(clientFile)){
 let client=fs.readFileSync(clientFile,'utf8');
 client=client.replace('loading="lazy">','loading="${name===\'home\'||name===\'archive\'?\'eager\':\'lazy\'}">');
 fs.writeFileSync(clientFile,client,'utf8');
}
// Apply verified high-resolution image edition to the extracted game.
const hiresParts=Array.from({length:6},(_,i)=>fs.readFileSync(path.join(__dirname,'hires-'+String(i+1).padStart(2,'0')+'.b64'),'utf8').replace(/\s/g,''));
const hiresEncoded=hiresParts.join('');
if(hiresEncoded.length!==2400576)throw new Error('CASA high-resolution image package incomplete');
const hiresPacked=Buffer.from(hiresEncoded,'base64');
if(crypto.createHash('sha256').update(hiresPacked).digest('hex')!=='d0f371475bb4feb84540bd4f9a4db5a35df19fae1b3c42c5e655016a399a1643')throw new Error('CASA high-resolution checksum mismatch');
const hiresFiles=JSON.parse(zlib.brotliDecompressSync(hiresPacked).toString('utf8'));
for(const [name,entry] of Object.entries(hiresFiles)){
 if(!/^(?:public\/[a-zA-Z0-9._/-]+|tests\/[a-zA-Z0-9._/-]+|core\.js|server\.js|package\.json)$/.test(name)||name.split('/').includes('..'))throw new Error('Invalid high-res file path');
 const dest=path.join(root,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,entry.base64?Buffer.from(entry.base64,'base64'):entry.text);
}
console.log('CASA FULL HD: '+Object.keys(hiresFiles).length+' Dateien inklusive Originalbildern eingespielt.');
console.log('CASA Bildedition: Prüfsumme und '+Object.keys(files).length+' Dateien geprüft.');
if(process.argv.includes('--test')){
 cp.execFileSync(process.execPath,['--test','tests/core.test.js'],{cwd:root,stdio:'inherit'});
 cp.execFileSync(process.execPath,['tests/server.test.js'],{cwd:root,stdio:'inherit'});
}else require(path.join(root,'server.js'));
