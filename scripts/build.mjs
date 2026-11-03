import { mkdir, copyFile, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
const workspace = path.resolve('.'), output = path.resolve(workspace, 'dist');
if (path.dirname(output) !== workspace || path.basename(output) !== 'dist') throw Error('Invalid build directory');
async function walk(directory) {
  const result=[];
  for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const filename=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...await walk(filename));else if(entry.isFile())result.push(filename);
  }
  return result;
}
let html=await readFile('index.html','utf8');
const api=process.env.METALLIC_CATALOG_API||'';
if(api){const url=new URL(api);if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Invalid public catalog API URL');html=html.replace('name="metallic-catalog-api" content=""','name="metallic-catalog-api" content="'+api.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"');}
const betaApi=process.env.METALLIC_BETA_API||'';
if(betaApi){const url=new URL(betaApi);if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Invalid public beta API URL');html=html.replace('name="metallic-beta-api" content=""','name="metallic-beta-api" content="'+betaApi.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"');}
const connectionsApi=process.env.METALLIC_CONNECTIONS_API||'';
if(connectionsApi){const url=new URL(connectionsApi);if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Invalid account connections API URL');html=html.replace('name="metallic-connections-api" content=""','name="metallic-connections-api" content="'+connectionsApi.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"');}
const files=[...await walk('src'),...await walk('public')];
const hash=createHash('sha256').update(html);
for(const file of files){hash.update(file.replaceAll('\\','/'));hash.update(await readFile(file));}
const revision=hash.digest('hex').slice(0,12), assetPath='assets/'+revision, prefix='./'+assetPath+'/';
const styles=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^\"]+)">/g)].map(match=>match[1]);
const css=(await Promise.all(styles.map(file=>readFile(file,'utf8')))).join('\n');
html=html.replace(/  <link rel="stylesheet" href="\.\/src\/[^\"]+">\r?\n/g,'').replace('  <script type="module"','  <link rel="stylesheet" href="'+prefix+'styles.css">\n  <script type="module"').replace('./src/app.js',prefix+'src/app.js').replace('./favicon.svg',prefix+'favicon.svg');
await rm(output,{recursive:true,force:true});await mkdir(path.join(output,assetPath,'src'),{recursive:true});
let jsGzip=0, cssGzip=gzipSync(css).length;
for(const file of files){
  if(file.endsWith('.css'))continue;
  const relative=file.startsWith('public')?file.slice('public'.length+1):file;
  const target=path.join(output,assetPath,relative);await mkdir(path.dirname(target),{recursive:true});
  if(file.endsWith('.js')){let source=await readFile(file,'utf8');source=source.replace(/(["'`])art\//g,(_,quote)=>quote+prefix+'art/');jsGzip+=gzipSync(source).length;await writeFile(target,source);}else await copyFile(file,target);
}
if(jsGzip>120*1024||cssGzip>48*1024)throw Error('Asset budget exceeded: JS <=120 KiB gzip, CSS <=48 KiB gzip.');
await writeFile(path.join(output,assetPath,'styles.css'),css);await writeFile(path.join(output,'index.html'),html);
// Compatibility entry for browser favicon requests; normal pages use versioned artwork.
await copyFile('public/favicon.svg',path.join(output,'favicon.svg'));
const headers='/\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n  X-Content-Type-Options: nosniff\n';
await writeFile(path.join(output,'_headers'),headers);
await mkdir('.local',{recursive:true});await writeFile('.local/build-report.json',JSON.stringify({revision,jsGzipBytes:jsGzip,cssGzipBytes:cssGzip,stylesheets:1},null,2)+'\n');
console.log('Built Metallic '+revision+' — JS '+(jsGzip/1024).toFixed(1)+' KiB gzip, CSS '+(cssGzip/1024).toFixed(1)+' KiB gzip.');
