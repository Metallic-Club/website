import {escapeHtml as esc} from './store.js';
import {createDiscordLink} from './discord-link.js';

export function createAccountLinksUI(ctx,endpoint=''){
  const service=createDiscordLink({endpoint});let loaded=false,busy=false,connection=null,error='',viewer='',generation=0;
  const redraw=()=>{if(ctx.route()==='settings'&&ctx.params().get('section')==='connections'&&!ctx.isSettingsDirty())ctx.render();};
  async function refresh(){if(busy||!service.configured)return;const current=generation;busy=true;error='';try{const result=await service.get();if(current===generation)connection=result;}catch(err){if(current===generation){connection=null;error=err.message;}}finally{if(current===generation){busy=false;loaded=true;redraw();}}}
  function fields(){
    const preview=!service.configured&&ctx.state().discordPreview;
    return `<div class="linked-account"><h3>YouTube</h3><label for="setting-youtube">YouTube channel</label><input id="setting-youtube" name="youtubeUrl" type="url" maxlength="200" placeholder="https://www.youtube.com/@yourchannel" value="${esc(ctx.state().profile.youtubeUrl||'')}"><p class="field-hint">The YouTuber icon requires verified channel ownership and over 100,000 subscribers. This preview saves a channel link.</p></div><div class="linked-account"><h3>Discord</h3><p>Link Discord so the official Metallic bot can verify which Metallic account you use in participating servers.</p>${connection?`<p><strong>${esc(connection.username)}</strong> <span class="tag">Connected</span></p><small>Discord ID: ${esc(connection.discordId)}</small>`:preview?'<p><strong>Example Discord account</strong> <span class="tag">Preview only · Not verified</span></p>':'<p class="muted">No Discord account linked.</p>'}<div class="button-row">${ctx.button(connection?'discord-unlink':preview?'discord-preview-remove':'discord-link',busy?'Connecting…':connection?'Unlink Discord':preview?'Remove preview':'Link Discord','button',busy?'disabled':'')}${error?ctx.button('discord-refresh','Retry','button quiet'):''}</div>${error?`<p class="form-error" role="alert">${esc(error)}</p>`:''}${!service.configured?'<p class="fine-print">The account service is not connected. You can preview linking, but bot verification will require a real Discord sign-in.</p>':'<p class="fine-print">Discord confirms your identity through sign-in. Your Discord password is never entered on Metallic.</p>'}</div>`;
  }
  function mount(){const active=ctx.route()==='settings'&&ctx.params().get('section')==='connections',name=ctx.state().profile.name;if(!active||viewer!==name){generation++;loaded=false;busy=false;connection=null;error='';viewer=name;}if(active&&!loaded&&!busy&&service.configured)refresh();}
  async function handleAction(action){
    if(!action.startsWith('discord-'))return false;
    if(ctx.isSettingsDirty()){ctx.toast('Save your changes before updating linked accounts.');return true;}
    if(busy)return true;
    if(action==='discord-refresh'){loaded=false;refresh();return true;}
    if(action==='discord-preview-remove'){ctx.state().discordPreview=false;ctx.persist('Discord link preview removed.');ctx.render();return true;}
    if(action==='discord-preview-connect'){ctx.state().discordPreview=true;ctx.dialog.close();ctx.persist('Discord link preview saved. This is not a verified connection.');ctx.render();return true;}
    if(action==='discord-unlink'){ctx.modal('Unlink Discord?',`<p>The official bot will no longer be able to use this connection to verify your Metallic account.</p>${ctx.button('discord-unlink-confirm','Unlink Discord','button danger')} ${ctx.button('close-dialog','Keep linked','button')}`);return true;}
    if(action==='discord-link'&&!service.configured){ctx.modal('Link Discord',`<p>Sign in with Discord to prove that the account belongs to you. The official Metallic bot uses that connection to verify your Metallic account in participating servers.</p><p class="fine-print">This is a preview of the linking flow. It does not sign in to Discord or grant verification.</p>${ctx.button('discord-preview-connect','Preview linked account','button primary')} ${ctx.button('close-dialog','Cancel','button')}`);return true;}
    const current=generation;busy=true;error='';redraw();
    try{if(action==='discord-link'){const url=await service.start();if(current===generation)window.location.assign(url);}else if(action==='discord-unlink-confirm'){await service.unlink();if(current===generation){connection=null;ctx.dialog.close();ctx.toast('Discord account unlinked.');}}}catch(err){if(current===generation)error=err.message;}finally{if(current===generation){busy=false;loaded=true;redraw();}}
    return true;
  }
  return {fields,mount,handleAction};
}
