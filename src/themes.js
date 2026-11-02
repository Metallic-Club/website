export const APPEARANCE_KEY = 'metallic-appearance-v1';
export const accents = {
  orange:{name:'Metallic orange',color:'#ff9b54',hover:'#ffb47f',light:'#a34506'},
  blue:{name:'Ocean blue',color:'#82b5ff',hover:'#a9cdff',light:'#225da8'},
  violet:{name:'Electric violet',color:'#ba9aff',hover:'#d0baff',light:'#7141ae'},
  mint:{name:'Fresh mint',color:'#72d9b1',hover:'#a0ebce',light:'#1d7152'},
  rose:{name:'Rose',color:'#ff9bb5',hover:'#ffbed0',light:'#a13959'},
};
export const defaultAppearance={mode:'dark',accent:'orange',textSize:'standard',contrast:false};
export function normalizeAppearance(value={}) {
  if(!value||typeof value!=='object')return {...defaultAppearance};
  return {mode:['dark','light','system'].includes(value.mode)?value.mode:'dark',accent:Object.hasOwn(accents,value.accent)?value.accent:'orange',textSize:value.textSize==='large'?'large':'standard',contrast:value.contrast===true};
}
export function loadAppearance(storage){try{return normalizeAppearance(JSON.parse(storage.getItem(APPEARANCE_KEY)));}catch{return {...defaultAppearance};}}
export function saveAppearance(storage,value){try{storage.setItem(APPEARANCE_KEY,JSON.stringify(normalizeAppearance(value)));return true;}catch{return false;}}
export function applyAppearance(value,root,systemLight=false){
  const prefs=normalizeAppearance(value),palette=accents[prefs.accent];
  root.dataset.theme=prefs.mode==='system'?(systemLight?'light':'dark'):prefs.mode;
  root.dataset.accent=prefs.accent;root.dataset.textSize=prefs.textSize;root.dataset.contrast=String(prefs.contrast);
  root.style.setProperty('--accent',root.dataset.theme==='light'?palette.light:palette.color);root.style.setProperty('--accent-fill',palette.color);root.style.setProperty('--accent-hover',palette.hover);
}
export function themesPage(prefs){
  return `<section class="panel theme-panel"><div class="theme-panel-heading"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>Themes</h2><p>Choose how Metallic looks on this browser. Changes apply immediately.</p></div>
    <fieldset><legend>Appearance</legend><div class="theme-mode-grid">${[['dark','Dark','A dark canvas for your games.'],['light','Light','A brighter look, day or night.'],['system','System','Follow your device settings.']].map(([id,label,description])=>`<button type="button" class="theme-mode ${prefs.mode===id?'selected':''}" data-action="theme-mode" data-value="${id}" aria-pressed="${prefs.mode===id}"><span class="theme-mini ${id}"><i></i><b></b><em></em></span><strong>${label}</strong><small>${description}</small></button>`).join('')}</div></fieldset>
    <fieldset><legend>Accent color</legend><p class="theme-help">Orange is the Metallic default. Pick a color that feels like you.</p><div class="accent-options">${Object.entries(accents).map(([id,accent])=>`<button type="button" data-action="theme-accent" data-value="${id}" class="accent-option ${prefs.accent===id?'selected':''}" aria-pressed="${prefs.accent===id}" aria-label="${accent.name}"><span style="--swatch:${accent.color}">${prefs.accent===id?'✓':''}</span><strong>${accent.name}</strong></button>`).join('')}</div></fieldset>
    <fieldset><legend>Readability</legend><div class="theme-readability"><label for="theme-text-size"><strong>Text size</strong><small>Make descriptions, controls and labels easier to read.</small></label><select id="theme-text-size" aria-label="Text size"><option value="standard" ${prefs.textSize==='standard'?'selected':''}>Standard</option><option value="large" ${prefs.textSize==='large'?'selected':''}>Large</option></select></div><label class="toggle-row"><span><strong>Stronger contrast</strong><small>Emphasize borders, secondary text and focus indicators.</small></span><input type="checkbox" id="theme-contrast" role="switch" ${prefs.contrast?'checked':''}></label></fieldset>
    <div class="theme-save-note"><p id="theme-status" role="status" aria-live="polite">Your preferences are saved to this browser.</p><button type="button" class="text-button" data-action="theme-reset">Reset to Metallic defaults</button></div></section>`;
}
