const $ = id => document.getElementById(id);

function apiUrl(action, extra={}) {
  if (typeof INVEST_API_BASE === "undefined" || !INVEST_API_BASE) {
    throw new Error("config.js 尚未設定 INVEST_API_BASE");
  }
  const u = new URL(INVEST_API_BASE);
  u.searchParams.set("action", action);
  if (typeof INVEST_API_KEY !== "undefined" && INVEST_API_KEY) u.searchParams.set("key", INVEST_API_KEY);
  Object.entries(extra).forEach(([k,v]) => u.searchParams.set(k,v));
  return u;
}

function fetchJson(action, extra={}) {
  return new Promise((resolve,reject)=>{
    const cb="__investCb_"+Date.now()+"_"+Math.floor(Math.random()*1e6);
    const u=apiUrl(action,extra); u.searchParams.set("callback",cb);
    const s=document.createElement("script");
    let timer;
    const clean=()=>{clearTimeout(timer); if(s.parentNode)s.parentNode.removeChild(s); try{delete window[cb]}catch(e){window[cb]=undefined;}};
    window[cb]=json=>{clean(); if(!json||json.ok!==true)return reject(new Error((json&&json.error)||"API error")); resolve(json.data);};
    s.src=u.toString(); s.async=true;
    s.onerror=()=>{clean(); reject(new Error("API 載入失敗"));};
    timer=setTimeout(()=>{clean(); reject(new Error("API 連線逾時"));},15000);
    document.head.appendChild(s);
  });
}

const num=(v,d=2)=>{if(v===null||v===undefined||v==="")return"—";const n=Number(v);return Number.isFinite(n)?n.toFixed(d).replace(/\.00$/,""):"—";};
const pct=v=>{if(v===null||v===undefined||v==="")return"—";const n=Number(v);return Number.isFinite(n)?`${n>0?"+":""}${n.toFixed(2)}%`:"—";};

function actionClass(a=""){
  if(a.includes("低檔佈局")||a.includes("LAYOUT")) return "layout";
  if(a.includes("突破啟動")||a.includes("TRIGGERED")) return "trigger";
  if(a.includes("買進")||a.includes("BUY")) return "buy";
  if(a.includes("準備")||a.includes("READY")||a.includes("等待突破")||a.includes("WAIT_BREAK")) return "ready";
  if(a.includes("REMOVE")||a.includes("排除")) return "remove";
  return "watch";
}

let swingItems=[], shortItems=[], preItems=[];

function counts(items){
  const c={buy:0,ready:0,watch:0};
  items.forEach(x=>{
    const a=String(x.action||"");
    if(a.includes("買進")||a.includes("BUY"))c.buy++;
    else if(a.includes("準備")||a.includes("READY"))c.ready++;
    else c.watch++;
  });
  return c;
}

function renderSummary(){
  const s=counts(swingItems), q=counts(shortItems);
  $("swingBuy").textContent=s.buy; $("swingReady").textContent=s.ready; $("swingWatch").textContent=s.watch;
  $("shortBuy").textContent=q.buy; $("shortReady").textContent=q.ready; $("shortWatch").textContent=q.watch;

  let layout=0,wait=0,trig=0;
  preItems.forEach(x=>{
    const a=String(x.originalAction||x.action||"");
    if(a.includes("LAYOUT")||String(x.action||"").includes("低檔佈局")) layout++;
    else if(a.includes("TRIGGERED")||String(x.action||"").includes("突破啟動")) trig++;
    else if(a.includes("WAIT_BREAK")||String(x.action||"").includes("等待突破")) wait++;
  });
  $("preLayout").textContent=layout; $("preWait").textContent=wait; $("preTriggered").textContent=trig;
}

function standardRow(x,type){
  const isShort=type==="short";
  const score=isShort?x.shortScore:x.decisionScore;
  const win=isShort?x.winRate20D:x.winRate45D;
  const ev=isShort?x.expectedValue20D:x.expectedValue45D;
  return `<div class="stock-row" data-type="${type}" data-id="${x.stockId}">
    <div class="rank">${x.rank}</div>
    <div class="stock-name"><b>${x.stockName}</b><small>${x.stockId}｜${x.industry||""}</small></div>
    <div><span class="status-pill ${actionClass(x.action)}">${x.action||"—"}</span></div>
    <div class="metric"><span>${isShort?"Short":"Decision"}</span><b>${num(score)}</b></div>
    <div class="metric hide-mobile"><span>${isShort?"20D":"45D"}勝率</span><b>${pct(win)}</b></div>
    <div class="metric hide-mobile"><span>${isShort?"20D":"45D"} EV</span><b class="${Number(ev)>=0?"positive":"negative"}">${pct(ev)}</b></div>
  </div>`;
}

