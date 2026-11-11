(()=>{"use strict";
const API="https://lumen-digital-checkout.ccoliveira1.workers.dev";
const BUNDLE_ID="art-justice-four-16k";
const SKU=/^art-justice-(?:(?:0[1-9]|10)-[a-z0-9-]+|four-16k)$/;
const el=id=>document.getElementById(id);
const triggers=[...document.querySelectorAll(".checkout-trigger")];
const backdrop=el("checkoutBackdrop"),dialog=el("checkoutDialog"),message=el("checkoutMessage"),galleryStatus=el("galleryCheckoutStatus");
const setMessage=(s,type="")=>{message.dataset.originalText=String(s||"");message.textContent=translated(s);message.className="payment-message "+type;message.hidden=!s;};
let mp=null,bricks=null,config=null,mpSettings=null,checkoutQuote=null,paymentController=null,statusController=null;
let currentSku="",paymentId="",orderAccess="",timer=null,epoch=0,opening=false,submitting=false,lastFocus=null;
let paypalConfig={enabled:false},paypalController=null,paypalOrder=null,provider="mercadopago",providerPreference=null;

const CHECKOUT_I18N={"pt":{"secureTag":"LUMEN ARTS · FINALIZAÇÃO SEGURA","secureTitle":"Pagamento seguro","delivery":"Lumen Arts · Entrega digital após aprovação","currencyNote":"Cobrança em {currency}. Os meios disponíveis dependem do cartão e da sua localização.","privacyLead":"Pagamento processado pelo Mercado Pago. Seus dados de pagamento são tratados pelo provedor.","terms":"Termos","privacy":"Privacidade","close":"Fechar pagamento","languageLabel":"Idioma do pagamento","bundle":"Coleção Justiça Dourada — 10 masters digitais 16K","artSuffix":"obra digital 16K"},"en":{"secureTag":"LUMEN ARTS · SECURE CHECKOUT","secureTitle":"Secure payment","delivery":"Lumen Arts · Digital delivery after approval","currencyNote":"Charged in {currency}. Payment methods depend on your card issuer and location.","privacyLead":"Payments are processed by Mercado Pago. The provider handles payment data.","terms":"Terms","privacy":"Privacy","close":"Close payment","languageLabel":"Payment language","bundle":"Justiça Dourada Collection — 10 digital 16K masters","artSuffix":"16K digital artwork"},"es":{"secureTag":"LUMEN ARTS · PAGO SEGURO","secureTitle":"Pago seguro","delivery":"Lumen Arts · Entrega digital tras la aprobación","currencyNote":"Cobro en {currency}. Los métodos disponibles dependen del emisor de tu tarjeta y de tu ubicación.","privacyLead":"Mercado Pago procesa el pago. El proveedor gestiona los datos de pago.","terms":"Términos","privacy":"Privacidad","close":"Cerrar pago","languageLabel":"Idioma del pago","bundle":"Colección Justiça Dourada — 10 archivos digitales 16K","artSuffix":"obra digital 16K"}};
const CHECKOUT_STATUS_I18N={"en":{"Verificando pagamento seguro…":"Checking secure payment…","Compra segura disponível aqui mesmo, via Mercado Pago.":"Secure payment is available here via Mercado Pago.","Conectando ao Mercado Pago…":"Connecting to Mercado Pago…","Pagamento aprovado!":"Payment approved!","Sua edição digital está disponível para download. Uma confirmação também pode chegar ao e-mail informado no pagamento.":"Your digital artwork is ready to download. Confirmation may also arrive by email.","Baixar":"Download","sua obra":"your artwork","O pagamento foi aprovado, mas ainda não foi possível liberar o arquivo nesta tela. Entre em contato com nosso suporte.":"Payment approved, but the download isn't available on this screen yet. Please contact support.","Pagamento não aprovado. Você pode fechar esta janela e tentar novamente se desejar.":"Payment not approved. You can close this window and try again.","Pedido criado. A confirmação está sendo consultada; não faça outro pagamento.":"Order created. Checking confirmation; please do not pay twice.","Pagamento aguardando confirmação. Guarde o comprovante; uma confirmação também poderá chegar por e-mail.":"Waiting for payment confirmation. Please keep your receipt.","Pedido iniciado. Aguardando confirmação do Mercado Pago…":"Order created. Awaiting Mercado Pago confirmation…","Pedido criado. Estamos verificando a confirmação do pagamento.":"Order created. Checking payment confirmation.","Pedido iniciado. Estamos verificando a confirmação, não é necessário repetir o pagamento.":"We are checking your order. Please do not pay again.","Não foi possível carregar essa opção. Selecione outro meio de pagamento.":"This payment option could not load. Please select another.","Retomando o pagamento anterior para evitar cobranças duplicadas…":"Resuming your previous payment to avoid duplicate charges…","Estamos consultando a situação do pedido anterior. Não inicie uma nova cobrança enquanto ele estiver pendente.":"We are checking your previous order. Do not make another payment while it is pending.","Pagamento não concluído: ":"Payment not completed: ","Pagamento temporariamente indisponível. ":"Payment temporarily unavailable. ","Nenhuma cobrança foi realizada.":"No charge was made.","Tente novamente.":"Please try again.","Não foi possível consultar o pagamento.":"Could not load payment information.","Pagamento indisponível.":"Payment unavailable.","Preço indisponível. Nenhuma cobrança será iniciada.":"Price unavailable. No charge will be started.","O módulo de pagamento seguro não carregou.":"The secure payment form could not load.","Código de acesso ao pedido ausente":"Order access code missing","Identificação da obra divergente.":"Artwork does not match the payment.","Valor aprovado divergente.":"Approved amount does not match.","A troca de idioma não está disponível durante um pagamento em processamento.":"Language cannot be changed while a payment is being confirmed.","Atualizando idioma do pagamento…":"Changing payment language…","Pedido já está sendo processado.":"Your order is already being processed."},"es":{"Verificando pagamento seguro…":"Verificando el pago seguro…","Compra segura disponível aqui mesmo, via Mercado Pago.":"Pago seguro disponible aquí mediante Mercado Pago.","Conectando ao Mercado Pago…":"Conectando con Mercado Pago…","Pagamento aprovado!":"¡Pago aprobado!","Sua edição digital está disponível para download. Uma confirmação também pode chegar ao e-mail informado no pagamento.":"Tu obra digital está lista para descargar. También podrías recibir la confirmación por correo.","Baixar":"Descargar","sua obra":"tu obra","O pagamento foi aprovado, mas ainda não foi possível liberar o arquivo nesta tela. Entre em contato com nosso suporte.":"Pago aprobado, pero todavía no está disponible la descarga. Contacta con soporte.","Pagamento não aprovado. Você pode fechar esta janela e tentar novamente se desejar.":"Pago no aprobado. Puedes cerrar esta ventana e intentarlo de nuevo.","Pedido criado. A confirmação está sendo consultada; não faça outro pagamento.":"Pedido creado. Consultando la confirmación; no pagues dos veces.","Pagamento aguardando confirmação. Guarde o comprovante; uma confirmação também poderá chegar por e-mail.":"Esperando confirmación de pago. Guarda tu comprobante.","Pedido iniciado. Aguardando confirmação do Mercado Pago…":"Pedido creado. Esperando confirmación de Mercado Pago…","Pedido criado. Estamos verificando a confirmação do pagamento.":"Pedido creado. Estamos verificando la confirmación.","Pedido iniciado. Estamos verificando a confirmação, não é necessário repetir o pagamento.":"Estamos verificando tu pedido. No vuelvas a pagar.","Não foi possível carregar essa opção. Selecione outro meio de pagamento.":"No se pudo cargar esta opción. Elige otro medio de pago.","Retomando o pagamento anterior para evitar cobranças duplicadas…":"Reanudando el pago anterior para evitar cobros duplicados…","Estamos consultando a situação do pedido anterior. Não inicie uma nova cobrança enquanto ele estiver pendente.":"Estamos consultando tu pedido anterior. No inicies otro pago mientras esté pendiente.","Pagamento não concluído: ":"Pago no completado: ","Pagamento temporariamente indisponível. ":"Pago no disponible temporalmente. ","Nenhuma cobrança foi realizada.":"No se realizó ningún cobro.","Tente novamente.":"Inténtalo de nuevo.","Não foi possível consultar o pagamento.":"No se pudo consultar el pago.","Pagamento indisponível.":"Pago no disponible.","Preço indisponível. Nenhuma cobrança será iniciada.":"Precio no disponible. No se iniciará ningún cobro.","O módulo de pagamento seguro não carregou.":"No se pudo cargar el formulario seguro.","Código de acesso ao pedido ausente":"Falta el código de acceso del pedido","Identificação da obra divergente.":"La obra no coincide con el pago.","Valor aprovado divergente.":"El importe aprobado no coincide.","A troca de idioma não está disponível durante um pagamento em processamento.":"No puedes cambiar el idioma mientras se confirma un pago.","Atualizando idioma do pagamento…":"Actualizando el idioma del pago…","Pedido já está sendo processado.":"El pedido ya se está procesando."}};
const PROVIDER_I18N={
 pt:{provider:"Escolha como pagar",paypalNote:"Você continuará no PayPal. As opções de pagamento disponíveis serão apresentadas lá.",paypalPrivacy:"Pagamento processado pelo PayPal. Seus dados de pagamento são tratados pelo provedor.",paypalLoading:"Conectando ao PayPal…",paypalPending:"Estamos verificando o pagamento no PayPal. Não inicie outra cobrança.",paypalError:"Não foi possível concluir pelo PayPal. Retome este pedido antes de tentar outra cobrança.",paypalCancel:"A janela do PayPal foi fechada. Você pode escolher como pagar.",paypalUnavailable:"PayPal não está disponível neste momento. Escolha outra opção.",available:"Pagamento seguro disponível nesta página.",recoveryAvailable:"Sua compra anterior está disponível para recuperar os arquivos.",receiptInvalid:"Não foi possível recuperar o acesso desta compra. Fale com o suporte antes de pagar novamente."},
 en:{provider:"Choose how to pay",paypalNote:"You will continue in PayPal. Available payment options will be shown there.",paypalPrivacy:"Payments are processed by PayPal. The provider handles payment data.",paypalLoading:"Connecting to PayPal…",paypalPending:"We are checking your PayPal payment. Please do not start another payment.",paypalError:"PayPal could not complete this step. Resume this order before trying another payment.",paypalCancel:"The PayPal window was closed. You can choose how to pay.",paypalUnavailable:"PayPal is currently unavailable. Please choose another option.",available:"Secure payment is available on this page.",recoveryAvailable:"Your previous purchase is available to recover your files.",receiptInvalid:"We could not recover access to this purchase. Please contact support before paying again."},
 es:{provider:"Elige cómo pagar",paypalNote:"Continuarás en PayPal. Allí se mostrarán las opciones de pago disponibles.",paypalPrivacy:"PayPal procesa el pago. El proveedor gestiona los datos de pago.",paypalLoading:"Conectando con PayPal…",paypalPending:"Estamos verificando tu pago en PayPal. No inicies otro pago.",paypalError:"PayPal no pudo completar este paso. Retoma este pedido antes de intentar otro pago.",paypalCancel:"Se cerró la ventana de PayPal. Puedes elegir cómo pagar.",paypalUnavailable:"PayPal no está disponible en este momento. Elige otra opción.",available:"Pago seguro disponible en esta página.",recoveryAvailable:"Tu compra anterior está disponible para recuperar los archivos.",receiptInvalid:"No pudimos recuperar el acceso a esta compra. Contacta con soporte antes de volver a pagar."}
};
const CHECKOUT_LOCALES={pt:"pt-BR",en:"en-US",es:"es-MX"};
function localeKey(raw){const s=String(raw||"").trim().toLowerCase();return /^pt(?:-|$)/.test(s)?"pt":/^en(?:-|$)/.test(s)?"en":/^es(?:-|$)/.test(s)?"es":null;}
function findCheckoutLanguage(){
 const params=new URLSearchParams(location.search);
 const explicit=localeKey(params.get("lang"))||localeKey(params.get("locale"));if(explicit)return explicit;
 const pathLocale=/^\/(?:en|es)\/?$/.test(location.pathname)?localeKey(document.documentElement.lang):null;
 if(pathLocale)return pathLocale;
 for(const l of [...(navigator.languages||[]),navigator.language]){const value=localeKey(l);if(value)return value;}
 return "en";
}
let language=findCheckoutLanguage();
const tr=key=>CHECKOUT_I18N[language][key]||CHECKOUT_I18N.pt[key]||key;
function translated(str){
 const value=String(str||"");const dict=CHECKOUT_STATUS_I18N[language]||{};
 if(dict[value])return dict[value];
 for(const part of ["Pagamento não concluído: ","Pagamento temporariamente indisponível. "])if(value.startsWith(part))return (dict[part]||part)+value.slice(part.length);
 return value;
}
const validMoney=(amount,currency)=>{const n=Number(amount),minor=Math.round(n*100);return["BRL","USD"].includes(currency)&&Number.isFinite(n)&&n>0&&Number.isSafeInteger(minor)&&Math.abs(n*100-minor)<.000001;};
const money=(n,currency=checkoutQuote?.currency||config?.currency)=>window.LumenPricing?.format(n,currency,CHECKOUT_LOCALES[language])||"—";
function catalogQuote(sku){const p=config?.products?.[sku];return p&&validMoney(p.price,config.currency)?{amount:Number(p.price),currency:config.currency,pricing_version:config.pricing_version}:null;}
function savedQuote(value){return validMoney(value?.amount,value?.currency)?{amount:Number(value.amount),currency:value.currency,...(typeof value.pricing_version==="string"?{pricing_version:value.pricing_version}:{})}:null;}
function currencyName(){
 const currency=checkoutQuote?.currency||((paymentId||orderAccess)?null:config?.currency);
 const names={pt:{BRL:"reais (BRL)",USD:"dólares americanos (USD)",unknown:"moeda indicada antes do pagamento"},en:{BRL:"Brazilian reais (BRL)",USD:"US dollars (USD)",unknown:"the currency shown before payment"},es:{BRL:"reales brasileños (BRL)",USD:"dólares estadounidenses (USD)",unknown:"la moneda indicada antes del pago"}};
 return names[language][currency]||names[language].unknown;
}
function showQuote(sku,value,product=config?.products?.[sku]){
 checkoutQuote=value;
 el("checkoutProductName").textContent=product?productLabel(sku,product):(sku===BUNDLE_ID?tr("bundle"):tr("artSuffix"));
 el("checkoutProductPrice").textContent=value?money(value.amount,value.currency):"—";
 const note=dialog.querySelector("[data-checkout-i18n=currencyNote]");if(note)note.textContent=tr("currencyNote").replace("{currency}",currencyName());
}
function paypalUnavailableMessage(){return mpAvailable()?pt("paypalUnavailable"):{pt:"PayPal não está disponível neste momento. Tente novamente mais tarde.",en:"PayPal is currently unavailable. Please try again later.",es:"PayPal no está disponible en este momento. Inténtalo más tarde."}[language];}
function changedPriceMessage(){return{pt:"O preço foi atualizado. Confira o valor e escolha pagar novamente para continuar.",en:"The price has been updated. Review the amount and choose to pay again to continue.",es:"El precio se ha actualizado. Revisa el importe y vuelve a elegir pagar para continuar."}[language];}
function productLabel(sku,product){
 if(sku===BUNDLE_ID)return tr("bundle");
 if(language==="pt")return product.name;
 return String(product.name||sku).replace(/ — Justiça Dourada$/,"")+" — "+tr("artSuffix");
}
const pt=key=>PROVIDER_I18N[language][key];
function mpAvailable(){return config?.market==="BR"&&config.currency==="BRL"&&mpSettings?.individualSalesEnabled===true&&!!mpSettings.publicKey&&typeof window.MercadoPago==="function";}
function paypalAvailable(){return !!window.LumenPayPal?.configured(paypalConfig);}
function paypalReceipt(sku){return window.LumenPayPal?.paidOrder?.(sku,paypalConfig?.mode)||null;}
function recoverable(sku){return pendingOrder()?.sku===sku||window.LumenPayPal?.pendingOrder()?.sku===sku||!!paypalReceipt(sku);}
function recoveryAvailable(){return triggers.some(b=>recoverable(b.dataset.sku));}
function initialProvider(){
 const preferred=providerPreference||(/^(en|es)/i.test(document.documentElement.lang)?"paypal":"mercadopago");
 return preferred==="paypal"&&paypalAvailable()?"paypal":mpAvailable()?"mercadopago":"paypal";
}
function updateProviderUI(){
 const picker=el("checkoutProviderPicker");if(!picker)return;
 picker.hidden=!(mpAvailable()&&paypalAvailable());el("checkoutProviderLegend").textContent=pt("provider");el("paypalCheckoutNote").textContent=pt("paypalNote");
 for(const id of ["checkoutProviderMP","checkoutProviderPayPal"]){const b=el(id);b.disabled=opening||submitting||!!paymentId||!!orderAccess;b.setAttribute("aria-pressed",String((id==="checkoutProviderPayPal")=== (provider==="paypal")));}
 const lead=dialog.querySelector("[data-checkout-i18n=privacyLead]");if(lead&&provider==="paypal")lead.textContent=pt("paypalPrivacy");
}
function buildProviderUI(){
 const field=document.createElement("fieldset");field.id="checkoutProviderPicker";field.className="checkout-provider-picker";field.hidden=true;
 const legend=document.createElement("legend");legend.id="checkoutProviderLegend";field.append(legend);
 for(const [id,label,value] of [["checkoutProviderMP","Mercado Pago","mercadopago"],["checkoutProviderPayPal","PayPal","paypal"]]){const b=document.createElement("button");b.type="button";b.id=id;b.textContent=label;b.addEventListener("click",()=>changeProvider(value));field.append(b);}
 const area=document.createElement("div");area.id="paypalCheckoutArea";area.hidden=true;area.className="checkout-paypal-area";
 const note=document.createElement("p");note.id="paypalCheckoutNote";const content=document.createElement("div");content.id="paypalCheckout_container";area.append(note,content);
 el("paymentBrick_container").before(field,area);
}
async function changeProvider(next){
 if(!["mercadopago","paypal"].includes(next)||next===provider||opening||submitting||paymentId||orderAccess)return;
 if(next==="paypal"&&!paypalAvailable()||next==="mercadopago"&&!mpAvailable())return;
 const sku=currentSku,focus=lastFocus;providerPreference=next;epoch++;await unmount();backdrop.hidden=true;document.body.classList.remove("checkout-open");currentSku="";await open(sku);lastFocus=focus;
}
function applyLanguage(){
 dialog.lang=CHECKOUT_LOCALES[language];
 const picker=el("checkoutLanguage");picker.value=language;picker.setAttribute("aria-label",tr("languageLabel"));
 el("checkoutClose").setAttribute("aria-label",tr("close"));
 for(const node of dialog.querySelectorAll("[data-checkout-i18n]"))node.textContent=tr(node.dataset.checkoutI18n).replace("{currency}",currencyName());
 for(const legalLink of dialog.querySelectorAll(".checkout-privacy a")){
  const isTerms=legalLink.href.includes("terms.html");
  legalLink.href="/legal/"+language+"/"+(isTerms?"terms":"privacy")+".html";
  legalLink.textContent=isTerms?tr("terms"):tr("privacy");
  legalLink.setAttribute("hreflang",CHECKOUT_LOCALES[language]);
  legalLink.setAttribute("lang",CHECKOUT_LOCALES[language]);
 }
 const support=el("checkoutSupportWhatsApp");
 if(support){
  support.textContent=language==="pt"?"Atendimento por WhatsApp ↗":language==="es"?"Soporte por WhatsApp ↗":"WhatsApp support ↗";
  const msg=language==="pt"?"Olá! Preciso de atendimento sobre a coleção digital Justiça Dourada.":language==="es"?"¡Hola! Necesito ayuda con la colección digital Justiça Dourada.":"Hello! I need help with my Justiça Dourada digital art order.";
  support.href="https://wa.me/5511978230487?text="+encodeURIComponent(msg);
 }
 if(currentSku)showQuote(currentSku,checkoutQuote);
 if(!message.hidden)message.textContent=translated(message.dataset.originalText||message.textContent);
 updateProviderUI();
}
async function changeLanguage(next){
 if(!Object.prototype.hasOwnProperty.call(CHECKOUT_LOCALES,next)||next===language)return;
 if(opening||submitting||paymentId||orderAccess){
  el("checkoutLanguage").value=language;setMessage("A troca de idioma não está disponível durante um pagamento em processamento.","note");return;
 }
 const openNow=!backdrop.hidden,sku=currentSku,previousFocus=lastFocus;
 language=next;applyLanguage();setBusy(false,mpAvailable()||paypalAvailable()?pt("available"):pt("recoveryAvailable"));
 try{const url=new URL(location.href);url.searchParams.set("lang",next);history.replaceState(history.state,"",url.pathname+url.search+url.hash);}catch{}
 mp=null;bricks=null;
 if(!openNow||!sku)return;
 el("checkoutLanguage").disabled=true;setMessage(translated("Atualizando idioma do pagamento…"),"note");
 try{
  await unmount();backdrop.hidden=true;document.body.classList.remove("checkout-open");currentSku="";
  await open(sku);lastFocus=previousFocus;
 }catch(e){setMessage(e.message||translated("Pagamento indisponível."),"error");}
 finally{el("checkoutLanguage").disabled=false;}
}

const setBusy=(state,info)=>{triggers.forEach(b=>b.disabled=state||(!mpAvailable()&&!paypalAvailable()&&!recoverable(b.dataset.sku)));galleryStatus.textContent=info||"";const offerStatus=el("bundleCheckoutStatus");if(offerStatus)offerStatus.textContent=info||"";};
function validCatalog(value){
 if(!value?.individualSalesEnabled||!["BR","INTL"].includes(value.market)||!["BRL","USD"].includes(value.currency)||!value.pricing_version||(value.market==="BR")!==(value.currency==="BRL"))return false;
 return triggers.every(b=>SKU.test(b.dataset.sku)&&validMoney(value.products?.[b.dataset.sku]?.price,value.currency));
}
async function readConfig({refresh=false}={}){
 const [mpConfig,regional]=await Promise.all([
  fetch(API+"/api/config",{headers:{accept:"application/json"},cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
  window.LumenPricing?.load({refresh}).catch(()=>null)||Promise.resolve(null)
 ]);
 mpSettings=mpConfig;
 config=validCatalog(regional)?regional:null;
 paypalConfig=config?.paypal||{enabled:false};
 try{window.LumenAnalytics?.setCatalog(config);}catch{}
 if(!mpAvailable()&&!paypalAvailable()&&!recoveryAvailable())throw Error("Pagamento indisponível.");
 updateProviderUI();return config;
}
function ensureMercadoPago(){
 if(!mpAvailable())throw Error("O módulo de pagamento seguro não carregou.");
 if(!mp){mp=new MercadoPago(mpSettings.publicKey,{locale:CHECKOUT_LOCALES[language]});bricks=mp.bricks();}
}
async function unmount(){
 try{await paypalController?.unmount();}catch{}paypalController=null;
 try{await paymentController?.unmount();}catch{}
 try{await statusController?.unmount();}catch{}
 paymentController=null;statusController=null;
 el("paymentBrick_container").replaceChildren();el("statusScreenBrick_container").replaceChildren();el("paypalCheckout_container")?.replaceChildren();
}
function close(){
 if(provider==="paypal"&&submitting){setMessage(pt("paypalPending"),"note");return;}
 if(timer)clearTimeout(timer);timer=null;epoch++;
 el("checkoutLanguage").disabled=false;
 unmount().catch(()=>{});
 backdrop.hidden=true;document.body.classList.remove("checkout-open");
 currentSku="";checkoutQuote=null;opening=false;submitting=false;paymentId="";orderAccess="";paypalOrder=null;
 if(lastFocus)lastFocus.focus({preventScroll:true});
}
function openDisplay(){
 lastFocus=document.activeElement;backdrop.hidden=false;document.body.classList.add("checkout-open");
 el("checkoutClose").focus({preventScroll:true});
}
function validDownload(url){
 try{const u=new URL(url);return u.origin===API&&(/^\/api\/(download-bundle|download)\/[0-9]+\/[0-9]+$/.test(u.pathname)||/^\/api\/paypal\/download-bundle\/[A-Z0-9]{1,32}\/[0-9]+$/.test(u.pathname));}catch{return false;}
}
function approved(info){
 if(el("paypalCheckoutArea"))el("paypalCheckoutArea").hidden=true;if(el("checkoutProviderPicker"))el("checkoutProviderPicker").hidden=true;
 try{window.LumenAnalytics?.purchase(info)?.catch(()=>{});}catch{}
 clearTimeout(timer);timer=null;el("statusArea").hidden=true;el("paymentBrick_container").hidden=true;
 el("checkoutLanguage").disabled=true;
 const area=el("checkoutSuccess");area.hidden=false;area.replaceChildren();
 const heading=document.createElement("h3");heading.textContent=translated("Pagamento aprovado!");
 const desc=document.createElement("p");desc.textContent=translated("Sua edição digital está disponível para download. Uma confirmação também pode chegar ao e-mail informado no pagamento.");
 area.append(heading,desc);
 const bundles=[...(Array.isArray(info.bundles)?info.bundles:[])].filter(x=>validDownload(x.url));
 for(const b of bundles){const a=document.createElement("a");a.href=b.url;a.rel="noopener noreferrer";a.className="checkout-download";a.textContent=translated("Baixar")+" "+(b.label||translated("sua obra"))+" ↓";area.appendChild(a);}
 if(!bundles.length){const p=document.createElement("p");p.textContent=translated("O pagamento foi aprovado, mas ainda não foi possível liberar o arquivo nesta tela. Entre em contato com nosso suporte.");area.append(p);}
 try{sessionStorage.removeItem("juridica-order-pending");}catch{}
 setMessage("");
}
async function queryPayment(id,token){
 const r=await fetch(API+"/api/payments/"+encodeURIComponent(id),{headers:{accept:"application/json","x-order-access":token},cache:"no-store"});
 if(!r.ok)throw Error("Não foi possível consultar o pagamento.");
 const data=await r.json(),actual=savedQuote(data);
 if(data.product?.id!==currentSku)throw Error("Identificação da obra divergente.");
 if(!actual||actual.currency!=="BRL"||(checkoutQuote&&(checkoutQuote.currency!==actual.currency||Math.abs(checkoutQuote.amount-actual.amount)>.001)))throw Error("Valor aprovado divergente.");
 showQuote(currentSku,actual,data.product);
 if(data.status==="approved"){if(Math.abs(Number(data.amount)-Number(data.product.price))>.001||!Number.isFinite(Number(data.product.price)))throw Error("Valor aprovado divergente.");approved(data);return "approved";}
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
function buildPaymentRequest(sku,selectedPaymentMethod,formData,attribution,quote=checkoutQuote){
 if(!quote||quote.currency!=="BRL"||!quote.pricing_version)throw Error("Preço indisponível. Nenhuma cobrança será iniciada.");
 const body={productId:sku,selectedPaymentMethod,formData,locale:language,attribution,quote:{currency:quote.currency,pricing_version:quote.pricing_version}};
 try{const analytics=window.LumenAnalytics?.checkoutContext();if(analytics)body.analytics=analytics;}catch{}
 return body;
}
async function mountMercadoPago(sku){
 ensureMercadoPago();const product=config.products[sku],quote=catalogQuote(sku),run=epoch;if(!quote||quote.currency!=="BRL")throw Error("Preço indisponível. Nenhuma cobrança será iniciada.");showQuote(sku,quote,product);
 el("paymentBrick_container").hidden=false;el("paypalCheckoutArea").hidden=true;
  paymentController=await bricks.create("payment","paymentBrick_container",{
   initialization:{amount:quote.amount},
   customization:{
    paymentMethods:{creditCard:"all",debitCard:"all",bankTransfer:"all",ticket:"all"},
    visual:{style:{theme:"default"}}
   },
   callbacks:{
    onReady:()=>{if(run!==epoch)return;setMessage("");try{window.LumenAnalytics?.checkoutReady(sku,quote.amount,quote.currency)?.catch(()=>{});}catch{}},
    onError:error=>{if(run!==epoch)return;console.error("Mercado Pago Payment Brick",error);setMessage("Não foi possível carregar essa opção. Selecione outro meio de pagamento.","error");},
    onSubmit:({selectedPaymentMethod,formData})=>new Promise((resolve,reject)=>{
      if(submitting||!formData||run!==epoch){reject(Error("Pedido já está sendo processado."));return;}
      submitting=true;
      el("checkoutLanguage").disabled=true;
      const idem=crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(16).slice(2);
      const utm=new URLSearchParams(location.search),attribution={utm_source:"juridica.lumenanima.com",utm_medium:"referral",utm_campaign:"justica_dourada_16k_20261106",utm_content:sku};
      for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){const val=utm.get(key);if(val&&/^[A-Za-z0-9_.-]{1,64}$/.test(val))attribution[key]=val;}
      fetch(API+"/api/payments",{method:"POST",headers:{"content-type":"application/json","x-idempotency-key":idem},body:JSON.stringify(buildPaymentRequest(sku,selectedPaymentMethod,formData,attribution,quote))})
       .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!/^\d+$/.test(String(d.id||"")))throw Object.assign(Error(d.message||d.error||"Pagamento não concluído"),{code:d.error,httpStatus:r.status});if(!/^[a-f0-9]{64}$/.test(String(d.order_access||"")))throw Error("Código de acesso ao pedido ausente");paymentId=String(d.id);orderAccess=d.order_access;
        try{sessionStorage.setItem("juridica-order-pending",JSON.stringify({provider:"mercadopago",id:paymentId,sku,token:orderAccess,at:Date.now(),lang:language,...quote}));}catch{}
        resolve(); await showStatus(paymentId,orderAccess);
       }).catch(err=>{submitting=false;el("checkoutLanguage").disabled=false;reject(err);if(err.httpStatus===409&&["PRICE_CHANGED","MARKET_PAYMENT_NOT_AVAILABLE"].includes(err.code)){refreshAfterPriceChange(sku).catch(()=>{});return;}setMessage("Pagamento não concluído: "+(err.message||"Tente novamente."),"error");});
    })
   }
  });
}
async function mountPayPal(sku,pending=null){
 const run=epoch;provider="paypal";el("paymentBrick_container").hidden=true;el("paypalCheckoutArea").hidden=false;setMessage(pt("paypalLoading"),"note");applyLanguage();
 paypalController=await window.LumenPayPal.mount({
  container:el("paypalCheckout_container"),sku,quote:pending?savedQuote(pending):catalogQuote(sku),locale:language,configuration:paypalConfig,pending,
  isCurrent:()=>run===epoch&&currentSku===sku&&provider==="paypal"&&!backdrop.hidden,
  attribution:checkoutAttribution(sku),
  onOrder:order=>{paypalOrder=order;paymentId=order?.id||"";orderAccess=order?.token||"";el("checkoutLanguage").disabled=submitting||!!paymentId;updateProviderUI();},
  onBusy:value=>{submitting=value;el("checkoutLanguage").disabled=value||!!paymentId;updateProviderUI();},
  onQuote:(quote,product)=>{if(run===epoch)showQuote(sku,quote,product);},
  onReady:quote=>{el("paypalCheckoutArea").hidden=false;setMessage("");try{window.LumenAnalytics?.checkoutReady(sku,quote.amount,quote.currency)?.catch(()=>{});}catch{}},
  onPriceChanged:()=>{if(run===epoch)refreshAfterPriceChange(sku).catch(()=>{});},
  onStatus:info=>{
   if(info.status==="approved"){approved(info);return;}
   if(info.status==="pending"){el("paypalCheckoutArea").hidden=true;setMessage(pt("paypalPending"),"note");return;}
   setMessage(pt("paypalError"),"error");el("paypalCheckoutArea").hidden=false;
  },
  onPending:()=>{el("paypalCheckoutArea").hidden=true;setMessage(pt("paypalPending"),"note");},
  onCancel:()=>{el("paypalCheckoutArea").hidden=false;el("checkoutLanguage").disabled=false;setMessage(pt("paypalCancel"),"note");updateProviderUI();},
  onError:code=>{setMessage(pt(code==="receipt_invalid"?"receiptInvalid":"paypalError"),"error");updateProviderUI();}
 });
}
async function refreshAfterPriceChange(sku){
 if(paymentId||orderAccess||currentSku!==sku||backdrop.hidden)return;
 opening=true;submitting=false;epoch++;const run=epoch;showQuote(sku,null);setMessage(changedPriceMessage(),"note");
 try{
  await unmount();await readConfig({refresh:true});if(run!==epoch||backdrop.hidden)return;
  const quote=catalogQuote(sku);if(!quote)throw Error("price_unavailable");showQuote(sku,quote);
  provider=initialProvider();applyLanguage();
  if(provider==="paypal")await mountPayPal(sku);else await mountMercadoPago(sku);
  if(run===epoch)setMessage(changedPriceMessage(),"note");
 }catch{if(run===epoch)setMessage(translated("Pagamento indisponível."),"error");}
 finally{if(run===epoch){opening=false;el("checkoutLanguage").disabled=false;updateProviderUI();}}
}
function checkoutAttribution(sku){
 const utm=new URLSearchParams(location.search),attribution={utm_source:"juridica.lumenanima.com",utm_medium:"referral",utm_campaign:"justica_dourada_16k_20261106",utm_content:sku};
 for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]){const val=utm.get(key);if(val&&/^[A-Za-z0-9_.-]{1,64}$/.test(val))attribution[key]=val;}
 return attribution;
}
async function open(sku){
 if(opening||!SKU.test(sku))return;
 const pending=pendingOrder();if(pending&&pending.sku===sku){await resumePendingOrder();return;}
 const ppPending=window.LumenPayPal?.pendingOrder();
 if(ppPending&&ppPending.sku===sku){await resumePayPalOrder(ppPending);return;}
 const receipt=paypalReceipt(sku);if(receipt){await resumePayPalOrder({...receipt,recoveryOnly:true});return;}
 opening=true;currentSku=sku;epoch++;const run=epoch;paymentId="";orderAccess="";paypalOrder=null;submitting=false;
 showQuote(sku,catalogQuote(sku));
 openDisplay();el("statusArea").hidden=true;el("checkoutSuccess").hidden=true;setMessage(translated("Verificando pagamento seguro…"),"note");
 try{
  await readConfig({refresh:true});if(backdrop.hidden||currentSku!==sku||run!==epoch)return;
  const quote=catalogQuote(sku);if(!quote)throw Error("Preço indisponível. Nenhuma cobrança será iniciada.");showQuote(sku,quote);
  await unmount();
  provider=initialProvider();applyLanguage();
  if(provider==="paypal"){
   try{await mountPayPal(sku,ppPending?.sku===sku?ppPending:null);}
   catch(error){
    if(backdrop.hidden||run!==epoch)return;
    if(mpAvailable()&&!paymentId&&!orderAccess){provider="mercadopago";applyLanguage();await mountMercadoPago(sku);setMessage(paypalUnavailableMessage(),"note");}
    else throw error;
   }
  }else await mountMercadoPago(sku);
 }catch{setMessage(provider==="paypal"?paypalUnavailableMessage():translated("Pagamento indisponível."),"error");}
 finally{opening=false;updateProviderUI();}
}
async function resumePayPalOrder(previous){
 if(!previous||!backdrop.hidden||!SKU.test(previous.sku))return;
 currentSku=previous.sku;provider="paypal";paymentId=previous.id;orderAccess=previous.token;paypalOrder=previous;opening=true;epoch++;openDisplay();
 showQuote(previous.sku,savedQuote(previous));
 el("statusArea").hidden=true;el("checkoutSuccess").hidden=true;
 try{await unmount();await mountPayPal(previous.sku,previous);}catch{setMessage(pt("paypalPending"),"note");}
 finally{opening=false;updateProviderUI();}
}
function pendingOrder(){
 try{
  const r=sessionStorage.getItem("juridica-order-pending");if(!r)return null;
  const x=JSON.parse(r);
  if(!x||(x.provider&&x.provider!=="mercadopago")||!/^\d+$/.test(String(x.id))||!SKU.test(String(x.sku))||!/^[a-f0-9]{64}$/.test(String(x.token))||!Number.isFinite(Number(x.at))||Date.now()-Number(x.at)>72*60*60*1000){
    sessionStorage.removeItem("juridica-order-pending");return null;
  }
  return x;
 }catch{return null;}
}
async function resumePendingOrder(){
 const previous=pendingOrder();
 if(!previous||!backdrop.hidden||!SKU.test(previous.sku))return;
 const stored=localeKey(previous.lang);if(stored&&stored!==language){language=stored;mp=null;bricks=null;applyLanguage();await readConfig();}
 provider="mercadopago";currentSku=previous.sku;paymentId=String(previous.id);orderAccess=previous.token;
 opening=true;epoch++;openDisplay();el("checkoutLanguage").disabled=true;el("paypalCheckoutArea").hidden=true;
 showQuote(previous.sku,savedQuote(previous));
 el("paymentBrick_container").hidden=true;el("statusArea").hidden=true;el("checkoutSuccess").hidden=true;
 setMessage("Retomando o pagamento anterior para evitar cobranças duplicadas…","note");
 try{
  const status=await queryPayment(paymentId,orderAccess);
  if(status==="pending"){if(mpAvailable()){ensureMercadoPago();await showStatus(paymentId,orderAccess);}else pollPayment(paymentId,orderAccess,epoch);}
 }catch(e){
  setMessage("Estamos consultando a situação do pedido anterior. Não inicie uma nova cobrança enquanto ele estiver pendente.","note");
  if(mpAvailable()){ensureMercadoPago();await showStatus(paymentId,orderAccess);}else pollPayment(paymentId,orderAccess,epoch);
 }finally{opening=false;}
}
triggers.forEach(b=>b.addEventListener("click",()=>open(b.dataset.sku)));
el("checkoutLanguage").addEventListener("change",()=>changeLanguage(el("checkoutLanguage").value));
el("checkoutClose").addEventListener("click",close);
backdrop.addEventListener("click",e=>{if(e.target===backdrop)close();});
document.addEventListener("keydown",e=>{if(backdrop.hidden)return;if(e.key==="Escape"){e.preventDefault();close();}if(e.key==="Tab"){const els=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')].filter(x=>x.offsetParent!==null);if(!els.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
buildProviderUI();
applyLanguage();
setBusy(true,translated("Verificando pagamento seguro…"));
readConfig().then(async()=>{setBusy(false,mpAvailable()||paypalAvailable()?pt("available"):pt("recoveryAvailable"));await resumePendingOrder();if(backdrop.hidden){const pending=window.LumenPayPal?.pendingOrder();if(pending)await resumePayPalOrder(pending);}}).catch(err=>{setBusy(true,translated("Pagamento temporariamente indisponível. ")+translated(err.message||"Tente novamente."));});
})();

