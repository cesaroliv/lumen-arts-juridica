/* Lumen Arts — optional Meta measurement. No remote code before opt-in. */
(()=>{"use strict";
 const PIXEL_ID="2220026795560504";
 const CONSENT_KEY="lumen-juridica-consent-v1",PURCHASE_KEY="lumen-juridica-meta-purchases-v1",SESSION_PREFIX="lumen-juridica-meta:";
 const DAY=86400000,RETENTION=180*DAY,BUNDLE="art-justice-four-16k";
 const SKU=/^art-justice-(?:(?:0[1-9]|10)-[a-z0-9-]+|four-16k)$/;
 const production=location.hostname==="juridica.lumenanima.com";
 const isLanding=/^\/(?:(?:en|es)\/)?(?:index\.html)?$/.test(location.pathname);
 const lang=/^es/i.test(document.documentElement.lang)?"es":/^en/i.test(document.documentElement.lang)?"en":"pt";
 const copy={
  pt:{title:"Sua privacidade",text:"Com sua permissão, usamos cookies da Meta para medir visitas e compras e melhorar nossos anúncios. Você pode comprar normalmente sem aceitar.",accept:"Aceitar medição",reject:"Recusar",preferences:"Preferências de cookies",policy:"Aviso de privacidade",gpc:"O sinal de privacidade do seu navegador está ativo. A medição publicitária permanece desativada."},
  en:{title:"Your privacy",text:"With your permission, we use Meta cookies to measure visits and purchases and improve our ads. You can shop normally without accepting.",accept:"Allow measurement",reject:"Decline",preferences:"Cookie preferences",policy:"Privacy notice",gpc:"Your browser privacy signal is active. Advertising measurement remains off."},
  es:{title:"Tu privacidad",text:"Con tu permiso, usamos cookies de Meta para medir visitas y compras y mejorar nuestros anuncios. Puedes comprar normalmente sin aceptar.",accept:"Aceptar medición",reject:"Rechazar",preferences:"Preferencias de cookies",policy:"Aviso de privacidad",gpc:"La señal de privacidad de tu navegador está activa. La medición publicitaria permanece desactivada."}
 }[lang];
 const locks=new Set(),sent=new Set();
 let choice=readChoice(),pixelPromise=null,pixelInitialized=false,panel=null,prefs=null,observer=null,activeCheckout=null;
 function readChoice(){try{const x=JSON.parse(localStorage.getItem(CONSENT_KEY)||"null");return x&&x.version===1&&typeof x.marketing==="boolean"&&Number.isFinite(x.at)&&x.at<=Date.now()&&Date.now()-x.at<RETENTION?x:null;}catch{return null;}}
 function permitted(){return choice?.marketing===true&&navigator.globalPrivacyControl!==true;}
 function rememberChoice(marketing){choice={version:1,marketing:!!marketing,at:Date.now()};try{localStorage.setItem(CONSENT_KEY,JSON.stringify(choice));}catch{}}
 function stored(storage,key){try{return storage.getItem(key);}catch{return null;}}
 function save(storage,key,value){try{storage.setItem(key,value);}catch{}}
 function forgetMetaCookies(){
  for(const name of ["_fbp","_fbc"]){
   document.cookie=name+"=; Max-Age=0; Path=/; SameSite=Lax";
   const host=location.hostname.split(".");
   for(let i=0;i<host.length-1;i++){const domain=host.slice(i).join(".");document.cookie=name+"=; Max-Age=0; Path=/; Domain="+domain+"; SameSite=Lax";document.cookie=name+"=; Max-Age=0; Path=/; Domain=."+domain+"; SameSite=Lax";}
  }
  try{localStorage.removeItem(PURCHASE_KEY);}catch{}
  try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith(SESSION_PREFIX))sessionStorage.removeItem(key);}}catch{}
 }
 function revoke(){if(typeof window.fbq==="function")window.fbq("consent","revoke");forgetMetaCookies();}
 function loadPixel(){
  if(!production||!isLanding||!permitted()||!/^\d{5,25}$/.test(PIXEL_ID))return Promise.resolve(false);
  if(pixelPromise)return pixelPromise;
  pixelPromise=new Promise(resolve=>{
   if(!window.fbq){const n=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments);};n.push=n;n.loaded=true;n.version="2.0";n.queue=[];window.fbq=n;if(!window._fbq)window._fbq=n;}
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
 async function once(name,data,key,session=false,id=eventId()){
  if(!production||!permitted()||!isLanding||sent.has(key)||locks.has(key)||(session&&stored(sessionStorage,SESSION_PREFIX+key)))return false;
  locks.add(key);
  try{
   if(!await loadPixel()||!permitted())return false;
   window.fbq("trackSingle",PIXEL_ID,name,data,{eventID:id});
   sent.add(key);if(session)save(sessionStorage,SESSION_PREFIX+key,String(Date.now()));
   return true;
  }catch{return false;}finally{locks.delete(key);}
 }
 function viewContent(sku,amount){const data=payload(sku,amount);return data?once("ViewContent",data,"view:"+sku,true):Promise.resolve(false);}
 function checkoutReady(sku,amount){
  const data=payload(sku,amount);if(data)activeCheckout={sku,amount};if(!data||!permitted())return Promise.resolve(false);
  viewContent(sku,amount).catch(()=>{});
  return once("InitiateCheckout",data,"checkout:"+sku,true);
 }
 function purchaseLedger(){try{const x=JSON.parse(localStorage.getItem(PURCHASE_KEY)||"{}"),out={};for(const [key,at] of Object.entries(x)){if(/^[a-f0-9]{64}$/.test(key)&&Number.isFinite(at)&&at<=Date.now()&&Date.now()-at<RETENTION)out[key]=at;}return out;}catch{return {};}}
 async function purchase(info){
  if(!permitted()||info?.status!=="approved"||info?.currency!=="BRL"||!/^\d+$/.test(String(info?.id||""))||!crypto.subtle)return false;
  const data=payload(info?.product?.id,info?.amount);if(!data)return false;
  const bytes=new TextEncoder().encode("lumen-juridica:purchase:"+String(info.id)+":"+info.product.id);
  const hash=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");
  const ledger=purchaseLedger();if(ledger[hash]||!permitted())return false;
  const ok=await once("Purchase",data,"purchase:"+hash,false,"jd_purchase_"+hash);
  if(ok){const latest=purchaseLedger();latest[hash]=Date.now();save(localStorage,PURCHASE_KEY,JSON.stringify(latest));}
  return ok;
 }
 function visibleOffer(){
  const offer=document.getElementById("pacote");if(!offer)return;
  const r=offer.getBoundingClientRect();if(r.bottom>0&&r.top<window.innerHeight)viewContent(BUNDLE,47.9).catch(()=>{});
 }
 function activate(){
  if(!permitted()){revoke();return;}
  if(!isLanding)return;
  if(pixelInitialized&&typeof window.fbq==="function")window.fbq("consent","grant");
  once("PageView",{},"page").catch(()=>{});
  visibleOffer();
  if(activeCheckout&&!document.getElementById("checkoutBackdrop")?.hidden&&document.getElementById("paymentBrick_container")?.hidden===false)checkoutReady(activeCheckout.sku,activeCheckout.amount).catch(()=>{});
 }
 function choose(marketing){
  rememberChoice(marketing&&navigator.globalPrivacyControl!==true);
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
 window.LumenAnalytics=Object.freeze({viewContent,checkoutReady,purchase,preferences});
 buildConsent();
 if(isLanding&&"IntersectionObserver" in window){
  const offer=document.getElementById("pacote");if(offer){observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)viewContent(BUNDLE,47.9).catch(()=>{});},{threshold:.15});observer.observe(offer);}
 }
 window.addEventListener("storage",event=>{if(event.key!==CONSENT_KEY&&event.key!==null)return;choice=readChoice();if(panel)panel.hidden=!!choice;activate();});
 activate();
})();
