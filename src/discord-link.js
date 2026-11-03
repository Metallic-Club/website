// Verified identity always comes from the authenticated account service. A
// browser-local preview flag is never a bot-verification record.
export function validateDiscordAuthorizeUrl(value,apiOrigin){
  const url=new URL(value),redirect=new URL(url.searchParams.get('redirect_uri'));
  if(url.origin!=='https://discord.com'||url.pathname!=='/oauth2/authorize'||url.username||url.password||url.searchParams.get('response_type')!=='code'||url.searchParams.get('scope')!=='identify'||!/^\d{17,20}$/.test(url.searchParams.get('client_id'))||!(url.searchParams.get('state')?.length>=20)||redirect.origin!==apiOrigin||url.searchParams.has('client_secret'))throw Error('The account service returned an invalid Discord authorization link.');
  return url.href;
}
export function createDiscordLink({endpoint='',fetchImpl=globalThis.fetch,timeoutMs=8000}={}){
  let base;
  if(endpoint){base=new URL(endpoint);if(base.username||base.password||base.search||base.hash||!(base.protocol==='https:'||base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw Error('Invalid account connection API.');}
  async function request(path,method='GET'){
    if(!base)throw Error('Discord account linking is not connected in this preview.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(endpoint.replace(/\/$/,'')+'/v1/account/connections/discord'+path,{method,credentials:'include',cache:'no-store',headers:{Accept:'application/json','X-Requested-With':'Metallic'},signal:controller.signal});
      if(!response.ok)throw Error(response.status===401?'Sign in to link your Discord account.':'Unable to update your Discord connection. Try again.');
      if(response.status===204)return null;
      const text=await response.text();if(text.length>16000)throw Error('Invalid account connection response.');return JSON.parse(text);
    }finally{clearTimeout(timer);}
  }
  return {
    configured:!!base,
    async get(){const data=await request('');if(!data||data.linked===false)return null;if(data.linked!==true||data.verified!==true||typeof data.discordId!=='string'||!/^\d{17,20}$/.test(data.discordId)||typeof data.username!=='string'||!data.username.trim()||data.username.length>80)throw Error('The Discord connection could not be verified.');return {discordId:data.discordId,username:data.username,verified:true};},
    async start(){const data=await request('/start','POST');return validateDiscordAuthorizeUrl(data?.authorizeUrl,base.origin);},
    async unlink(){await request('','DELETE');},
  };
}
