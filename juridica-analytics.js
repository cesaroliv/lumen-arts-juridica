/* Lumen Arts — optional Meta measurement. No remote advertising code before opt-in. */
(()=>{"use strict";
 const PIXEL_ID="2220026795560504",SITE_ORIGIN="https://juridica.lumenanima.com",API="https://lumen-digital-checkout.ccoliveira1.workers.dev";
 const CONSENT_KEY="lumen-juridica-consent-v2",LEGACY_CONSENT_KEY="lumen-juridica-consent-v1",PURCHASE_KEY="lumen-juridica-meta-purchases-v1",REVOCATION_KEY="lumen-juridica-meta-revocations-v1",SESSION_PREFIX="lumen-juridica-meta:";
 const DAY=86400000,RETENTION=180*DAY,REVOCATION_RETENTION=30*DAY,PURCHASE_WINDOW=47*60*60*1000,BUNDLE="art-justice-four-16k";
 const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 const SKU=/^art-justice-(?:(?:0[1-9]|10)-[a-z0-9-]+|four-16k)$/;
 const production=location.origin===SITE_ORIGIN;
 const isLanding=/^\/(?:(?:en|es)\/)?(?:index\.html)?$/.test(location.pathname);
 const controlsPage=isLanding||/^\/legal\/(?:pt|en|es)\/privacy\.html$/.test(location.pathname);
 const lang=/^es/i.test(document.documentElement.lang)?"es":/^en/i.test(document.documentElement.lang)?"en":"pt";
 const copy={
  pt:{title:"Sua privacidade",text:"Com sua permissão, usamos cookies da Meta e a API de Conversões para medir visitas e compras aprovadas e melhorar nossos anúncios. Você pode comprar normalmente sem aceitar.",accept:"Aceitar medição",reject:"Recusar",preferences:"Preferências de cookies",policy:"Aviso de privacidade",gpc:"O sinal de privacidade do seu navegador está ativo. A medição publicitária permanece desativada."},
  en:{title:"Your privacy",text:"With your permission, we use Meta cookies and the Conversions API to measure visits and approved purchases and improve our ads. You can shop normally without accepting.",accept:"Allow measurement",reject:"Decline",preferences:"Cookie preferences",policy:"Privacy notice",gpc:"Your browser privacy signal is active. Advertising measurement remains off."},
  es:{title:"Tu privacidad",text:"Con tu permiso, usamos cookies de Meta y la API de conversiones para medir visitas y compras aprobadas y mejorar nuestros anuncios. Puedes comprar normalmente sin aceptar.",accept:"Aceptar medición",reject:"Rechazar",preferences:"Preferencias de cookies",policy:"Aviso de privacidad",gpc:"La señal de privacidad de tu navegador está activa. La medición publicitaria permanece desactivada."}
 }[lang];
 const locks=new Set(),sent=new Set();
 let choice=readChoice(),pixelPromise=null,pixelInitialized=false,panel=null,prefs=null,observer=null,activeCheckout=null,revocations=[],revocationFlush=null;
 function readConsentRecord(){try{const x=JSON.parse(localStorage.getItem(CONSENT_KEY)||"null");return x&&x.version===2&&typeof x.marketing==="boolean"&&Number.isFinite(x.at)&&x.at<=Date.now()&&(!x.marketing||UUID.test(String(x.token||"")))?x:null;}catch{return null;}}
 function readChoice(){const record=readConsentRecord();return record&&Date.now()-record.at<RETENTION?record:null;}
 function stored(storage,key){try{return storage.getItem(key);}catch{return null;}}
 function save(storage,key,value){try{storage.setItem(key,value);}catch{}}
 function newConsentToken(){
  try{
   if(typeof crypto.randomUUID==="function")return crypto.randomUUID();
   const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
   const hex=[...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");
   return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
  }catch{return null;}
 }
 function rememberChoice(marketing){
  const token=marketing?newConsentToken():null;
  choice={version:2,marketing:!!marketing&&UUID.test(String(token||"")),at:Date.now()};
  if(choice.marketing)choice.token=token;
  save(localStorage,CONSENT_KEY,JSON.stringify(choice));
  try{localStorage.removeItem(LEGACY_CONSENT_KEY);}catch{}
 }
 function pendingRevocations(){
  let saved=[];try{const x=JSON.parse(stored(localStorage,REVOCATION_KEY)||"[]");if(Array.isArray(x))saved=x;}catch{}
  const out=new Map();
  for(const x of [...saved,...revocations])if(x&&UUID.test(String(x.token||""))&&Number.isFinite(x.at)&&x.at<=Date.now()&&Date.now()-x.at<REVOCATION_RETENTION)out.set(x.token,{token:x.token,at:x.at});
  return [...out.values()];
 }
 function keepRevocations(items){
  revocations=items;
  if(items.length)save(localStorage,REVOCATION_KEY,JSON.stringify(items));
  else try{localStorage.removeItem(REVOCATION_KEY);}catch{}
 }
 function flushRevocations(){
  if(!production||!controlsPage)return Promise.resolve();
  if(revocationFlush)return revocationFlush;
  const pending=pendingRevocations();keepRevocations(pending);if(!pending.length)return Promise.resolve();
  revocationFlush=(async()=>{
   const attempted=new Set();
   for(;;){
    const item=pendingRevocations().find(x=>!attempted.has(x.token));if(!item)break;
    attempted.add(item.token);
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{
     const r=await fetch(API+"/api/analytics/consent/revoke",{method:"POST",mode:"cors",credentials:"omit",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify({consent_token:item.token}),signal:controller.signal});
     if(r.ok)keepRevocations(pendingRevocations().filter(x=>x.token!==item.token));
    }catch{}finally{clearTimeout(timeout);}
   }
  })().finally(()=>{revocationFlush=null;});
  return revocationFlush;
 }
 function queueRevocation(token){
  if(!production||!controlsPage||!UUID.test(String(token||"")))return;
  const pending=pendingRevocations();if(!pending.some(x=>x.token===token))pending.push({token,at:Date.now()});
  keepRevocations(pending);flushRevocations().catch(()=>{});
 }
 function revokeExpiredChoice(){
  const record=readConsentRecord();if(!record||Date.now()-record.at<RETENTION)return;
  if(record.marketing)queueRevocation(record.token);
  try{localStorage.removeItem(CONSENT_KEY);}catch{}
 }
 function forgetMetaCookies(){
  for(const name of ["_fbp","_fbc"]){
   document.cookie=name+"=; Max-Age=0; Path=/; SameSite=Lax";
   const host=location.hostname.split(".");
   for(let i=0;i<host.length-1;i++){const domain=host.slice(i).join(".");document.cookie=name+"=; Max-Age=0; Path=/; Domain="+domain+"; SameSite=Lax";document.cookie=name+"=; Max-Age=0; Path=/; Domain=."+domain+"; SameSite=Lax";}
  }
  try{localStorage.removeItem(PURCHASE_KEY);}catch{}
  try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith(SESSION_PREFIX))sessionStorage.removeItem(key);}}catch{}
 }
 function revokeBrowser(){if(typeof window.fbq==="function")window.fbq("consent","revoke");forgetMetaCookies();}
 function permitted(){
  if(choice?.marketing===true&&(navigator.globalPrivacyControl===true||Date.now()-choice.at>=RETENTION)){
   const previousToken=choice.token;rememberChoice(false);revokeBrowser();queueRevocation(previousToken);
  }
  return choice?.marketing===true&&choice.version===2&&UUID.test(String(choice.token||""))&&navigator.globalPrivacyControl!==true;
 }
 function readMetaCookie(name,pattern){
  try{const entry=document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));if(!entry)return null;const value=decodeURIComponent(entry.slice(name.length+1));return pattern.test(value)?value:null;}catch{return null;}
 }
 function checkoutContext(){
  if(!production||!isLanding||!permitted())return null;
  const pageUrl=location.origin+location.pathname.replace(/index\.html$/,"");
  const context={consent:true,consent_version:2,consent_at:choice.at,consent_token:choice.token,page_url:pageUrl};
  const fbp=readMetaCookie("_fbp",/^fb\.\d{1,3}\.\d{13}\.\d{1,30}$/),fbc=readMetaCookie("_fbc",/^fb\.\d{1,3}\.\d{13}\.[A-Za-z0-9_-]{1,500}$/);
  if(fbp)context.fbp=fbp;if(fbc)context.fbc=fbc;
  return context;
 }
 function loadPixel(){
  if(!production||!isLanding||!permitted()||!/^\d{5,25}$/.test(PIXEL_ID))return Promise.resolve(false);
  if(pixelPromise)return pixelPromise;
  pixelPromise=new Promise(resolve=>{
   if(!window.fbq){const n=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments);};n.push=n;n.loaded=true;n.version="2.0";n.queue=[];window.fbq=n;if(!window._fbq)window._fbq=n;}
   // Page views are explicit; internal history changes must not count as visits.
   window.fbq.disablePushState=true;
   window.fbq("consent","grant");
   if(!pixelInitialized){window.fbq("set","autoConfig",false,PIXEL_ID);window.fbq("init",PIXEL_ID);pixelInitialized=true;}
   if(typeof window.fbq.callMethod==="function"){resolve(true);return;}
   const script=document.createElement("script");script.async=true;script.src="https://connect.facebook.net/en_US/fbevents.js";script.dataset.lumenMeta="true";
   let settled=false;const finish=ok=>{if(settled)return;settled=true;clearTimeout(timeout);if(!ok){pixelPromise=null;script.remove();}resolve(ok);};
   const timeout=setTimeout(()=>finish(false),15000);
   script.onload=()=>finish(typeof window.fbq.callMethod==="function");
   script.onerror=()=>finish(false);
   document.head.appendChild(script);
  });
  return pixelPromise;
 }
 function eventId(){return "jd_"+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"_"+Math.random().toString(36).slice(2));}
 function payload(sku,amount){
  const value=Number(amount),expected=sku===BUNDLE?47.9:24.9;
  if(!SKU.test(String(sku))||!Number.isFinite(value)||Math.abs(value-expected)>.001)return null;
  return {content_ids:[String(sku)],content_type:"product",value,currency:"BRL",num_items:1};
 }
 async function once(name,data,key,session=false,id=eventId(),stillValid=null){
  if(!production||!permitted()||!isLanding||sent.has(key)||(session&&stored(sessionStorage,SESSION_PREFIX+key)))return false;
  const token=choice.token,lock=token+":"+key;if(locks.has(lock))return false;locks.add(lock);
  try{
   if(!await loadPixel()||!permitted()||choice.token!==token||sent.has(key)||(stillValid&&!stillValid()))return false;
   window.fbq("trackSingle",PIXEL_ID,name,data,{eventID:id});
   sent.add(key);if(session)save(sessionStorage,SESSION_PREFIX+key,String(Date.now()));
   return true;
  }catch{return false;}finally{locks.delete(lock);}
 }
 function viewContent(sku,amount){const data=payload(sku,amount);return data?once("ViewContent",data,"view:"+sku,true):Promise.resolve(false);}
 function checkoutReady(sku,amount){
  const data=payload(sku,amount);if(data)activeCheckout={sku,amount};if(!data||!permitted())return Promise.resolve(false);
  viewContent(sku,amount).catch(()=>{});
  return once("InitiateCheckout",data,"checkout:"+sku,true);
 }
 function purchaseLedger(){try{const x=JSON.parse(localStorage.getItem(PURCHASE_KEY)||"{}"),out={};for(const [key,at] of Object.entries(x)){if(/^[a-f0-9]{64}$/.test(key)&&Number.isFinite(at)&&at<=Date.now()&&Date.now()-at<RETENTION)out[key]=at;}return out;}catch{return {};}}
 function recentApproval(info){
  if(typeof info?.approved_at!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(info.approved_at))return false;
  const at=Date.parse(info.approved_at),age=Date.now()-at;
  return Number.isFinite(at)&&age>=0&&age<PURCHASE_WINDOW;
 }
 async function purchase(info){
  if(!permitted()||info?.status!=="approved"||info?.currency!=="BRL"||!/^\d+$/.test(String(info?.id||""))||!crypto.subtle||!recentApproval(info))return false;
  const token=choice.token,data=payload(info?.product?.id,info?.amount);if(!data)return false;
  const bytes=new TextEncoder().encode("lumen-juridica:purchase:"+String(info.id)+":"+info.product.id);
  const hash=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");
  const ledger=purchaseLedger();if(ledger[hash]||!permitted()||choice.token!==token)return false;
  const ok=await once("Purchase",data,"purchase:"+hash,false,"jd_purchase_"+hash,()=>recentApproval(info));
  if(ok){const latest=purchaseLedger();latest[hash]=Date.now();save(localStorage,PURCHASE_KEY,JSON.stringify(latest));}
  return ok;
 }
 function visibleOffer(){
  const offer=document.getElementById("pacote");if(!offer)return;
  const r=offer.getBoundingClientRect();if(r.bottom>0&&r.top<window.innerHeight)viewContent(BUNDLE,47.9).catch(()=>{});
 }
 function activate(){
  if(!permitted()){revokeBrowser();return;}
  if(!isLanding)return;
  if(pixelInitialized&&typeof window.fbq==="function")window.fbq("consent","grant");
  once("PageView",{},"page").catch(()=>{});
  visibleOffer();
  if(activeCheckout&&!document.getElementById("checkoutBackdrop")?.hidden&&document.getElementById("paymentBrick_container")?.hidden===false)checkoutReady(activeCheckout.sku,activeCheckout.amount).catch(()=>{});
 }
 function choose(marketing){
  const previousToken=choice?.marketing?choice.token:null;
  rememberChoice(marketing&&navigator.globalPrivacyControl!==true);
  // Capture the prior permission before replacing it; queued server events use that token.
  if(previousToken&&previousToken!==choice.token)queueRevocation(previousToken);
  panel.hidden=true;activate();
  if(panel.dataset.reopened==="true")prefs?.focus({preventScroll:true});
 }
 function preferences(){if(!panel)return;panel.hidden=false;panel.dataset.reopened="true";panel.querySelector("button")?.focus({preventScroll:true});}
 function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
 function buildConsent(){
  panel=make("section","lumen-cookie-panel");panel.id="lumenCookiePanel";panel.setAttribute("role","region");panel.setAttribute("aria-labelledby","lumenCookieTitle");panel.hidden=!!choice;
  const title=make("h2","",copy.title);title.id="lumenCookieTitle";
  const description=make("p","",copy.text),link=make("a","lumen-cookie-policy",copy.policy);link.href="/legal/"+lang+"/privacy.html#advertising-cookies";
  const actions=make("div","lumen-cookie-actions"),decline=make("button","",copy.reject),accept=make("button","",copy.accept);
  decline.type="button";accept.type="button";decline.addEventListener("click",()=>choose(false));accept.addEventListener("click",()=>choose(true));
  actions.append(decline,accept);panel.append(title,description,link,actions);
  if(navigator.globalPrivacyControl===true){accept.disabled=true;panel.append(make("p","lumen-cookie-signal",copy.gpc));}
  document.body.appendChild(panel);
  prefs=make("button","lumen-cookie-preferences",copy.preferences);prefs.type="button";prefs.setAttribute("aria-controls",panel.id);prefs.addEventListener("click",preferences);
  const target=document.querySelector("footer .foot-links")||document.querySelector("footer .inner")||document.querySelector("footer");target?.appendChild(prefs);
  document.querySelectorAll("[data-cookie-preferences]").forEach(el=>el.addEventListener("click",preferences));
 }
 window.LumenAnalytics=Object.freeze({viewContent,checkoutReady,checkoutContext,purchase,preferences});
 try{localStorage.removeItem(LEGACY_CONSENT_KEY);}catch{}
 buildConsent();
 if(isLanding&&"IntersectionObserver" in window){
  const offer=document.getElementById("pacote");if(offer){observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)viewContent(BUNDLE,47.9).catch(()=>{});},{threshold:.15});observer.observe(offer);}
 }
 window.addEventListener("storage",event=>{
  if(event.key===REVOCATION_KEY){flushRevocations().catch(()=>{});return;}
  if(event.key!==CONSENT_KEY&&event.key!==null)return;
  const previousToken=choice?.marketing?choice.token:null;choice=readChoice();
  if(previousToken&&previousToken!==choice?.token)queueRevocation(previousToken);
  revokeExpiredChoice();
  if(panel)panel.hidden=!!choice;activate();
 });
 window.addEventListener("online",()=>flushRevocations().catch(()=>{}));
 window.addEventListener("pageshow",()=>{activate();flushRevocations().catch(()=>{});});
 window.addEventListener("focus",()=>{if(!permitted())revokeBrowser();});
 revokeExpiredChoice();activate();flushRevocations().catch(()=>{});
})();
