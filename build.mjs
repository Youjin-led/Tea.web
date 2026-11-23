import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const assets='const css='+JSON.stringify(read('style.css'))+',client='+JSON.stringify(read('client.js'))+',art='+JSON.stringify(fs.readFileSync(new URL('terraces.jpg',import.meta.url)).toString('base64'))+';';
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
const worker=read('server.mjs').replace(/^import .*;$/gm,'').replace("'image/png'","'image/jpeg'");
fs.writeFileSync('dist/server/index.js',assets+'\n'+read('catalog.mjs').replace('export const catalog','const catalog')+'\n'+worker);
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
