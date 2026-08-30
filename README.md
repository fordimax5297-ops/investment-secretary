# 股市投資秘書 PWA V1.2 — ShortTop5

新增：
- 波段 Top5（30–45D）保留不動
- 新增短線 Top5（10–20D）頁籤
- 顯示 10D / 20D 歷史經驗勝率
- 顯示預估報酬、EV、MAE、進場、停損、目標與部位

重要：
此更新包刻意不包含 config.js。
GitHub 上原本已設定 API URL / API KEY 的 config.js 請保留，不要覆蓋。

部署：
1. Apps Script 使用 InvestmentSecretaryApi_V1_2_ShortTop5.gs
2. 建立新部署版本
3. 測試 ?action=shorttop5&key=你的KEY
4. GitHub 僅覆蓋本 ZIP 內檔案
