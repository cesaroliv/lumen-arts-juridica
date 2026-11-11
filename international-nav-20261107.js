/* Language navigation: English by default; explicit PT/EN/ES choices and attribution are preserved. */
(()=>{
"use strict";
const routes={pt:"/",en:"/en/",es:"/es/"};
function lang(v){const s=String(v||"").toLowerCase().trim();return /^pt(?:-|$)/.test(s)?"pt":/^en(?:-|$)/.test(s)?"en":/^es(?:-|$)/.test(s)?"es":null;}
const u=new URL(location.href);
const explicit=lang(u.searchParams.get("lang"))||lang(u.searchParams.get("locale"));
const selectedPath=location.pathname.startsWith("/en/")?"en":location.pathname.startsWith("/es/")?"es":"pt";
const desired=explicit||(selectedPath==="pt"?"en":selectedPath);
// Runs in the head before checkout/analytics. Keep the full query and hash,
// including attribution and any existing payment-return parameters.
if(desired!==selectedPath){
 u.pathname=routes[desired];
 location.replace(u.toString());
 return;
}
function bindLanguageLinks(){
 document.querySelectorAll("a[data-language-switch]").forEach(a=>{
  a.addEventListener("click",event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
   const to=lang(a.dataset.languageSwitch),path=routes[to];
   if(!path)return;
   const target=new URL(path,location.origin);
   // The root defaults to English unless Portuguese was explicitly chosen.
   if(to==="pt")target.searchParams.set("lang","pt");
   const params=new URLSearchParams(location.search);
   for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){
    const val=params.get(key);
    if(val&&/^[A-Za-z0-9_.-]{1,64}$/.test(val))target.searchParams.set(key,val);
   }
   const fbclid=params.get("fbclid");
   if(fbclid&&/^[A-Za-z0-9_-]{1,500}$/.test(fbclid))target.searchParams.set("fbclid",fbclid);
   if(location.hash)target.hash=location.hash;
   event.preventDefault();
   location.assign(target.toString());
  });
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindLanguageLinks,{once:true});
else bindLanguageLinks();
})();
