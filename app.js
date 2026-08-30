const $ = (id) => document.getElementById(id);

function apiUrl(action, extra = {}) {
  if (!INVEST_API_BASE || INVEST_API_BASE.includes("PASTE_YOUR")) {
    throw new Error("請先在 config.js 設定 INVEST_API_BASE");
  }
  const u = new URL(INVEST_API_BASE);
  u.searchParams.set("action", action);
  if (INVEST_API_KEY) u.searchParams.set("key", INVEST_API_KEY);
  Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

function fetchJson(action, extra = {}) {
  return new Promise((resolve, reject) => {
    let callbackName = "__investApiCb_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);

    const u = new URL(INVEST_API_BASE);
    u.searchParams.set("action", action);
    if (INVEST_API_KEY) u.searchParams.set("key", INVEST_API_KEY);
    Object.entries(extra || {}).forEach(([k, v]) => u.searchParams.set(k, v));
    u.searchParams.set("callback", callbackName);

    const script = document.createElement("script");
    let timer;

    function cleanup() {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
    }

    window[callbackName] = function(json) {
      cleanup();
      if (!json || json.ok !== true) {
        reject(new Error((json && json.error) || "API error"));
        return;
      }
      resolve(json.data);
    };

    script.src = u.toString();
    script.async = true;

    script.onerror = function() {
      cleanup();
      reject(new Error("API 載入失敗"));
    };

    timer = setTimeout(function() {
      cleanup();
      reject(new Error("API 連線逾時"));
    }, 15000);

    document.head.appendChild(script);
  });
}

function pct(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function num(v, d = 2) {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toFixed(d).replace(/\.00$/,"");
}

function actionClass(a="") {
  if (a.includes("買進")) return "buy";
  if (a.includes("準備")) return "ready";
  return "watch";
}

function renderTop5(data) {
  $("tradeDate").textContent = data.tradeDate || "—";
  $("topCount").textContent = data.count ?? "—";
  const root = $("top5List");
  root.innerHTML = "";

  if (!data.items?.length) {
    root.innerHTML = `<div class="empty">目前沒有 Top5 資料</div>`;
    return;
  }

  data.items.forEach(x => {
    const el = document.createElement("article");
    el.className = "stock-card";
    el.innerHTML = `
      <div class="stock-top">
        <div>
          <div class="stock-name">${x.rank}. ${x.stockName}</div>
          <div class="stock-code">${x.stockId}｜${x.industry || ""}</div>
        </div>
        <div class="action ${actionClass(x.action)}">${x.action || "—"}</div>
      </div>

      <div class="score-row">
        <div class="metric"><div class="k">決策分數</div><div class="v">${num(x.decisionScore)}</div></div>
        <div class="metric"><div class="k">45日勝率</div><div class="v">${pct(x.winRate45D)}</div></div>
        <div class="metric"><div class="k">45日預估報酬</div><div class="v positive">${pct(x.expectedReturn45D)}</div></div>
      </div>

      <div class="levels">
        <div>進場區<b>${num(x.entryLow)} ～ ${num(x.entryHigh)}</b></div>
        <div>停損<b>${num(x.stopLoss)}</b></div>
        <div>第一停利<b>${num(x.target1)}</b></div>
        <div>第二停利<b>${num(x.target2)}</b></div>
        <div>EV45<b>${pct(x.expectedValue45D)}</b></div>
        <div>MAE45<b>${pct(x.mae45D)}</b></div>
        <div>建議股數<b>${x.suggestedShares ?? "—"}</b></div>
        <div>建議部位<b>${pct(x.suggestedPositionPct)}</b></div>
      </div>
    `;
    root.appendChild(el);
  });
}


function renderShortTop5(data) {
  const root = $("shortTop5List");
  root.innerHTML = "";

  if (!data.items?.length) {
    root.innerHTML = `<div class="empty">目前沒有短線 Top5 資料</div>`;
    return;
  }

  data.items.forEach(x => {
    const el = document.createElement("article");
    el.className = "stock-card";
    el.innerHTML = `
      <div class="stock-top">
        <div>
          <div class="stock-name">${x.rank}. ${x.stockName}</div>
          <div class="stock-code">${x.stockId}｜${x.industry || ""}</div>
          <div class="short-badge">${x.holdingDays || "10–20D"}｜風險 ${x.riskLevel || "—"}</div>
        </div>
        <div class="action ${actionClass(x.action)}">${x.action || "—"}</div>
      </div>

      <div class="score-row">
        <div class="metric"><div class="k">短線分數</div><div class="v">${num(x.shortScore)}</div></div>
        <div class="metric"><div class="k">10D 歷史經驗勝率</div><div class="v">${pct(x.winRate10D)}</div></div>
        <div class="metric"><div class="k">20D 歷史經驗勝率</div><div class="v">${pct(x.winRate20D)}</div></div>
      </div>

      <div class="score-row">
        <div class="metric"><div class="k">10D 預估報酬</div><div class="v ${Number(x.expectedReturn10D)>=0?'positive':'negative'}">${pct(x.expectedReturn10D)}</div></div>
        <div class="metric"><div class="k">20D 預估報酬</div><div class="v ${Number(x.expectedReturn20D)>=0?'positive':'negative'}">${pct(x.expectedReturn20D)}</div></div>
        <div class="metric"><div class="k">20D EV</div><div class="v ${Number(x.expectedValue20D)>=0?'positive':'negative'}">${pct(x.expectedValue20D)}</div></div>
      </div>

      <div class="levels">
        <div>進場區<b>${num(x.entryLow)} ～ ${num(x.entryHigh)}</b></div>
        <div>停損<b>${num(x.stopLoss)}</b></div>
        <div>第一目標<b>${num(x.target1)}</b></div>
        <div>第二目標<b>${num(x.target2)}</b></div>
        <div>20D MAE<b>${pct(x.mae20D)}</b></div>
        <div>建議部位<b>${pct(x.suggestedPositionPct)}</b></div>
      </div>

      <div class="reason">${x.reason || ""}</div>
    `;
    root.appendChild(el);
  });
}

function renderHealth(data) {
  const root = $("healthGrid");
  root.innerHTML = "";
  const items = [
    ["Top5", data.sheets?.top5?.rows],
    ["績效", data.sheets?.performance?.rows],
    ["Final", data.sheets?.final?.rows],
    ["封存", data.sheets?.archive?.rows]
  ];
  items.forEach(([name,value]) => {
    const el = document.createElement("div");
    el.className = "health-card";
    el.innerHTML = `<div class="name">${name}</div><div class="value">${value ?? "—"}</div>`;
    root.appendChild(el);
  });
}

function renderPerformance(data) {
  const root = $("performanceList");
  root.innerHTML = "";
  if (!data.items?.length) {
    root.innerHTML = `<div class="empty">尚未累積績效資料</div>`;
    return;
  }

  data.items.slice(0, 10).forEach(x => {
    const el = document.createElement("div");
    el.className = "performance-row";
    el.innerHTML = `
      <div><b>${x.stockId} ${x.stockName}</b><div class="small">${x.tradeDate}</div></div>
      <div><div class="small">5D</div><b>${pct(x.return5D)}</b></div>
      <div><div class="small">20D</div><b>${pct(x.return20D)}</b></div>
      <div><div class="small">45D</div><b>${pct(x.return45D)}</b></div>
    `;
    root.appendChild(el);
  });
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

async function loadAll() {
  $("refreshBtn").disabled = true;
  try {
    const [health, top5, shortTop5, perf] = await Promise.all([
      fetchJson("health"),
      fetchJson("top5"),
      fetchJson("shorttop5"),
      fetchJson("performance", { limit: 10 })
    ]);
    renderHealth(health);
    renderTop5(top5);
    renderShortTop5(shortTop5);
    renderPerformance(perf);
    toast("資料已更新");
  } catch (err) {
    console.error(err);
    toast(err.message || "載入失敗");
  } finally {
    $("refreshBtn").disabled = false;
  }
}

$("refreshBtn").addEventListener("click", loadAll);

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    if (view === "top5") window.scrollTo({top:0, behavior:"smooth"});
    if (view === "performance") $("performanceList").scrollIntoView({behavior:"smooth"});
    if (view === "system") $("healthGrid").scrollIntoView({behavior:"smooth"});
  });
});


function setStrategyView(mode) {
  const isShort = mode === "short";
  $("swingSection").classList.toggle("hidden", isShort);
  $("shortSection").classList.toggle("hidden", !isShort);
  $("swingTab").classList.toggle("active", !isShort);
  $("shortTab").classList.toggle("active", isShort);
  $("topCount").textContent = isShort ? "短線 5" : "波段 5";
}

$("swingTab").addEventListener("click", () => setStrategyView("swing"));
$("shortTab").addEventListener("click", () => setStrategyView("short"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}

loadAll();
