import {readFile,readdir,writeFile} from 'node:fs/promises';

// Neutral UI tones only. Artwork, selected accents, presence and gameplay colors
// retain their own colors; no grayscale filter is applied to page content.
const gray=channels=>Math.max(0,Math.min(255,Math.round(channels[0]*.2126+channels[1]*.7152+channels[2]*.0722)));
const channels=hex=>[0,2,4].map(index=>parseInt(hex.slice(index,index+2),16));
const neutralTone=hex=>{
  const [r,g,b]=channels(hex),high=Math.max(r,g,b),low=Math.min(r,g,b),chroma=high-low;
  return chroma<=15 || b>=r&&b>=g&&chroma<=90;
};
const palettePath='src/theme-palette.css',existing=await readFile(palettePath,'utf8');
const light=existing.match(/:root\[data-theme=light\]\{([^}]+)\}/)?.[1];
if(!light)throw Error('Light theme palette is missing.');
const lightNeutral=light.replace(/rgb\((\d+) (\d+) (\d+)\)/g,(_,r,g,b)=>{const value=gray([Number(r),Number(g),Number(b)]);return `rgb(${value} ${value} ${value})`;});
const tones=new Set();
for(const name of (await readdir('src')).filter(name=>name.endsWith('.css')&&name!=='theme-palette.css')){
  let css=await readFile('src/'+name,'utf8');
  for(const match of css.matchAll(/--tone-([a-f0-9]{6})\b/g))if(neutralTone(match[1]))tones.add(match[1]);
  // Some legacy translucent overlays do not use tone variables.
  css=css.replace(/#([a-f0-9]{6})([a-f0-9]{2})\b/gi,(original,hex,alpha)=>{
    if(!neutralTone(hex.toLowerCase()))return original;
    const value=gray(channels(hex)).toString(16).padStart(2,'0');return '#'+value.repeat(3)+alpha;
  });
  if(name==='design.css'){
    const base=':root{--bg:#161616;--header:#1d1d1d;--sidebar:#1b1b1b;--surface:#262626;--surface-hover:#333333;--border:#414141;--text:#f6f6f6;--muted:#c1c1c1;--subtle:#adadad;--accent:#ff9b54;--accent-fill:#ff9b54;--accent-hover:#ffb47f;--accent-ink:#24160d;--header-h:68px;--sidebar-w:208px;--gap:18px;--max:1660px;--input:#1c1c1c;--accent-soft:color-mix(in srgb,var(--accent) 5%,var(--bg));--action-bg:#ebebeb;--action-text:#242424;--action-hover:#fff;--play-bg:#39b878;--play-hover:#53d08f;--play-text:#0d281a}';
    const lightBase=':root[data-theme=light]{color-scheme:light;--bg:#f5f5f5;--header:#fff;--sidebar:#fff;--surface:#fff;--surface-hover:#efefef;--border:#cfcfcf;--text:#262626;--muted:#565656;--subtle:#646464;--input:#f7f7f7;--accent-soft:color-mix(in srgb,var(--accent) 6%,white);--action-bg:#303030;--action-text:#fff;--action-hover:#474747}';
    css=css.replace(/^:root\{[^}]+\}/,base).replace(/:root\[data-theme=light\]\{[^}]+\}/,lightBase);
    // The small theme thumbnails should preview the same neutral surfaces.
    const previewColors={'#141619':'#161616','#434a56':'#494949','#272b33':'#2b2b2b','#e5e9f0':'#e9e9e9','#c1c7d1':'#c6c6c6','#f1f3f7':'#f3f3f3','#4d586b':'#575757','#7f8b9c':'#898989','#647086':'#6d6d6d','#f6f7fb':'#f7f7f7','#e3eaf3':'#e9e9e9'};
    for(const [from,to] of Object.entries(previewColors))css=css.replaceAll(from,to);
  }
  await writeFile('src/'+name,css);
}
const dark=[...tones].sort().map(hex=>{const value=gray(channels(hex));return `--tone-${hex}:rgb(${value} ${value} ${value})`;}).join(';');
await writeFile(palettePath,'/* Neutral legacy UI colors; semantic theme tokens are defined in design.css. */\n:root{'+dark+'}\n:root[data-theme=light]{'+lightNeutral+'}\n');
console.log('Neutralized '+tones.size+' legacy UI tones and the semantic dark/light palettes.');
