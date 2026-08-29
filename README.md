# V1.1 JSONP 修正版

此版改用 JSONP 讀取 Apps Script API，避免 GitHub Pages 跨網域 fetch 問題。

# 股市投資秘書 PWA V1

## 1. 設定 API
打開 `config.js`，把：

PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE

換成你的 Apps Script Web App `/exec` 網址。

如果有設定 `INVEST_APP_API_KEY`，再把 key 填入 `INVEST_API_KEY`。

## 2. 上線方式
建議最簡單使用：
- GitHub Pages
- Cloudflare Pages
- Netlify

將整個資料夾上傳即可。

## 3. 手機安裝
Android Chrome：
開啟網站 → 選單 →「安裝應用程式」或「加入主畫面」

iPhone Safari：
開啟網站 → 分享 →「加入主畫面」

## 4. V1 畫面
- 今日 Top5
- 操作訊號
- 決策分數
- 45日勝率 / 預估報酬 / EV / MAE
- 進場、停損、停利、部位
- 系統資料狀態
- 最近績效

## 5. 安全
前端中的 API key 不能視為真正秘密。
若未來要公開給其他人使用，請改成正式登入驗證。
