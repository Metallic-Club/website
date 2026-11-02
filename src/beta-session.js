// Access comes only from the configured server's cookie-backed beta session.
// Local preview state, invite grants and URL parameters never authenticate a user.
export const requiresTester = route => !['', 'login', 'signup'].includes(route);
export function testerReturnTo(value) {
  if (typeof value !== 'string' || !/^\/(?!\/)/.test(value) || /[\\#\r\n]/.test(value) || value.length > 2048) return '/home';
  const path = value.split('?')[0].replace(/^\/+|\/+$/g, '');
  return /^[\w/-]+$/.test(path) && requiresTester(path) ? value : '/home';
}
export function createBetaSession({endpoint='', fetchImpl=globalThis.fetch, now=Date.now, timeoutMs=8000}={}) {
  if(endpoint){const url=new URL(endpoint);if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Beta session API must use HTTPS.');}
  let grant=null, controller, sequence=0;
  const hasAccess=()=>Boolean(grant&&grant.expiresAt>now());
  const clear=()=>{sequence++;controller?.abort();grant=null;};
  async function request(path, body) {
    clear();const currentSequence=sequence;
    if(!endpoint)return {ok:false,message:'Tester sign-in is not connected yet. Beta access remains locked.'};
    const current=new AbortController();controller=current;
    const timer=setTimeout(()=>current.abort(),timeoutMs);
    try {
      const response=await fetchImpl(endpoint.replace(/\/$/,'')+'/v1/beta/'+path,{
        method:body?'POST':'GET',credentials:'include',cache:'no-store',redirect:'error',signal:current.signal,
        headers:{Accept:'application/json','X-Metallic-Client':'beta-website',...(body?{'Content-Type':'application/json'}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),
      });
      if(currentSequence!==sequence||current.signal.aborted)return {ok:false,cancelled:true};
      if(!response.ok)return {ok:false,message:response.status===429?'Too many attempts. Please wait before trying again.':'We couldn’t verify an active beta tester session. Please sign in again.'};
      if(path==='logout')return {ok:true};
      if(Number(response.headers.get('content-length'))>8192)return {ok:false};
      const text=await response.text();if(text.length>8192)return {ok:false};
      const data=JSON.parse(text),expiresAt=Date.parse(data.expiresAt);
      if(currentSequence!==sequence||current.signal.aborted)return {ok:false,cancelled:true};
      if(data.authenticated!==true||data.betaTester!==true||!Number.isFinite(expiresAt)||expiresAt<=now()||expiresAt>now()+86400000
        ||typeof data.user?.id!=='string'||!data.user.id||data.user.id.length>128||typeof data.user?.username!=='string'||!/^\w{3,20}$/.test(data.user.username))return {ok:false,message:'An active beta tester account is required.'};
      grant={expiresAt,user:{id:data.user.id,username:data.user.username}};
      return {ok:true};
    }catch{return {ok:false,message:'Tester sign-in is unavailable. Beta access remains locked.'};}
    finally{clearTimeout(timer);}
  }
  return {hasAccess,clear,configured:Boolean(endpoint),expiresAt:()=>hasAccess()?grant.expiresAt:0,user:()=>hasAccess()?{...grant.user}:null,
    check:()=>request('session'),login:(email,password)=>request('login',{email,password}),logout:()=>request('logout',{})};
}
