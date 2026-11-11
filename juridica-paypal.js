/* Optional PayPal checkout adapter. The server controls availability and prices. */
(()=>{"use strict";
 const API="https://lumen-digital-checkout.ccoliveira1.workers.dev",KEY="juridica-paypal-order-pending",PAID_KEY="juridica-paypal-paid-receipts-v1",RECEIPT_TTL=72*3600000;
 const ID=/^[A-Z0-9]{1,32}$/,TOKEN=/^[a-f0-9]{64}$/,SKU=/^art-justice-(?:(?:0[1-9]|10)-[a-z0-9-]+|four-16k)$/;
 const VERSION=/^[A-Za-z0-9_.-]{1,80}$/;
 function orderQuote(value){
  const amount=Number(value?.amount),currency=value?.currency,minor=Math.round(amount*100);
  if(!["BRL","USD"].includes(currency)||!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(minor)||Math.abs(amount*100-minor)>.000001)return null;
  return {amount,currency,...(VERSION.test(String(value.pricing_version||""))?{pricing_version:String(value.pricing_version)}:{})};
 }
 let sdkPromise=null,sdkMode=null;
 function configured(c){return c?.enabled===true&&["sandbox","live"].includes(c.mode)&&["BRL","USD"].includes(c.currency)&&/^[A-Za-z0-9_-]{10,200}$/.test(String(c.clientId||""));}
 async function readConfiguration(){try{if(window.LumenPricing)return await window.LumenPricing.load();const r=await fetch(API+"/api/paypal/config",{headers:{accept:"application/json"},cache:"no-store"});return r.ok?await r.json():{paypal:{enabled:false}};}catch{return{paypal:{enabled:false}};}}
 function pendingOrder(){try{const x=JSON.parse(sessionStorage.getItem(KEY)||"null");return x&&x.provider==="paypal"&&ID.test(String(x.id))&&TOKEN.test(String(x.token))&&SKU.test(String(x.sku))&&["sandbox","live"].includes(x.mode)&&Number.isFinite(x.at)&&x.at<=Date.now()&&Date.now()-x.at<72*3600000?x:null;}catch{return null;}}
 function remember(x){try{sessionStorage.setItem(KEY,JSON.stringify(x));}catch{}}
 function forget(id){try{if(!id||pendingOrder()?.id===id)sessionStorage.removeItem(KEY);}catch{}}
 function receiptEntry(x){
  return x&&x.provider==="paypal"&&ID.test(String(x.id))&&TOKEN.test(String(x.token))&&SKU.test(String(x.sku))&&["sandbox","live"].includes(x.mode)&&Number.isFinite(x.at)&&x.at>0&&x.at<=Date.now()&&Date.now()-x.at<RECEIPT_TTL?{provider:"paypal",id:String(x.id),token:String(x.token),sku:String(x.sku),mode:x.mode,at:x.at}:null;
 }
 function writePaid(records){try{if(records.length)localStorage.setItem(PAID_KEY,JSON.stringify(records));else localStorage.removeItem(PAID_KEY);return true;}catch{return false;}}
 function paidRecords(){
  try{
   const raw=localStorage.getItem(PAID_KEY);if(!raw)return[];
   const data=raw.length<=16000?JSON.parse(raw):null,seen=new Set();
   const records=(Array.isArray(data)&&data.length<=22?data:[]).map(receiptEntry).filter(Boolean).sort((a,b)=>b.at-a.at).filter(x=>{const key=x.mode+":"+x.sku;if(seen.has(key))return false;seen.add(key);return true;});
   if(JSON.stringify(records)!==raw)writePaid(records);return records;
  }catch{writePaid([]);return[];}
 }
 function paidOrder(sku,mode){if(!SKU.test(String(sku)))return null;const knownMode=["sandbox","live"].includes(mode)?mode:null;return paidRecords().find(x=>x.sku===sku&&(!knownMode||x.mode===knownMode))||null;}
 function rememberPaid(order){const entry=receiptEntry(order);if(!entry)return false;return writePaid([...paidRecords().filter(x=>x.sku!==entry.sku||x.mode!==entry.mode),entry].sort((a,b)=>b.at-a.at).slice(0,22));}
 function forgetPaid(order){if(order)writePaid(paidRecords().filter(x=>x.id!==order.id||x.sku!==order.sku||x.mode!==order.mode));}
 function invalidReceipt(error){return error?.httpStatus===403&&error?.apiError==="ORDER_ACCESS_REQUIRED";}
 function failure(code){const e=new Error(code);e.code=code;return e;}
 function loadSdk(mode){
  if(sdkMode&&sdkMode!==mode)return Promise.reject(failure("sdk_mode_changed"));
  if(sdkPromise)return sdkPromise;
  sdkMode=mode;sdkPromise=new Promise((resolve,reject)=>{
   const script=document.createElement("script");script.async=true;script.src=mode==="live"?"https://www.paypal.com/web-sdk/v6/core":"https://www.sandbox.paypal.com/web-sdk/v6/core";
   const timer=setTimeout(()=>finish(false),15000);let settled=false;
   function finish(ok){if(settled)return;settled=true;clearTimeout(timer);if(ok)resolve(window.paypal);else{script.remove();sdkPromise=null;sdkMode=null;reject(failure("sdk_unavailable"));}}
   script.onload=()=>finish(typeof window.paypal?.createInstance==="function");script.onerror=()=>finish(false);document.head.appendChild(script);
  });return sdkPromise;
 }
 async function request(path,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const r=await fetch(API+path,{...options,signal:controller.signal,cache:"no-store"}),data=await r.json().catch(()=>null);if(!r.ok||!data)throw Object.assign(failure("request_failed"),{httpStatus:r.status,apiError:data?.error});return data;}
  finally{clearTimeout(timer);}
 }
 function validateStatus(info,order,sku,mode){
  const actual=orderQuote(info),expected=orderQuote(order),productPrice=Number(info?.product?.price);
  if(info?.provider!=="paypal"||info.id!==order.id||info.product?.id!==sku||!actual||!Number.isFinite(productPrice)||Math.abs(productPrice-actual.amount)>.001||info.live_mode!==(mode==="live"))throw failure("status_mismatch");
  if(expected&&(actual.currency!==expected.currency||Math.abs(actual.amount-expected.amount)>.001||(expected.pricing_version&&actual.pricing_version!==expected.pricing_version)))throw failure("status_mismatch");
  if(info.status==="approved"&&(!ID.test(String(info.payment_id||""))||!/^jd_purchase_[a-f0-9]{64}$/.test(String(info.event_id||""))))throw failure("approval_invalid");
  return info;
 }
 async function mount(options){
  const {container,sku,configuration:c}=options,previous=options.pending,recoveryOnly=previous?.recoveryOnly===true;
  let quote=previous?orderQuote(previous):orderQuote(options.quote),priceChanged=false;
  if(!SKU.test(String(sku))||(!previous&&(!quote||!quote.pricing_version))||(previous&&(previous.sku!==sku||!ID.test(String(previous.id))||!TOKEN.test(String(previous.token))||!["live","sandbox"].includes(previous.mode))))throw failure("invalid_product");
  if(recoveryOnly&&(!receiptEntry(options.pending)||options.pending.sku!==sku||(["sandbox","live"].includes(c?.mode)&&options.pending.mode!==c.mode)))throw failure("receipt_invalid");
  let active=true,busy=false,button=null,session=null,timer=null,attempt=null,capturePromise=null,creating=null,createKey=null,cancelRequested=false;
  const current=()=>active&&options.isCurrent();
  const signalBusy=value=>{busy=value;if(current()){if(button)button.disabled=value||!!attempt?.approvedByBuyer;options.onBusy?.(value);}};
  function unmount(){active=false;clearTimeout(timer);timer=null;container.replaceChildren();}
  function clearAttempt(){if(attempt){forgetPaid(attempt);forget(attempt.id);}attempt=null;capturePromise=null;createKey=null;cancelRequested=false;options.onOrder?.(null);}
  function capturePending(info){return info?.capture_pending===true||info?.provider_status==="COMPLETED";}
  function definitelyUnpaid(info){return info?.status==="pending"&&["CREATED","PAYER_ACTION_REQUIRED"].includes(info.provider_status)&&info.capture_pending===false;}
  function resumable(info){return definitelyUnpaid(info)||(info?.status==="pending"&&info.provider_status==="APPROVED"&&info.capture_pending===false);}
  function acceptQuote(info){
   quote=orderQuote(info);attempt={...attempt,...quote};
   if(!recoveryOnly)remember(attempt);
   options.onQuote?.({...quote},info.product);
  }
  async function readStatus(){const info=await request("/api/paypal/orders/"+encodeURIComponent(attempt.id),{headers:{accept:"application/json","x-order-access":attempt.token}});validateStatus(info,attempt,sku,attempt.mode);acceptQuote(info);return info;}
  function status(info){
   if(!current())return;
   validateStatus(info,attempt,sku,attempt.mode);acceptQuote(info);
   if(info.status==="approved"&&rememberPaid(attempt))forget(attempt.id);
   signalBusy(false);options.onStatus(info);
   if(["rejected","cancelled","refunded","charged_back","failed"].includes(info.status)){clearAttempt();if(button)button.disabled=false;}
  }
  async function poll(count=0){
   if(!current()||!attempt)return;
   try{
    const info=await readStatus();
    if(cancelRequested&&definitelyUnpaid(info)&&!capturePromise){clearAttempt();signalBusy(false);options.onCancel?.();return;}
    status(info);if(info.status!=="pending")return;
   }catch(error){if(current()){if(recoveryOnly&&invalidReceipt(error)){clearAttempt();signalBusy(false);options.onError?.("receipt_invalid");return;}options.onPending?.();}}
   if(current()&&count<119)timer=setTimeout(()=>poll(count+1),3000);
  }
  async function capture(){
   if(capturePromise)return capturePromise;
   if(!attempt||!current()||recoveryOnly)return;
   cancelRequested=false;attempt.approvedByBuyer=true;remember(attempt);signalBusy(true);
   capturePromise=(async()=>{
    try{
     const info=await request("/api/paypal/orders/"+encodeURIComponent(attempt.id)+"/capture",{method:"POST",headers:{"content-type":"application/json","x-order-access":attempt.token},body:"{}"});
     status(info);if(info.status==="pending")poll();
    }catch{if(current()){signalBusy(false);options.onPending?.();poll();}}
   })();
   return capturePromise;
  }
  async function createOrder(){
   if(recoveryOnly)throw failure("recovery_only");
   if(attempt)return{orderId:attempt.id};
   if(creating)return creating;
   if(!createKey)createKey=crypto.randomUUID();
   creating=(async()=>{
    const body={productId:sku,locale:options.locale,attribution:options.attribution||{},quote:{currency:quote.currency,pricing_version:quote.pricing_version}};
    try{const analytics=window.LumenAnalytics?.checkoutContext();if(analytics)body.analytics=analytics;}catch{}
    let data;
    try{data=await request("/api/paypal/orders",{method:"POST",headers:{"content-type":"application/json","x-idempotency-key":createKey},body:JSON.stringify(body)});}
    catch(error){if(error.httpStatus===409&&error.apiError==="PRICE_CHANGED"){priceChanged=true;createKey=null;signalBusy(false);options.onPriceChanged?.();throw failure("price_changed");}throw error;}
    if(!current())throw failure("stale_checkout");
    if(data.provider!=="paypal"||!ID.test(String(data.id||""))||!TOKEN.test(String(data.order_access||"")))throw failure("order_invalid");
    const actual=orderQuote(data);
    attempt={provider:"paypal",id:data.id,sku,token:data.order_access,mode:c.mode,at:Date.now(),approvedByBuyer:false,...(actual||{})};remember(attempt);options.onOrder?.(attempt);
    if(!actual||!actual.pricing_version||data.live_mode!==(c.mode==="live"))throw failure("order_invalid");
    // An idempotent replay keeps its original server quote even if the visitor's market changed.
    quote=actual;options.onQuote?.({...quote},data.product);
    return{orderId:attempt.id};
   })();
   try{return await creating;}finally{creating=null;}
  }
  async function reconcile(cancel=false){
   if(!current()||priceChanged)return;cancelRequested=cancel;signalBusy(true);
   if(creating)try{await creating;}catch{}
   if(!attempt){signalBusy(false);if(cancel)options.onCancel?.();else options.onError?.("payment_unavailable");return;}
   try{
    const info=await readStatus();if(!current())return;
    if(info.status!=="pending"){status(info);return;}
    if(capturePending(info)){
     attempt.approvedByBuyer=true;remember(attempt);signalBusy(false);options.onPending?.();
     poll();
     return;
    }
    if(cancel&&definitelyUnpaid(info)&&!capturePromise){clearAttempt();signalBusy(false);options.onCancel?.();return;}
    signalBusy(false);if(cancel&&!resumable(info)){options.onPending?.();poll();}else options.onError?.("payment_unavailable");
   }catch{if(current()){signalBusy(false);options.onPending?.();poll();}}
  }
  const cancelled=()=>reconcile(true),errored=()=>reconcile(false);
  if(previous&&previous.sku===sku){
   attempt=previous;options.onOrder?.(attempt);signalBusy(true);
   try{
    const info=await readStatus();if(!current())return{unmount};
    if(info.status!=="pending"){status(info);return{unmount};}
    if(recoveryOnly){signalBusy(false);options.onPending?.();poll();return{unmount};}
    if(capturePending(info)){
     attempt.approvedByBuyer=true;remember(attempt);signalBusy(false);options.onPending?.();
     poll();
     return{unmount};
    }
    if(!resumable(info)){signalBusy(false);options.onPending?.();poll();return{unmount};}
    attempt.approvedByBuyer=false;remember(attempt);signalBusy(false);
   }catch(error){if(current()){signalBusy(false);if(recoveryOnly&&invalidReceipt(error)){clearAttempt();options.onError?.("receipt_invalid");}else{options.onPending?.();poll();}}return{unmount};}
  }
  if(!configured(c))throw failure("paypal_disabled");
  if(previous&&previous.mode!==c.mode)throw failure("sdk_mode_changed");
  const sdk=await loadSdk(c.mode);if(!current())return{unmount};
  const instance=await sdk.createInstance({clientId:c.clientId,components:["paypal-payments"],pageType:"checkout",locale:options.locale==="pt"?"pt-BR":options.locale==="es"?"es-MX":"en-US"});
  if(!current())return{unmount};
  const eligible=await instance.findEligibleMethods({currencyCode:quote.currency,amount:quote.amount.toFixed(2)});
  if(!current())return{unmount};
  if(!eligible.isEligible("paypal"))throw failure("not_eligible");
  session=await instance.createPayPalOneTimePaymentSession({
   onApprove:async data=>{if(!current()||!attempt||data?.orderId!==attempt.id)return;await capture();},
   onCancel:cancelled,onError:errored
  });
  if(!current())return{unmount};
  button=document.createElement("paypal-button");button.setAttribute("type","pay");
  button.addEventListener("click",()=>{
   if(!current()||busy||priceChanged)return;signalBusy(true);
   // Start within the click gesture; do not await order creation before opening the UI.
   const orderPromise=createOrder();
   try{Promise.resolve(session.start({presentationMode:"auto"},orderPromise)).catch(errored);}
   catch{orderPromise.catch(()=>{});errored();}
  });
  container.replaceChildren(button);options.onReady?.({...quote});
  return{unmount};
 }
 window.LumenPayPal=Object.freeze({configured,readConfiguration,pendingOrder,paidOrder,mount});
})();


