(()=>{"use strict";
const video=document.getElementById("justiceHeroVideo");
const reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(video){video.muted=true;video.playsInline=true;
  if(reduced){video.pause();}
  else{
    const play=()=>{if(!document.hidden)video.play().catch(()=>{});};
    document.addEventListener("visibilitychange",()=>{if(document.hidden)video.pause();else play();});
    if("IntersectionObserver" in window){
      const ob=new IntersectionObserver(es=>{const visible=es.some(x=>x.isIntersecting);if(visible&&!document.hidden)play();else video.pause();},{threshold:0.06});
      ob.observe(video);
    }else play();
  }
}
const cards=[...document.querySelectorAll(".art-card,.bundle-stage,.experience-grid article")];
if(!reduced&&"IntersectionObserver" in window&&cards.length){
  document.documentElement.classList.add("cinematic-motion-ready");
  const observer=new IntersectionObserver((entries,ob)=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add("cinematic-revealed");ob.unobserve(e.target);}},{threshold:0.04,rootMargin:"0px 0px 80px 0px"});
  for(const card of cards)observer.observe(card);
}
})();