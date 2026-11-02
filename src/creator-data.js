import {creatorTypes, marketplaceAssets} from './platform.js';

export const defaultTemplates = [
  {id:'template-blank', name:'Blank canvas', art:'art/game-5.svg', description:'An empty scene with a ground plane and a player spawn.', scene:'blank'},
  {id:'template-obby', name:'Obby', art:'art/game-2.svg', description:'Platforms, checkpoints, and a finish line for a short obstacle course.', scene:'obby'},
  {id:'template-world', name:'Open world', art:'art/game-5.svg', description:'A landscape layout for exploring, gathering, and building.', scene:'world'},
  {id:'template-social', name:'Social hangout', art:'art/game-6.svg', description:'A shared space with seating and places to meet.', scene:'social'},
].map(item=>({...item,type:'templates',subcategory:'Starter template',creator:'Metallic',tags:['Starter',item.scene],price:0,defaultTemplate:true}));
export const extraAssets = [
  {id:'slate-material',name:'Slate Surface',type:'textures',subcategory:'Materials',description:'A tileable slate material concept for paths, walls, and rooftops.',tags:['Stone','Tileable','Surface'],creator:'CloudBuilder',price:0,color:'blue'},
  {id:'woven-texture',name:'Woven Fabric',type:'textures',subcategory:'Textures',description:'A fabric texture concept for soft furnishings and wearable details.',tags:['Fabric','Tileable'],creator:'LunaBlocks',price:0,color:'purple'},
];
const catalogTags={
  'city-kit':['City','Modular','Building'],'nature-kit':['Nature','Low poly','Environment'],'sci-door':['Sci-fi','Doors','Interactive'],
  'city-loops':['Music','Loops','Atmospheric'],'forest-sound':['Forest','Ambience','Nature'],'align-tools':['Building','Alignment','Studio'],'terrain-painter':['Terrain','Painting','Studio'],
  'signal-cap':['Casual','Hats'],'grid-shirt':['Casual','Graphic'],'cargo-pants':['Cargo','Streetwear'],'orbit-shoes':['Sneakers','Streetwear'],'scout-bot':['Robot','Companion'],'explorer-pack':['Adventure','Backpack'],'silver-chain':['Silver','Jewelry'],
};
export const publicAssets=[...marketplaceAssets,...extraAssets].map(asset=>({...asset,tags:asset.tags||catalogTags[asset.id],art:'art/assets/'+asset.id+'.svg'}));
export function assetTags(asset){return (asset.tags?.length?asset.tags:[asset.subcategory,creatorTypes[asset.type]]).filter(Boolean).slice(0,8);}
export const assetById=(state,id)=>[...defaultTemplates,...publicAssets,...state.creatorAssets].find(asset=>asset.id===id);
export function normalizeAssets(data){
  const seen=new Set([...defaultTemplates,...publicAssets].map(asset=>asset.id));
  return (Array.isArray(data)?data:[]).filter(asset=>asset&&typeof asset.id==='string'&&/^[\w-]{1,64}$/.test(asset.id)&&!seen.has(asset.id)&&seen.add(asset.id)&&typeof asset.name==='string'&&asset.name.trim()&&Object.hasOwn(creatorTypes,asset.type)&&Array.isArray(asset.files)&&asset.files.length>0).slice(0,100).map(asset=>({
    id:asset.id,name:asset.name.trim().slice(0,60),type:asset.type,subcategory:typeof asset.subcategory==='string'?asset.subcategory.slice(0,30):creatorTypes[asset.type],description:typeof asset.description==='string'?asset.description.slice(0,1000):'',
    tags:Array.isArray(asset.tags)?[...new Set(asset.tags.filter(tag=>typeof tag==='string').map(tag=>tag.trim().slice(0,24)).filter(Boolean))].slice(0,8):[],price:0,local:true,
    files:asset.files.filter(file=>file&&typeof file.key==='string'&&/^[\w-]{1,100}$/.test(file.key)&&typeof file.name==='string'&&Number.isSafeInteger(file.size)&&file.size>=0&&file.size<=50*1024*1024).slice(0,100).map(file=>({key:file.key,name:file.name.slice(0,240),size:file.size,mime:typeof file.mime==='string'?file.mime.slice(0,100):''})),
  })).filter(asset=>asset.files.length);
}
export function validateFiles(files,type){
  if(!Object.hasOwn(creatorTypes,type))return 'Choose an asset type.';
  if(!files.length)return 'Choose at least one file or drop a folder.';
  if(files.length>100)return 'Choose up to 100 files per asset.';
  if(files.some(file=>!file.size))return 'Empty files cannot be imported.';
  if(files.some(file=>file.size>50*1024*1024))return 'Each file must be 50 MB or smaller.';
  if(files.reduce((sum,file)=>sum+file.size,0)>100*1024*1024)return 'An asset can contain up to 100 MB of files.';
  if(files.some(file=>/\.(exe|dll|com|bat|cmd|ps1|msi|html?|svg)$/i.test(file.name)))return 'Executable files, HTML, and SVG files are not supported. Use PNG, JPG, or WebP for images.';
  const allowed={templates:/\.(json|metallic|zip)$/i,models:/\.(obj|fbx|gltf|glb|blend|zip|json)$/i,textures:/\.(png|jpe?g|webp|avif|ktx2?|zip|json)$/i,audio:/\.(mp3|wav|ogg|flac|m4a|zip)$/i,plugins:/\.(lua|luau|json|zip)$/i,cosmetics:/\.(obj|fbx|gltf|glb|png|jpe?g|webp|zip|json)$/i,games:/\.(metallic|json|zip|lua|luau)$/i};
  if(files.some(file=>!allowed[type].test(file.name)))return 'One or more files do not match this asset type. Check the supported formats.';
  return '';
}
export const fileFormats={games:'.metallic, .json, .zip, .lua, .luau',templates:'.metallic, .json, .zip',models:'.obj, .fbx, .gltf, .glb, .blend, .zip, .json',textures:'.png, .jpg, .jpeg, .webp, .avif, .ktx, .ktx2, .zip, .json',audio:'.mp3, .wav, .ogg, .flac, .m4a, .zip',plugins:'.lua, .luau, .json, .zip',cosmetics:'.obj, .fbx, .gltf, .glb, .png, .jpg, .jpeg, .webp, .zip, .json'};
export function voteAsset(state,id,vote){
  if(!assetById(state,id)||![1,-1].includes(vote))return false;
  if(state.assetVotes[id]===vote)delete state.assetVotes[id];else state.assetVotes[id]=vote;
  return true;
}
export function ratingFor(state,asset){
  const base=asset.local||asset.defaultTemplate?{likes:0,dislikes:0}:{likes:84+asset.id.length*7,dislikes:3+asset.id.length%7};
  const likes=base.likes+(state.assetVotes[asset.id]===1?1:0),dislikes=base.dislikes+(state.assetVotes[asset.id]===-1?1:0),total=likes+dislikes;
  return {likes,dislikes,total,percent:total?Math.round(likes/total*100):null};
}
export async function collectEntryFiles(entries,limit=100){
  const files=[];
  async function visit(entry,depth=0){
    if(depth>20)throw Error('This folder is nested too deeply. Choose a smaller folder.');
    if(entry.isFile){files.push(await new Promise((resolve,reject)=>entry.file(resolve,reject)));if(files.length>limit)throw Error('Choose a folder with no more than '+limit+' files.');return;}
    if(!entry.isDirectory)return;
    const reader=entry.createReader();
    for(;;){const batch=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!batch.length)break;for(const child of batch)await visit(child,depth+1);}
  }
  for(const entry of entries)await visit(entry);
  return files;
}
let database;
function openFiles(){
  if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('metallic-local-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Close other Metallic tabs and try again.'));}).catch(error=>{database=null;throw error;});
  return database;
}
export async function storeFiles(entries){const db=await openFiles();return new Promise((resolve,reject)=>{const transaction=db.transaction('files','readwrite');for(const entry of entries)transaction.objectStore('files').put(entry.file,entry.key);transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('File import was cancelled.'));});}
export async function readFile(key){const db=await openFiles();return new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function deleteFiles(keys){const db=await openFiles();return new Promise((resolve,reject)=>{const transaction=db.transaction('files','readwrite');for(const key of keys)transaction.objectStore('files').delete(key);transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);});}
export async function clearFiles(){const db=await openFiles();return new Promise((resolve,reject)=>{const transaction=db.transaction('files','readwrite');transaction.objectStore('files').clear();transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);});}
