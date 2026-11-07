/* Minimal language navigation and canonical routing; preserves UTM attribution and #anchors. */
(()=>{"use strict";
const routes={pt:"/",en:"/en/",es:"/es/"};
function lang(v){const s=String(v||"").toLowerCase().trim();return /^pt(?:-|$)/.test(s)?"pt":/^en(?:-|$)/.test(s)?"en":/^es(?:-|$)/.test(s)?"es":null;}
const u=new URL(location.href),explicit=lang(u.searchParams.get("lang"))||lang(u.searchParams.get("locale"));
const selectedPath=location.pathname.startsWith("/en/")?"en":location.pathname.startsWith("/es/")?"es":"pt";
// Redirect only explicit old-style ?lang links (e.g. earlier Payment Brick marketing links).
// Never redirect Portuguese-origin Pinterest buyers on browser language alone.
if(explicit&&routes[explicit]!==routes[selectedPath]){
 u.pathname=routes[explicit];
 location.replace(u.toString());
 return;
}
document.querySelectorAll("a[data-language-switch]").forEach(a=>{
 a.addEventListener("click",event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
  const to=lang(a.dataset.languageSwitch),path=routes[to];
  if(!path)return;
  const target=new URL(path,location.origin);
  const params=new URLSearchParams(location.search);
  for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){
   const val=params.get(key);
   if(val&&/^[A-Za-z0-9_.-]{1,64}$/.test(val))target.searchParams.set(key,val);
  }
  if(location.hash)target.hash=location.hash;
  event.preventDefault();
  location.assign(target.toString());
 });
});
})();
