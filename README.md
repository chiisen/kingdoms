# 三分天下 · 百將風雲 / Three Kingdoms: Hundred Heroes

三國題材回合制策略網頁遊戲：從曹操、劉備、孫權三方擇一，在 15 座城池之間經營錢糧、調兵攻城，統率 108 位武將逐鹿天下。

本專案是 [MartinDelophy/awesome-gpt-6-astra · works/three-kingdoms](https://github.com/MartinDelophy/awesome-gpt-6-astra/tree/main/works/three-kingdoms) 的複刻實作：**沿用該專案的地形圖與三張武將頭像圖集，重現同一套遊戲規則與介面功能**，並把建置與介面層改寫為 Vite + React 19 + TypeScript + Tailwind CSS 4（不再依賴 `vinext`、Base UI 與 shadcn 產生器）。

An original turn-based Three Kingdoms browser strategy game, ported from the reference project above: same assets, same rules, rebuilt on Vite + React 19 + TypeScript + Tailwind CSS 4.

## 快速開始

需要 Node.js 22.13 以上與 npm。

```sh
npm install
npm run dev        # 開發伺服器，開啟終端機顯示的網址
```

其他指令：

```sh
npm run build      # 產生靜態網站到 dist/
npm run preview    # 以本機伺服器預覽 dist/
npm test           # 引擎規則與回歸測試（23 項）
npm run typecheck  # TypeScript 型別檢查
```

`dist/` 是純靜態輸出，可直接放到任何靜態主機；請以 HTTP 提供整個目錄，不要直接以 `file://` 開啟 `index.html`。

## 玩法

- **經營城池**：開墾農田、發展商貿、徵募兵卒、操練軍隊、修築城防，每次消耗 1 道政令。可自動擇優任命執行武將，智略越高越省錢；武將執行後休整 2 回合。
- **調兵出征**：只能沿道路進軍相鄰城池，也能向友城增援。出征需留守 1,000 兵、消耗軍糧，主將統率決定帶兵上限。出征前會預測勝敗與預估餘部。
- **百將圖鑑**：以姓名、定位或專長搜尋，依勢力篩選，查看頭像與統率／武力／智略。
- **統一十五城**：與兩個 AI 勢力競爭，佔領全部 15 城且無敵軍在外即獲勝。新佔城池安民 2 回合，產出減半。
- **存檔**：每次行動自動存入瀏覽器，可匯出／匯入 JSON 繼續戰局（含舊版存檔遷移）。

介面為簡體中文（與參考專案一致），支援滑鼠與觸控，建議使用現代桌面瀏覽器。

## 專案結構

```
├── index.html
├── src/
│   ├── main.tsx / App.tsx          掛載與入口
│   ├── game/
│   │   ├── engine.ts               地圖、經濟、戰鬥、AI、存檔驗證與遷移
│   │   ├── officers.ts             108 位武將資料與頭像圖集映射
│   │   ├── Portrait.tsx            以 CSS 裁切圖集單格
│   │   └── Game.tsx                遊戲介面：地圖、城池面板、圖鑑、戰報、對話框
│   ├── components/ui/              Dialog / AlertDialog / Select / Slider / Tabs / Input
│   ├── lib/utils.ts
│   └── styles/
│       ├── globals.css             遊戲主題與全部版面樣式
│       └── ui.css                  UI primitive 基礎樣式
├── public/
│   ├── terrain.jpg                 水墨戰略地形圖
│   └── portraits/{wei,shu,wu}-v2.jpg
├── scripts/test-engine.mjs         引擎測試（node:test + esbuild）
└── docs/
    ├── analysis-plan.md            分析與規劃（需求拆解、技術選型、驗證結果）
    └── reference/                  上游專案文件（原始需求、平衡報告、頭像生成提示詞）
```

## 技術選型

| 項目 | 參考專案 | 本專案 |
| --- | --- | --- |
| 建置 | vinext（RSC） | Vite 8（純客戶端 SPA） |
| 樣式 | Tailwind CSS 4 + `shadcn/tailwind.css` | Tailwind CSS 4（`@tailwindcss/vite`） |
| UI 元件 | `@base-ui/react` + shadcn | 自製 7 個 primitive，保留相同 `data-slot` 介面 |
| 測試 | node:test + esbuild | 相同（入口改為 `src/game/*`） |

遊戲引擎（`engine.ts`）與武將資料（`officers.ts`）沿用上游規則與數值，確保玩法與數值一致；介面層與建置流程重寫，因此相依套件少、建置快、不需要框架特定的部署設定。差異與理由詳見 [docs/analysis-plan.md](docs/analysis-plan.md)。

## 驗證

- `npm test`：23 項引擎測試全數通過（地圖連通性、對稱開局、108 位武將、指令成本與上限、武將休整、統兵上限、戰鬥預測與結算一致、安民減產、政令成長、AI 公平性與協同攻城、80 回合長局不變式、存檔驗證與 v1→v2 遷移、圖集邊界）。
- `npm run typecheck`、`npm run build` 均通過。
- 瀏覽器實測（Vite preview，1440×900）：開局選勢力、城池指令、出征對話框與兵力滑桿、回合結算、圖鑑搜尋與篩選、武將詳情、戰報、軍師錦囊分頁、存檔匯出與重整續接、另啟新局。實測時「攻克永安」的實際餘部 2,290 兵與出征前的預測數字完全一致。

## 素材與授權

- 地形與頭像圖集來自參考專案 `works/three-kingdoms/public/`，由該專案以圖像生成工具製作，不含《三國志11》原版素材；頭像為三張 1254×1254 的 6×6 圖集，介面以 CSS 定位裁切顯示。
- 依參考專案說明，該集合內的原創文字與圖像依 CC0 1.0 釋出；程式碼部分上游未個別授予授權，本專案僅在保留完整出處標註的前提下作為複刻練習使用。詳見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 本專案程式碼依 [MIT License](LICENSE) 釋出。
