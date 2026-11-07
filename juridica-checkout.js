(()=>{"use strict";
const API="https://lumen-digital-checkout.ccoliveira1.workers.dev";
const BUNDLE_ID="art-justice-four-16k";
const expectedPrice=sku=>sku===BUNDLE_ID?47.90:24.90;
const SKU=/^art-justice-(?:(?:0[1-9]|10)-[a-z0-9-]+|four-16k)$/;
const el=id=>document.getElementById(id);
const triggers=[...document.querySelectorAll(".checkout-trigger")];
const backdrop=el("checkoutBackdrop"),dialog=el("checkoutDialog"),message=el("checkoutMessage"),galleryStatus=el("galleryCheckoutStatus");
const setMessage=(s,type="")=>{message.textContent=s||"";message.className="payment-message "+type;message.hidden=!s;};
let mp=null,bricks=null,config=null,paymentController=null,statusController=null;
let currentSku="",paymentId="",orderAccess="",timer=null,epoch=0,opening=false,submitting=false,lastFocus=null;
const money=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const setBusy=(state,info)=>{triggers.forEach(b=>b.disabled=state);galleryStatus.textContent=info||"";const offerStatus=el("bundleCheckoutStatus");if(offerStatus)offerStatus.textContent=info||"";};
async function readConfig(){
 const r=await fetch(API+"/api/config",{headers:{accept:"application/json"},cache:"no-store"});
 if(!r.ok)throw Error("Não foi possível consultar o pagamento.");
 const c=await r.json();
 if(!c.publicKey||!c.individualSalesEnabled||!["BRL"].includes(c.currency))throw Error("Pagamento indisponível.");
 for(const b of triggers){const sku=b.dataset.sku;if(!SKU.test(sku)||Math.abs(Number(c.products?.[sku]?.price)-expectedPrice(sku))>.001)throw Error("Preço indisponível. Nenhuma cobrança será iniciada.");}
 if(!window.MercadoPago)throw Error("O módulo de pagamento seguro não carregou.");
 config=c; if(!mp){mp=new MercadoPago(config.publicKey,{locale:"pt-BR"});bricks=mp.bricks();}
 return c;
}
async function unmount(){
 try{await paymentController?.unmount();}catch{}
 try{await statusController?.unmount();}catch{}
 paymentController=null;statusController=null;
 el("paymentBrick_container").replaceChildren();el("statusScreenBrick_container").replaceChildren();
}
function close(){
 if(timer)clearTimeout(timer);timer=null;epoch++;
 unmount().catch(()=>{});
 backdrop.hidden=true;document.body.classList.remove("checkout-open");
 currentSku="";opening=false;submitting=false;paymentId="";orderAccess="";
 if(lastFocus)lastFocus.focus({preventScroll:true});
}
function openDisplay(){
 lastFocus=document.activeElement;backdrop.hidden=false;document.body.classList.add("checkout-open");
 el("checkoutClose").focus({preventScroll:true});
}
function validDownload(url){
 try{const u=new URL(url);return u.origin===API&&/^\/api\/(download-bundle|download)\/[0-9]+\/[0-9]+$/.test(u.pathname);}catch{return false;}
}
function approved(info){
 clearTimeout(timer);timer=null;el("statusArea").hidden=true;el("paymentBrick_container").hidden=true;
 const area=el("checkoutSuccess");area.hidden=false;area.replaceChildren();
 const heading=document.createElement("h3");heading.textContent="Pagamento aprovado!";
 const desc=document.createElement("p");desc.textContent="Sua edição digital está disponível para download. Uma confirmação também pode chegar ao e-mail informado no pagamento.";
 area.append(heading,desc);
 const bundles=[...(Array.isArray(info.bundles)?info.bundles:[])].filter(x=>validDownload(x.url));
 for(const b of bundles){const a=document.createElement("a");a.href=b.url;a.rel="noopener noreferrer";a.className="checkout-download";a.textContent="Baixar "+(b.label||"sua obra")+" ↓";area.appendChild(a);}
 if(!bundles.length){const p=document.createElement("p");p.textContent="O pagamento foi aprovado, mas ainda não foi possível liberar o arquivo nesta tela. Entre em contato com nosso suporte.";area.append(p);}
 try{sessionStorage.removeItem("juridica-order-pending");}catch{}
 setMessage("");
}
async function queryPayment(id,token){
 const r=await fetch(API+"/api/payments/"+encodeURIComponent(id),{headers:{accept:"application/json","x-order-access":token},cache:"no-store"});
 if(!r.ok)throw Error("Não foi possível consultar o pagamento.");
 const data=await r.json();
 if(data.product?.id!==currentSku)throw Error("Identificação da obra divergente.");
 if(data.status==="approved"){if(Math.abs(Number(data.amount)-expectedPrice(currentSku))>.001)throw Error("Valor aprovado divergente.");approved(data);return "approved";}
 if(["rejected","cancelled","refunded","charged_back"].includes(data.status)){
  setMessage("Pagamento não aprovado. Você pode fechar esta janela e tentar novamente se desejar.","error");return "failed";
 }
 return "pending";
}
async function pollPayment(id,token,run,attempt=0){
 if(run!==epoch||backdrop.hidden)return;
 try{const status=await queryPayment(id,token);if(status!=="pending")return;}catch(e){if(attempt===0)setMessage("Pedido criado. A confirmação está sendo consultada; não faça outro pagamento.", "note");}
 if(attempt<119&&run===epoch)timer=setTimeout(()=>pollPayment(id,token,run,attempt+1),3000);
 else setMessage("Pagamento aguardando confirmação. Guarde o comprovante; uma confirmação também poderá chegar por e-mail.","note");
}
async function showStatus(id,token){
 const run=epoch;
 el("paymentBrick_container").hidden=true;el("statusArea").hidden=false;
 setMessage("Pedido iniciado. Aguardando confirmação do Mercado Pago…","note");
 try{
  statusController=await bricks.create("statusScreen","statusScreenBrick_container",{
   initialization:{paymentId:String(id)},
   customization:{backUrls:{return:location.href,error:location.href},visual:{showExternalReference:true}},
   callbacks:{onReady:()=>{},onError:error=>{console.error("statusScreen não carregou",error);setMessage("Pedido criado. Estamos verificando a confirmação do pagamento.","note");}}
  });
 }catch(e){console.error("Falha ao mostrar status",e);setMessage("Pedido iniciado. Estamos verificando a confirmação, não é necessário repetir o pagamento.","note");}
 pollPayment(id,token,run);
}
async function open(sku){
 if(opening||!SKU.test(sku))return;
 const pending=pendingOrder();
 if(pending&&pending.sku===sku){await resumePendingOrder();return;}
 opening=true;currentSku=sku;epoch++;paymentId="";orderAccess="";submitting=false;
 openDisplay();
 el("statusArea").hidden=true;el("checkoutSuccess").hidden=true;el("paymentBrick_container").hidden=false;
 setMessage("Conectando ao Mercado Pago…","note");
 try{
  await readConfig();
  if(backdrop.hidden||currentSku!==sku)return;
  const product=config.products[sku];
  el("checkoutProductName").textContent=product.name;
  el("checkoutProductPrice").textContent=money(product.price);
  await unmount();
  paymentController=await bricks.create("payment","paymentBrick_container",{
   initialization:{amount:product.price},
   customization:{
    paymentMethods:{creditCard:"all",debitCard:"all",bankTransfer:"all",ticket:"all"},
    visual:{style:{theme:"default"}}
   },
   callbacks:{
    onReady:()=>setMessage(""),
    onError:error=>{console.error("Mercado Pago Payment Brick",error);setMessage("Não foi possível carregar essa opção. Selecione outro meio de pagamento.","error");},
    onSubmit:({selectedPaymentMethod,formData})=>new Promise((resolve,reject)=>{
      if(submitting||!formData){reject(Error("Pedido já está sendo processado."));return;}
      submitting=true;
      const idem=crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(16).slice(2);
      const utm=new URLSearchParams(location.search),attribution={utm_source:"juridica.lumenanima.com",utm_medium:"referral",utm_campaign:"justica_dourada_16k_20261106",utm_content:sku};
      for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){const val=utm.get(key);if(val&&/^[A-Za-z0-9_.-]{1,64}$/.test(val))attribution[key]=val;}
      fetch(API+"/api/payments",{method:"POST",headers:{"content-type":"application/json","x-idempotency-key":idem},body:JSON.stringify({productId:sku,selectedPaymentMethod,formData,locale:"pt",attribution})})
       .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!/^\d+$/.test(String(d.id||"")))throw Error(d.message||d.error||"Pagamento não concluído");if(!/^[a-f0-9]{64}$/.test(String(d.order_access||"")))throw Error("Código de acesso ao pedido ausente");paymentId=String(d.id);orderAccess=d.order_access;
        try{sessionStorage.setItem("juridica-order-pending",JSON.stringify({id:paymentId,sku,token:orderAccess,at:Date.now()}));}catch{}
        resolve(); await showStatus(paymentId,orderAccess);
       }).catch(err=>{submitting=false;setMessage("Pagamento não concluído: "+(err.message||"Tente novamente."),"error");reject(err);});
    })
   }
  });
 }catch(e){setMessage(e.message||"Pagamento temporariamente indisponível. Nenhuma cobrança foi realizada.","error");}
 finally{opening=false;}
}
function pendingOrder(){
 try{
  const r=sessionStorage.getItem("juridica-order-pending");if(!r)return null;
  const x=JSON.parse(r);
  if(!x||!/^\d+$/.test(String(x.id))||!SKU.test(String(x.sku))||!/^[a-f0-9]{64}$/.test(String(x.token))||!Number.isFinite(Number(x.at))||Date.now()-Number(x.at)>72*60*60*1000){
    sessionStorage.removeItem("juridica-order-pending");return null;
  }
  return x;
 }catch{return null;}
}
async function resumePendingOrder(){
 const previous=pendingOrder();
 if(!previous||!backdrop.hidden||!config?.products?.[previous.sku])return;
 currentSku=previous.sku;paymentId=String(previous.id);orderAccess=previous.token;
 opening=true;epoch++;openDisplay();
 el("checkoutProductName").textContent=config.products[previous.sku].name;
 el("checkoutProductPrice").textContent=money(config.products[previous.sku].price);
 el("paymentBrick_container").hidden=true;el("statusArea").hidden=true;el("checkoutSuccess").hidden=true;
 setMessage("Retomando o pagamento anterior para evitar cobranças duplicadas…","note");
 try{
  const status=await queryPayment(paymentId,orderAccess);
  if(status==="pending")await showStatus(paymentId,orderAccess);
 }catch(e){
  setMessage("Estamos consultando a situação do pedido anterior. Não inicie uma nova cobrança enquanto ele estiver pendente.","note");
  await showStatus(paymentId,orderAccess);
 }finally{opening=false;}
}
triggers.forEach(b=>b.addEventListener("click",()=>open(b.dataset.sku)));
el("checkoutClose").addEventListener("click",close);
backdrop.addEventListener("click",e=>{if(e.target===backdrop)close();});
document.addEventListener("keydown",e=>{if(backdrop.hidden)return;if(e.key==="Escape"){e.preventDefault();close();}if(e.key==="Tab"){const els=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')].filter(x=>x.offsetParent!==null);if(!els.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
setBusy(true,"Verificando pagamento seguro…");
readConfig().then(async()=>{setBusy(false,"Compra segura disponível aqui mesmo, via Mercado Pago.");await resumePendingOrder();}).catch(err=>{setBusy(true,"Pagamento temporariamente indisponível. "+(err.message||"Tente novamente."));});
})();