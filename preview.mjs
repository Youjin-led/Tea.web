import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import './build.mjs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const worker=(await import(pathToFileURL(path.resolve('dist/server/index.js')))).default;
const db=new DatabaseSync('shop.sqlite');db.exec(fs.readFileSync('schema.sql','utf8'));
const DB={prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {first:()=>stmt.get(...args),run:()=>stmt.run(...args)}}}}};
const port=Number(process.env.PORT||5186);
http.createServer(async(req,res)=>{try{
 const chunks=[];for await(const x of req)chunks.push(x);
 const response=await worker.fetch(new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined}),{...process.env,DB});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch{res.writeHead(500);res.end('Server error')}}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));