function preRow(x){
  return `<div class="stock-row" data-type="pre" data-id="${x.stockId}">
    <div class="rank">${x.rank}</div>
    <div class="stock-name"><b>${x.stockName}</b><small>${x.stockId}｜${x.industry||""}</small></div>
    <div><span class="status-pill ${actionClass(x.action)}">${x.action||"—"}</span></div>
    <div class="metric"><span>PreScore</span><b>${num(x.score)}</b></div>
    <div class="metric hide-mobile"><span>扣低日</span><b>${num(x.lowDeductDay10,0)}D</b></div>
    <div class="metric hide-mobile"><span>扣低幅度</span><b>${pct(x.deductDrop10Pct)}</b></div>
  </div>`;
}

function renderLists(){
  $("swingList").innerHTML=swingItems.map(x=>standardRow(x,"swing")).join("");
  $("shortList").innerHTML=shortItems.map(x=>standardRow(x,"short")).join("");
  $("preBreakoutList").innerHTML=preItems.map(preRow).join("");

  document.querySelectorAll(".stock-row").forEach(el=>{
    el.addEventListener("click",()=>{
      let list=swingItems;
      if(el.dataset.type==="short")list=shortItems;
      if(el.dataset.type==="pre")list=preItems;
      const item=list.find(x=>String(x.stockId)===String(el.dataset.id));
      if(item) showDetail(item,el.dataset.type);
    });
  });
}

function setGauge(id,value,color){
  const n=Math.max(0,Math.min(100,Number(value)||0));
  $(id).style.setProperty("--pct",n); $(id).style.setProperty("--gc",color);
}

function showDetail(x,type){
  $("detailEmpty").classList.add("hidden"); $("detailContent").classList.remove("hidden");

  if(type==="pre"){
    $("detailBreadcrumb").textContent=`潛伏 Top 5 > #${x.rank}`;
    $("detailTitle").textContent=`${x.stockName} ${x.stockId}`;
    $("detailMeta").textContent=`${x.industry||""}｜季線扣低策略`;
    $("detailAction").textContent=x.action||"—"; $("detailAction").className=`status-pill ${actionClass(x.action)}`;
    $("detailScoreLabel").textContent="PreBreakout Score"; $("detailScore").textContent=num(x.score); $("detailPosition").textContent="分批潛伏";
    $("winLabel1").textContent="低扣抵點"; $("winLabel2").textContent="距季線";
    $("win1").textContent=`${num(x.lowDeductDay10,0)}D`; $("win2").textContent=pct(x.distanceMA60Pct);
    $("detailEV").textContent=pct(x.deductDrop10Pct); $("detailMAE").textContent=pct(x.breakoutGapPct);
    $("entryRange").textContent=`${num(x.entryLow)} ～ ${num(x.entryHigh)}`; $("stopLoss").textContent=num(x.stopLoss);
    $("target1").textContent=num(x.triggerPrice); $("target2").textContent=num(x.exitAlertPrice); $("holdingDays").textContent="等待季線翻揚 / 突破";
    $("gaugeTitle").textContent="扣低 / 位階 / 量縮";
    $("gauge1Label").textContent="扣低"; $("gauge2Label").textContent="位階"; $("gauge3Label").textContent="量縮";
    const g1=Math.max(0,Math.min(100,(Number(x.deductDrop10Pct)||0)/8*100));
    const dist=Math.abs(Number(x.distanceMA60Pct)||0), g2=Math.max(0,100-Math.min(100,dist/15*100));
    const vr=Number(x.volumeRatio20), g3=Number.isFinite(vr)?Math.max(0,100-Math.abs(vr-.65)/1.2*100):50;
    $("gauge1Value").textContent=num(g1,0); $("gauge2Value").textContent=num(g2,0); $("gauge3Value").textContent=num(g3,0);
    setGauge("gauge1",g1,"#b38cff"); setGauge("gauge2",g2,"#45a3ff"); setGauge("gauge3",g3,"#3ee48b");
    $("detailReason").textContent=x.reason||"—"; $("riskLevel").textContent=x.chipState||"—"; $("riskReason").textContent=`來源：${x.sourcePrior||"—"}｜量比 ${num(x.volumeRatio20)}`;
    $("detailPanel").scrollIntoView({behavior:"smooth",block:"start"}); return;
  }

  const isShort=type==="short", score=isShort?x.shortScore:x.decisionScore;
  $("detailBreadcrumb").textContent=`${isShort?"短線":"波段"} Top 5 > #${x.rank}`;
  $("detailTitle").textContent=`${x.stockName} ${x.stockId}`; $("detailMeta").textContent=`${x.industry||""}｜${isShort?(x.holdingDays||"10–20D"):"30–45D"}`;
  $("detailAction").textContent=x.action||"—"; $("detailAction").className=`status-pill ${actionClass(x.action)}`;
  $("detailScoreLabel").textContent=isShort?"Short Score":"Decision Score"; $("detailScore").textContent=num(score); $("detailPosition").textContent=pct(x.suggestedPositionPct);
  $("winLabel1").textContent=isShort?"10D 經驗勝率":"30D 經驗勝率"; $("winLabel2").textContent=isShort?"20D 經驗勝率":"45D 經驗勝率";
  $("win1").textContent=pct(isShort?x.winRate10D:x.winRate30D); $("win2").textContent=pct(isShort?x.winRate20D:x.winRate45D);
  $("detailEV").textContent=pct(isShort?x.expectedValue20D:x.expectedValue45D); $("detailMAE").textContent=pct(isShort?x.mae20D:x.mae45D);
  $("entryRange").textContent=`${num(x.entryLow)} ～ ${num(x.entryHigh)}`; $("stopLoss").textContent=num(x.stopLoss); $("target1").textContent=num(x.target1); $("target2").textContent=num(x.target2);
  $("holdingDays").textContent=isShort?(x.holdingDays||"10–20D"):"30–45D";

  if(isShort){
    $("gaugeTitle").textContent="技術 / 籌碼 / 主力"; $("gauge1Label").textContent="技術"; $("gauge2Label").textContent="籌碼"; $("gauge3Label").textContent="主力";
    $("gauge1Value").textContent=num(x.technicalScore,0); $("gauge2Value").textContent=num(x.chipScore,0); $("gauge3Value").textContent=num(x.brokerScore,0);
    setGauge("gauge1",x.technicalScore,"#3ee48b"); setGauge("gauge2",x.chipScore,"#ffbd3e"); setGauge("gauge3",x.brokerScore,"#45a3ff");
  }else{
    $("gaugeTitle").textContent="Decision / Final / TradeEdge"; $("gauge1Label").textContent="Decision"; $("gauge2Label").textContent="Final"; $("gauge3Label").textContent="TradeEdge";
    $("gauge1Value").textContent=num(x.decisionScore,0); $("gauge2Value").textContent=num(x.finalScore,0); $("gauge3Value").textContent=num(x.tradeEdgeScore,0);
    setGauge("gauge1",x.decisionScore,"#3ee48b"); setGauge("gauge2",x.finalScore,"#ffbd3e"); setGauge("gauge3",x.tradeEdgeScore,"#45a3ff");
  }
  $("detailReason").textContent=x.reason||x.execution||"—"; $("riskLevel").textContent=x.riskLevel||"—"; $("riskReason").textContent=x.riskReason||x.strategyPath||"—";
  $("detailPanel").scrollIntoView({behavior:"smooth",block:"start"});
}

