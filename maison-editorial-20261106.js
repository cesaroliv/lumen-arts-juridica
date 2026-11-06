/* MAISON / JUSTIÇA DOURADA — interactive showroom; no third-party runtime or canvas. */
(()=>{"use strict";
const root=document.getElementById("ambientes");
if(!root)return;
const scene=document.getElementById("maison-room");
const sceneImage=document.getElementById("maison-room-scene");
const artImage=document.getElementById("maison-room-art");
const sceneName=document.getElementById("maison-scene-name");
const selectionTitle=document.getElementById("maison-selection-title");
const selectionIndex=document.getElementById("maison-selection-index");
const selectionSubtitle=document.getElementById("maison-selection-subtitle");
const individualCTA=document.querySelector(".maison-individual-buy");
const selectors=[...root.querySelectorAll(".maison-work-item")];
const buttons=[...root.querySelectorAll(".maison-room-option")];
const slider=document.getElementById("maison-carousel");
const count=document.getElementById("maison-carousel-count");
const items=[...document.querySelectorAll(".maison-catalogue .art-card")];
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
const rooms={
wall:{src:"assets/maison-office-wall-20261106.webp",width:682,height:650,name:"PAREDE PRINCIPAL",desc:"na parede principal de um escritório"},
office:{src:"assets/maison-office-trio-20261106.webp",width:355,height:239,name:"ESCRITÓRIO",desc:"em uma composição de quadros no escritório"},
desk:{src:"assets/maison-desk-frame-20261106.webp",width:363,height:253,name:"QUADRO DE MESA",desc:"em um pequeno quadro sobre a mesa"}
};
const arts=selectors.map((control,i)=>{
const sku=control.dataset.sku;
const card=items.find(el=>el.querySelector(".checkout-trigger")?.dataset.sku===sku);
const image=control.querySelector("img");
const name=card?.querySelector("h3")?.textContent?.trim();
const description=card?.querySelector(".card-body>p")?.textContent?.trim();
return {sku,i,image:image?.getAttribute("src"),name,description};
});
if(arts.length!==10||arts.some(x=>!x.sku||!x.name||!x.image||!x.description)||new Set(arts.map(x=>x.sku)).size!==10){console.warn("O visualizador não encontrou as dez obras atuais.");return;}
let selected=0,roomName="wall",roomNonce=0;
function updateDescription(){
scene.setAttribute("aria-label","Prévia ilustrativa de "+arts[selected].name+" "+rooms[roomName].desc);
}
function choose(index,focus,fromUser){
selected=(index+arts.length)%arts.length;
const art=arts[selected];
selectors.forEach((btn,i)=>{const active=i===selected;btn.classList.toggle("is-selected",active);btn.setAttribute("aria-pressed",String(active));});
artImage.src=art.image;artImage.alt="";
selectionTitle.textContent=art.name;
selectionIndex.textContent=String(selected+1).padStart(2,"0")+" / 10";
selectionSubtitle.textContent=art.description;
individualCTA.dataset.sku=art.sku;
individualCTA.setAttribute("aria-label","Comprar "+art.name+" por R$ 24,90. Pagamento seguro nesta página.");
updateDescription();
if(focus)selectors[selected].focus({preventScroll:true});
if(fromUser)selectors[selected].scrollIntoView({behavior:reduced.matches?"instant":"smooth",inline:"nearest",block:"nearest"});
}
async function changeRoom(next){
if(!rooms[next]||roomName===next)return;
roomName=next;const token=++roomNonce;const data=rooms[next];
buttons.forEach(b=>{const active=b.dataset.room===next;b.setAttribute("aria-pressed",String(active));b.classList.toggle("is-current",active);});
scene.classList.add("is-switching");
const preload=new Image();
preload.src=data.src;
try{await preload.decode();}catch{}
if(token!==roomNonce)return;
scene.className="maison-room maison-room--"+next;
sceneImage.src=data.src;sceneImage.width=data.width;sceneImage.height=data.height;
sceneName.textContent=data.name;
updateDescription();
window.requestAnimationFrame(()=>{scene.classList.remove("is-switching");});
}
selectors.forEach((b,i)=>{
b.addEventListener("click",()=>choose(i,false,true));
b.addEventListener("keydown",e=>{let index=null;if(e.key==="ArrowRight")index=i+1;if(e.key==="ArrowLeft")index=i-1;if(e.key==="Home")index=0;if(e.key==="End")index=9;if(index!==null){e.preventDefault();choose(index,true,true);}});
});
buttons.forEach(b=>b.addEventListener("click",()=>changeRoom(b.dataset.room)));
choose(0,false,false);
const cardWidth=()=>items[0]?.getBoundingClientRect().width||300;
function move(direction){if(!slider)return;slider.scrollBy({left:direction*(cardWidth()+parseFloat(getComputedStyle(slider.querySelector(".art-grid")).gap||"24")*1.1),behavior:reduced.matches?"instant":"smooth"});}
document.getElementById("maison-previous")?.addEventListener("click",()=>move(-1));
document.getElementById("maison-next")?.addEventListener("click",()=>move(1));
slider?.addEventListener("keydown",e=>{if(e.target!==slider)return;if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();move(e.key==="ArrowRight"?1:-1)}});
function updateCounter(){
if(!slider||!count)return;
const left=slider.scrollLeft;
const step=Math.max(1,cardWidth()+parseFloat(getComputedStyle(slider.querySelector(".art-grid")).gap||"24"));
count.textContent=String(Math.max(1,Math.min(10,Math.round(left/step)+1))).padStart(2,"0")+" — 10";
}
slider?.addEventListener("scroll",updateCounter,{passive:true});
updateCounter();
})();