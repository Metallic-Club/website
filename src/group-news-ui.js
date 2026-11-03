import {escapeHtml as esc} from './store.js';
import {findGroup} from './social.js';
import {canGroup} from './group-access.js';
import {pageWindow} from './pagination.js';
import {newsForGroup,setNewsSubscription,publishGroupNews} from './group-news.js';

export function createGroupNewsUI(ctx){
  function page(group){
    const state=ctx.state(),params=ctx.params(),posts=newsForGroup(state,group.id),selected=posts.findIndex(post=>post.id===params.get('post'));
    const page=pageWindow(posts,params.get('newsPage')||(selected>=0?Math.floor(selected/6)+1:1),6),subscribed=state.groupNewsSubscriptions[group.id]===true;
    return `<section class="group-news"><div class="section-top"><div><h2>News</h2><p class="section-sub">Updates from ${esc(group.name)}.</p></div><div class="button-row">${ctx.button('group-news-toggle',ctx.icon('bell',16)+(subscribed?' Notifications on':' Notify me'),'button small',`data-id="${group.id}" aria-pressed="${subscribed}"`)}${canGroup(group,state.profile.name,'postNews')?ctx.button('write-group-news','Write a post','button primary small',`data-id="${group.id}"`):''}</div></div>${posts.length?page.items.map(post=>`<article class="panel news-post ${post.id===params.get('post')?'news-selected':''}" id="news-post-${post.id}"><div class="news-post-meta">${ctx.link('profile?user='+encodeURIComponent(post.author),ctx.accountName(post.author),'text-link')}<time datetime="${post.createdAt}">${new Date(post.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</time></div><h3>${esc(post.title)}</h3><p>${esc(post.body)}</p></article>`).join(''):'<div class="inline-empty">No news posts yet.</div>'}${ctx.pageLinks(page,'news posts','newsPage')}<p class="fine-print">News and notification preferences are saved in this browser. Live delivery to other accounts is not connected.</p></section>`;
  }
  function handleAction(action,el){
    if(!['group-news-toggle','write-group-news'].includes(action))return false;
    const state=ctx.state(),group=findGroup(state,el.dataset.id);if(!group)return true;
    if(action==='group-news-toggle'){const on=state.groupNewsSubscriptions[group.id]!==true;setNewsSubscription(state,group.id,on);ctx.persist(on?'Group news notifications are on.':'Group news notifications are off.');ctx.render();return true;}
    if(!canGroup(group,state.profile.name,'postNews')){ctx.toast('Your role cannot publish group news.');return true;}
    ctx.modal('Write a news post',`<form id="group-news-form" data-id="${group.id}"><label for="news-title">Title</label><input id="news-title" name="title" required maxlength="100" placeholder="What’s new?"><label for="news-body">Post</label><textarea id="news-body" name="body" required maxlength="3000" rows="7" placeholder="Share an update with your group."></textarea><label class="checkbox-label"><input type="checkbox" name="notify" checked> Notify people who turned on news notifications</label><p class="fine-print">Local preview. This does not send messages or notifications to real accounts.</p><p id="news-error" class="form-error" role="alert"></p><button type="submit" class="button primary">Publish post</button></form>`);return true;
  }
  function submit(form){
    const data=new FormData(form),result=publishGroupNews(ctx.state(),form.dataset.id,{title:data.get('title'),body:data.get('body'),notify:data.has('notify')},crypto.randomUUID());
    if(!result.ok){form.querySelector('#news-error').textContent=result.error;return;}
    ctx.dialog.close();ctx.persist('News post published in this preview.');ctx.navigate('/groups/'+form.dataset.id+'?tab=news&post='+result.post.id);ctx.render();
  }
  return {page,handleAction,submit};
}