function renderPerformance(data){
  const root=$("performanceList"); root.innerHTML="";
  if(!data.items?.length){root.innerHTML='<div class="health-card">尚未累積績效資料</div>'; return;}
  data.items.slice(0,8).forEach(x=>{
    const el=document.createElement("div"); el.className="performance-row";
    el.innerHTML=`<div><b>${x.stockId} ${x.stockName}</b><div class="small">${x.tradeDate}</div></div>
      <div><div class="small">5D</div><b>${pct(x.return5D)}</b></div>
      <div><div class="small">20D</div><b>${pct(x.return20D)}</b></div>
      <div><div class="small">45D</div><b>${pct(x.return45D)}</b></div>`;
    root.appendChild(el);
  });
}

function renderHealth(data){
  const root=$("healthGrid"); root.innerHTML="";
  [["波段 Top5",data.sheets?.top5?.rows],["短線 Top5",data.sheets?.shortTop5?.rows],["潛伏 Top5",data.sheets?.preBreakoutTop5?.rows],["Final",data.sheets?.final?.rows],["績效",data.sheets?.performance?.rows]].forEach(([n,v])=>{
    const el=document.createElement("div"); el.className="health-card"; el.innerHTML=`<div class="name">${n}</div><div class="value">${v??"—"}</div>`; root.appendChild(el);
  });
}

function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800);}

async function loadAll(){
  $("refreshBtn").disabled=true;
  try{
    const [health,swing,short,pre,perf]=await Promise.all([
      fetchJson("health"),fetchJson("top5"),fetchJson("shorttop5"),fetchJson("prebreakout"),fetchJson("performance",{limit:10})
    ]);
    $("tradeDate").textContent=swing.tradeDate||short.tradeDate||pre.tradeDate||health.latestArchiveTradeDate||"—";
    swingItems=swing.items||[]; shortItems=short.items||[]; preItems=pre.items||[];
    renderSummary(); renderLists(); renderPerformance(perf); renderHealth(health); toast("資料已更新");
  }catch(err){console.error(err); toast(err.message||"載入失敗");}
  finally{$("refreshBtn").disabled=false;}
}

document.querySelectorAll("[data-target]").forEach(btn=>btn.addEventListener("click",()=>{const el=$(btn.dataset.target); if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}));
$("refreshBtn").addEventListener("click",loadAll);
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=3001"));}
loadAll();
