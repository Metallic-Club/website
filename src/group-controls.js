import {escapeHtml as esc} from './store.js';
import {findGroup,groupMembers,groupCategories,groupRole} from './social.js';
import {groupPermissions,canGroup,roleFor,assignGroupRole,saveGroupRole,normalizeGroupConfig} from './group-access.js';
import {pageWindow} from './pagination.js';

export function createGroupControls(ctx){
  const {link,icon,button,pageHead,pageLinks,modal,dialog,toast,persist,render}=ctx;
  let imagePending=null;
  const editable=group=>Object.keys(groupPermissions).some(key=>canGroup(group,ctx.state().profile.name,key));
  function current(){return findGroup(ctx.state(),ctx.route().split('/')[1]);}
  function commit(group){ctx.state().groupConfigs[group.id]=normalizeGroupConfig(group);persist('Group changes saved in this browser.');render();}
  function controlPage(){
    const group=current();if(!group)return ctx.notFound();const actor=ctx.state().profile.name,role=roleFor(group,actor),section=ctx.params().get('section')||'overview';
    const sections=[['overview','Overview',true],['profile','Group profile',canGroup(group,actor,'editProfile')],['announcements','Announcements',canGroup(group,actor,'postShout')],['news','News',canGroup(group,actor,'postNews')],['members','Members',canGroup(group,actor,'manageMembers')],['roles','Roles & permissions',canGroup(group,actor,'manageRoles')]];
    if(!editable(group))return link('groups/'+group.id,'← Back to group','text-link')+ctx.empty('You don’t have permission to manage this group.','Ask the group owner to review your role.');
    if(!sections.some(([key,,allowed])=>key===section&&allowed))return link('groups/'+group.id+'/manage','← Control panel','text-link')+ctx.empty('This section is restricted.','Your role does not include permission to make these changes.');
    let content='';
    if(section==='overview')content=`<section class="panel"><span class="eyebrow">GROUP CONTROL PANEL</span><h2>${esc(group.name)}</h2><p>Signed in as ${esc(actor)} · <strong>${esc(role.name)}</strong></p><h3>Your permissions</h3><ul class="permission-list">${Object.entries(groupPermissions).map(([key,label])=>`<li>${icon(canGroup(group,actor,key)?'check':'close',16)} ${label}</li>`).join('')}</ul>${canGroup(group,actor,'createGames')?link('create?tab=templates&group='+group.id,'Choose a game template','button primary'):''}</section>`;
    if(section==='profile')content=`<form class="panel group-control-form" id="group-profile-form" data-id="${group.id}"><h2>Group profile</h2><div class="group-image-editor">${ctx.groupEmblem(group,'large')}<div><label class="button small file-picker">Change group image<input id="group-image" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="field-hint">PNG, JPG, or WebP. Up to 5 MB; cropped to a square.</p>${button('remove-group-image','Use group initial','button quiet small',`data-id="${group.id}"`)}</div></div><label for="control-group-name">Group name</label><input id="control-group-name" name="name" value="${esc(group.name)}" required minlength="3" maxlength="40"><label for="control-description">Description</label><textarea id="control-description" name="description" rows="4" maxlength="500">${esc(group.description)}</textarea><label for="control-interest">Interest</label><select id="control-interest" name="category">${groupCategories.map(name=>`<option ${group.category===name?'selected':''}>${name}</option>`).join('')}</select><label for="control-policy">Membership</label><select id="control-policy" name="joinPolicy"><option value="open" ${group.joinPolicy==='open'?'selected':''}>Open</option><option value="approval" ${group.joinPolicy==='approval'?'selected':''}>Approval required</option></select><p class="form-error" id="group-control-error" role="alert"></p><button type="submit" class="button primary">Save changes</button></form>`;
    if(section==='news')content=`<section class="panel"><h2>Group news</h2><p>Publish updates for people who follow this group’s news.</p>${link('groups/'+group.id+'?tab=news','Open group news','button primary')}</section>`;
    if(section==='announcements')content=`<form class="panel group-control-form" id="group-shout-form" data-id="${group.id}"><h2>Announcements</h2><label for="control-shout">Group shout</label><textarea id="control-shout" name="shout" rows="5" maxlength="500">${esc(group.shout)}</textarea><p class="fine-print">This appears at the top of your group’s About section.</p><button type="submit" class="button primary">Save announcement</button></form>`;
    if(section==='members'){
      const page=pageWindow(groupMembers(group,ctx.state()),ctx.params().get('page'));
      const candidates=ctx.state().friends.filter(name=>!group.members.includes(name));
      content=`<section class="panel"><h2>Members</h2><p class="muted">Assign roles below your own rank. The owner and your own role cannot be changed here.</p>${candidates.length?`<form class="group-add-member" id="group-add-member-form" data-id="${group.id}"><label for="preview-member">Add a member to try the role controls</label><div class="button-row"><select name="member" id="preview-member">${candidates.map(name=>`<option>${esc(name)}</option>`).join('')}</select><button type="submit" class="button small">Add preview member</button></div><p class="fine-print">Local simulation only. This does not invite or add a real player.</p></form>`:''}<div class="control-member-list">${page.items.map(member=>{const target=roleFor(group,member),allowed=member!==actor&&target.rank<role.rank;const roles=group.roleDefinitions.filter(item=>item.rank<role.rank&&(actor===group.owner||item.permissions.every(key=>role.permissions.includes(key))));return `<form class="control-member" id="member-role-${esc(member)}" data-group-member="${esc(member)}" data-id="${group.id}"><span><strong>${ctx.accountName(member)}</strong><small>${esc(groupRole(group,member))}</small></span>${allowed?`<label class="sr-only" for="member-role-${esc(member)}-select">Role for ${esc(member)}</label><select id="member-role-${esc(member)}-select" name="role">${roles.map(item=>`<option ${item.name===target.name?'selected':''}>${esc(item.name)}</option>`).join('')}</select><button type="submit" class="button small">Update role</button>`:'<span class="tag">Protected</span>'}</form>`;}).join('')}</div>${pageLinks(page,'members')}</section>`;
    }
    if(section==='roles')content=`<section class="panel"><div class="section-top"><div><h2>Roles & permissions</h2><p class="section-sub">Higher ranks can manage lower ranks when permitted.</p></div>${button('new-group-role','Add role','button primary small',`data-id="${group.id}"`)}</div><div class="group-role-list">${group.roleDefinitions.map(item=>`<article><div><h3>${esc(item.name)} <span class="tag">Rank ${item.rank}</span></h3><p>${item.permissions.map(key=>groupPermissions[key]).join(' · ')||'Basic group membership'}</p></div>${item.rank<role.rank&&item.name!=='Member'?button('edit-group-role','Edit','button small',`data-id="${group.id}" data-value="${esc(item.name)}"`):'<span class="tag">Protected</span>'}</article>`).join('')}</div></section>`;
    return link('groups/'+group.id,'← Back to group','text-link')+pageHead('Manage '+esc(group.name),'Your role: '+esc(role.name))+`<div class="settings-layout group-control-layout"><nav class="settings-nav" aria-label="Group control sections">${sections.filter(([, ,allowed])=>allowed).map(([key,label])=>link('groups/'+group.id+'/manage'+(key==='overview'?'':'?section='+key),icon(key==='members'?'friends':'settings',18)+label,key===section?'active':'')).join('')}</nav><div class="settings-section-content">${content}<p class="fine-print">Group settings and role changes are local preview data. Live group permissions must also be enforced by the account service.</p></div></div>`;
  }
  function roleEditor(group,previousName=''){
    const actor=ctx.state().profile.name;if(!canGroup(group,actor,'manageRoles'))return;
    const own=roleFor(group,actor),role=group.roleDefinitions.find(item=>item.name===previousName);if(previousName&&(!role||role.name==='Member'||role.rank>=own.rank))return;
    modal(role?'Edit group role':'Add group role',`<form id="group-role-form" data-id="${group.id}" data-previous="${esc(previousName)}"><label for="role-name">Role name</label><input id="role-name" name="name" required minlength="2" maxlength="24" pattern="[A-Za-z0-9_ -]+" value="${esc(role?.name||'')}"><label for="role-rank">Rank</label><input id="role-rank" name="rank" type="number" required min="2" max="${own.rank-1}" value="${role?.rank||10}"><small class="field-hint">Choose an unused rank below your own (${own.rank}).</small><fieldset class="role-permissions"><legend>Permissions</legend>${Object.entries(groupPermissions).filter(([key])=>own.permissions.includes(key)).map(([key,label])=>`<label><input name="permissions" type="checkbox" value="${key}" ${role?.permissions.includes(key)?'checked':''}>${label}</label>`).join('')}</fieldset><p id="role-error" class="form-error" role="alert"></p><button type="submit" class="button primary full">Save role</button></form>`);
  }
  async function submit(form){
    const group=findGroup(ctx.state(),form.dataset.id);if(!group)return;const actor=ctx.state().profile.name,data=new FormData(form);
    if(form.id==='group-profile-form'){
      if(!canGroup(group,actor,'editProfile')){toast('Your role cannot edit group details.');return;}
      const name=data.get('name').trim();if(name.length<3){form.querySelector('#group-control-error').textContent='Enter a name of at least 3 characters.';return;}
      Object.assign(group,{name,description:data.get('description').trim(),category:data.get('category'),joinPolicy:data.get('joinPolicy')});
      if(imagePending!==null)group.image=imagePending;imagePending=null;commit(group);
    }
    if(form.id==='group-shout-form'){if(!canGroup(group,actor,'postShout'))return;group.shout=data.get('shout').trim();group.shoutBy=actor;commit(group);}
    if(form.id==='group-add-member-form'){if(!canGroup(group,actor,'manageMembers')||!ctx.state().friends.includes(data.get('member'))||group.members.length>=200)return;group.members=[...new Set([...group.members,data.get('member')])];commit(group);}
    if(form.id==='group-role-form'){
      if(!saveGroupRole(group,actor,{name:data.get('name'),rank:Number(data.get('rank')),permissions:data.getAll('permissions')},form.dataset.previous)){form.querySelector('#role-error').textContent='Use a unique role name and rank below your own. You can only grant permissions you hold.';return;}
      dialog.close();commit(group);
    }
    if(form.dataset.groupMember){if(!assignGroupRole(group,actor,form.dataset.groupMember,data.get('role'))){toast('Your role cannot make that change.');return;}commit(group);}
  }
  async function change(event){
    if(event.target.id!=='group-image')return;const group=current();if(!canGroup(group,ctx.state().profile.name,'editProfile'))return;
    const file=event.target.files?.[0];if(!file)return;
    const error=document.querySelector('#group-control-error');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){error.textContent='Choose a PNG, JPG, or WebP image up to 5 MB.';return;}
    const url=URL.createObjectURL(file);try{
      const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const side=Math.min(image.naturalWidth,image.naturalHeight);canvas.getContext('2d').drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,128,128);imagePending=canvas.toDataURL('image/webp',0.8);
      if(imagePending.length>36000)throw Error();document.querySelector('.group-image-editor .group-emblem').innerHTML=`<img src="${imagePending}" alt="Group image preview">`;error.textContent='Image selected. Save changes to apply.';
    }catch{error.textContent='Unable to read this image. Choose another file.';}finally{URL.revokeObjectURL(url);}
  }
  function handleAction(action,el){
    const group=findGroup(ctx.state(),el.dataset.id);if(!group)return false;
    if(['new-group-role','edit-group-role'].includes(action)){roleEditor(group,action==='edit-group-role'?el.dataset.value:'');return true;}
    if(action==='remove-group-image'&&canGroup(group,ctx.state().profile.name,'editProfile')){imagePending='';document.querySelector('.group-image-editor .group-emblem').textContent=group.name[0].toUpperCase();toast('Save changes to apply the new group image.');return true;}
    return false;
  }
  return {controlPage,editable,handleAction,submit,change,resetImage:()=>{imagePending=null;}};
}
