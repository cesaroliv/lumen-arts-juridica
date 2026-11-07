/* Galeria Justiça Dourada — apenas carrossel; ateliê de mockups removido a pedido do proprietário. */
(()=>{"use strict";
const slider=document.getElementById("maison-carousel");
const count=document.getElementById("maison-carousel-count");
const previous=document.getElementById("maison-previous");
const next=document.getElementById("maison-next");
if(!slider)return;
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
const cards=[...slider.querySelectorAll(".art-card")];
if(cards.length!==10)return;
const gap=()=>{const grid=slider.querySelector(".art-grid");const style=grid?getComputedStyle(grid):null;return Number.parseFloat(style?.columnGap||style?.gap||"24")||24;};
const step=()=>cards[0].getBoundingClientRect().width+gap();
function move(n){slider.scrollBy({left:n*step(),behavior:reduced.matches?"instant":"smooth"});}
function updateCount(){const index=Math.min(cards.length,Math.max(1,Math.round(slider.scrollLeft/Math.max(1,step()))+1));if(count)count.textContent=String(index).padStart(2,"0")+" — "+String(cards.length).padStart(2,"0");}
previous?.addEventListener("click",()=>move(-1));
next?.addEventListener("click",()=>move(1));
slider.addEventListener("scroll",updateCount,{passive:true});
slider.addEventListener("keydown",e=>{if(e.target!==slider)return;if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();move(e.key==="ArrowRight"?1:-1);}});
updateCount();
})();