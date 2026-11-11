/* Lumen Arts — geographic catalogue. Language formats text; the server selects prices. */
(()=>{"use strict";
 const API="https://lumen-digital-checkout.ccoliveira1.workers.dev/api/paypal/config",BUNDLE="art-justice-four-16k";
 const IDS=[BUNDLE,"art-justice-01-dama-em-relevo","art-justice-02-equilibrio-dourado","art-justice-03-guardia-da-lei","art-justice-04-justica-soberana","art-justice-05-balanca-livro","art-justice-06-balanca-dourada","art-justice-07-emblema-justica","art-justice-08-balanca-tribunal","art-justice-09-martelo-tribunal","art-justice-10-martelo-marmore"];
 const VERSION=/^[A-Za-z0-9_.-]{1,80}$/,listeners=new Set();
 let catalog=null,inflight=null,failed=false,domReady=document.readyState!=="loading";
 function validMoney(value,currency){const n=Number(value);return["BRL","USD"].includes(currency)&&Number.isFinite(n)&&n>0&&Number.isSafeInteger(Math.round(n*100))&&Math.abs(n*100-Math.round(n*100))<.000001;}
 function validate(input){
  const country=typeof input?.country==="string"&&/^[A-Z]{2}$/.test(input.country)?input.country:null,regional=input?.regional_currency_enabled,market=regional===false||country==="BR"?"BR":"INTL",currency=market==="BR"?"BRL":"USD";
  if(!input||typeof regional!=="boolean"||input.market!==market||input.currency!==currency||!VERSION.test(String(input.pricing_version||""))||input.paypal?.currency!==currency||!["live","sandbox"].includes(input.paypal?.mode))throw Error("Invalid regional catalogue");
  const products={};
  for(const id of IDS){const p=input.products?.[id];if(!p||!validMoney(p.price,currency)||!Number.isSafeInteger(p.amount_minor)||p.amount_minor!==Math.round(Number(p.price)*100))throw Error("Invalid product price");products[id]=Object.freeze({id,name:String(p.name||""),price:Number(p.price),amount_minor:p.amount_minor});}
  return Object.freeze({country,market,currency,regional_currency_enabled:regional,pricing_version:String(input.pricing_version),individualSalesEnabled:input.individualSalesEnabled===true,products:Object.freeze(products),paypal:Object.freeze({enabled:input.paypal.enabled===true,clientId:String(input.paypal.clientId||""),mode:input.paypal.mode,currency})});
 }
 function format(value,currency,language=document.documentElement.lang||"en"){
  if(!validMoney(value,currency)&&Number(value)!==0)return"—";
  if(!["BRL","USD"].includes(currency))return"—";
  try{return new Intl.NumberFormat(language,{style:"currency",currency}).formatToParts(Number(value)).map(p=>p.type==="currency"?(currency==="USD"?"US$":"R$"):p.value).join("");}catch{return(currency==="USD"?"US$ ":"R$ ")+Number(value).toFixed(2);}
 }
 function amount(key,c=catalog){
  if(!c)return null;if(key==="bundle")return c.products[BUNDLE].price;
  if(key==="individual")return c.products[IDS[1]].price;
  const total=IDS.slice(1).reduce((sum,id)=>sum+c.products[id].amount_minor,0)/100;
  if(key==="sum")return total;if(key==="saving")return(total*100-c.products[BUNDLE].amount_minor)/100;
  return c.products[key]?.price??null;
 }
 function render(){
  if(!domReady)return;
  document.querySelectorAll("[data-jd-price]").forEach(node=>{const n=amount(node.dataset.jdPrice);node.textContent=catalog&&n!==null?format(n,catalog.currency):"—";});
  document.querySelectorAll("[data-jd-currency]").forEach(node=>{node.textContent=catalog?.currency||"";});
  document.querySelectorAll("[data-jd-price-label]").forEach(node=>{const n=amount(node.dataset.jdPriceLabel),template=node.dataset.jdPriceAriaTemplate;if(template)node.setAttribute("aria-label",template.replace(/\{price\}/g,catalog&&n!==null?format(n,catalog.currency):"—"));});
  document.querySelectorAll("[data-jd-pricing-pending]").forEach(node=>{node.hidden=!!catalog;});
  document.querySelectorAll("[data-jd-pricing-ready]").forEach(node=>{node.hidden=!catalog;});
  const language=/^pt/i.test(document.documentElement.lang)?"pt":/^es/i.test(document.documentElement.lang)?"es":"en";
  const message=failed?{pt:"Não foi possível consultar o preço agora. Tente novamente.",en:"The price could not be loaded. Please try again.",es:"No se pudo consultar el precio. Inténtalo de nuevo."}[language]:"";
  document.querySelectorAll("[data-jd-pricing-status]").forEach(node=>{node.textContent=message;});
 }
 function publish(value){catalog=value;render();for(const listener of listeners)try{listener(value);}catch{}}
 function subscribe(listener){if(typeof listener!=="function")return()=>{};listeners.add(listener);if(catalog)try{listener(catalog);}catch{}return()=>listeners.delete(listener);}
 async function load({refresh=false}={}){
  if(inflight)return inflight;if(catalog&&!refresh)return catalog;
  inflight=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   try{const response=await fetch(API,{headers:{accept:"application/json"},cache:"no-store",signal:controller.signal});if(!response.ok)throw Error("Catalogue unavailable");const value=validate(await response.json());failed=false;publish(value);return value;}
   catch(error){failed=true;publish(null);throw error;}
   finally{clearTimeout(timer);}
  })();
  try{return await inflight;}finally{inflight=null;}
 }
 window.LumenPricing=Object.freeze({load,current:()=>catalog,subscribe,format,amount,validMoney});
 if(!domReady)document.addEventListener("DOMContentLoaded",()=>{domReady=true;render();},{once:true});else render();
 load().catch(()=>{});
})();

