# 專案分析與規劃 / 三分天下 · 百將風雲

本文件記錄這次「複刻」的分析與規劃過程：先拆解參考專案，再決定技術選型、模組切分與驗證方式。

參考專案：[MartinDelophy/awesome-gpt-6-astra · works/three-kingdoms](https://github.com/MartinDelophy/awesome-gpt-6-astra/tree/main/works/three-kingdoms)

---

## 1. 需求分析

### 1.1 參考專案是什麼

一款原創三國題材回合制策略網頁遊戲（v0.2.0）。玩家從曹操、劉備、孫權三方擇一，在 15 座城池之間經營錢糧、調兵攻城，最終佔領全部城池。共 108 位武將（每方 36 位），每人對應一張生成的獨立頭像。

### 1.2 功能清單（複刻目標）

| 面向 | 具體內容 |
| --- | --- |
| 地圖 | 15 城、21 條道路；魏（洛陽、鄴城、許昌）、蜀（西涼、漢中、成都）、吳（下邳、建業、柴桑）各 3 城，群雄 6 城；四方對稱開局 |
| 資源 | 金錢與軍糧；回合結束入庫，兵卒每回合耗糧，糧盡減員 8% |
| 城池指令 | 開墾農田、發展商貿、徵募兵卒、操練軍隊、修築城防；每次消耗 1 政令 |
| 武將 | 統率／武力／智略三圍、定位與專長、統兵上限、休整 2 回合、智略減費與節糧 |
| 出征 | 僅能沿道路至相鄰城池（含友軍增援）；留守 1,000 兵；出征軍糧；勝敗預測 |
| 戰鬥 | 攻擊力 = 兵力 × 統軍係數 × 士氣係數；守方受城防加成；勝方占城、安民 2 回合產出減半 |
| 政令 | 依城池數成長：3 城 3 道、8 城 4 道、13 城 5 道 |
| AI | 內政、徵兵、增援、協同攻城（多路同時出兵）；以回合開始情報規劃，不作弊 |
| 存檔 | localStorage 自動存檔、JSON 匯出／匯入、v1→v2 遷移與嚴格欄位驗證 |
| 介面 | 天下地圖（縮放、全屏）、武將圖鑑（搜尋／勢力篩選／詳情）、戰報、軍師錦囊（玩法＋存檔） |
| 其他 | 音效提示、自動擇優任命執行武將、觸屏與鍵盤操作 |

### 1.3 素材清單（沿用）

- `public/terrain.jpg`：水墨風格戰略地形圖（819 KB）
- `public/portraits/{wei,shu,wu}-v2.jpg`：三張 1254×1254 的 6×6 頭像圖集，每格一位武將（各約 700 KB）
- 前端以 CSS `background-position` 裁切單格顯示，蜀國圖集列高不同，需按實際列邊界定位

---

## 2. 技術選型

參考專案使用 `vinext`（RSC 框架）＋ Base UI／shadcn 元件。複刻時改用更通用、相依更少、可長期維護的組合：

| 項目 | 參考專案 | 本專案 | 選用理由 |
| --- | --- | --- | --- |
| 建置 | vinext 1.0.0-beta.9 | Vite 8 | 穩定的 SPA 建置；本遊戲無伺服器端需求 |
| 框架 | React 19 + RSC | React 19（純客戶端） | 遊戲狀態全在使用者瀏覽器，`'use client'` 無意義 |
| 樣式 | Tailwind CSS 4 + shadcn 主題 | Tailwind CSS 4（`@tailwindcss/vite`） | 保留原主題變數與全部遊戲 CSS，移除 `shadcn/tailwind.css` 相依 |
| UI 元件 | `@base-ui/react` + shadcn 產生器 | 自製 7 個 primitive | 對外 API 與 `data-slot` 一致，省去兩個重量級相依 |
| 圖示 | lucide-react | lucide-react | 相同 |
| 測試 | node:test + esbuild 打包 | node:test + esbuild 打包 | 相同作法，直接在 Node 內驗證 TypeScript 引擎 |
| 部署 | Vercel（`dist/client`） | 靜態 `dist/`，可放任何靜態主機 | 簡化 |

---

## 3. 模組設計

```
src/
├── main.tsx            掛載 React
├── App.tsx             入口（對應上游 app/page.tsx）
├── styles/
│   ├── globals.css     遊戲主題與全部版面樣式（移植自上游，改寫 import 來源）
│   └── ui.css          自製 UI primitive 的基礎樣式
├── lib/utils.ts        cn() 類名合併
├── components/ui/      Dialog / AlertDialog / Select / Slider / Tabs / Input + modal 共用底座
└── game/
    ├── engine.ts       純函式遊戲引擎：地圖、經濟、戰鬥、AI、存檔驗證與遷移
    ├── officers.ts     108 位武將資料與圖集映射
    ├── Portrait.tsx    以 CSS 裁切圖集單格
    └── Game.tsx        介面：地圖、城池面板、圖鑑、戰報、對話框
```

### 3.1 分層原則

- **引擎（`engine.ts`）與介面完全分離**：所有動作（`act`、`march`、`endTurn`、`autoOrders`）都是 `Game → Game` 的純函式，先複製狀態再改動，失敗時 `throw` 中文錯誤訊息。因此 UI 只需 `try/catch` 顯示訊息，且測試能在 Node 中直接跑完整戰局。
- **資料驅動**：城市座標、道路、武將、指令成本都集中在 `engine.ts` / `officers.ts`，介面只讀取。
- **存檔即狀態**：`Game` 物件本身就是存檔格式（`version: 2`），`loadGame()` 逐欄位驗證並拒絕竄改或損壞的存檔。

### 3.2 UI primitive 的替換策略

上游 7 個 `components/ui/*` 依賴 Base UI，對外介面為：

- `<Dialog open onOpenChange>` + `DialogContent/Title/Description`
- `<AlertDialog>` 同上，但點擊遮罩不關閉
- `<Select value onValueChange>` + `Trigger/Value/Content/Item`（自帶錨定彈出層）
- `<Slider value={[n]} onValueChange>`、`<Tabs defaultValue>`、`<Input>`

本專案以 `modal.tsx` 為共用底座（portal、焦點鎖定、Esc 關閉、焦點還原）自行實作，並保留**相同的 `data-slot` 名稱**（`dialog-content`、`select-item`、`slider-thumb`…），因此移植過來的遊戲 CSS 完全不用修改即可生效。

實作時發現並修正一個分層問題：Select 彈出層與 Dialog 同時監聽 `keydown`，單次 Esc 會同時關閉兩者。改為以開啟中的彈出層計數（`usePopupLayer`）判斷——有彈出層時 Dialog 不處理鍵盤，Esc 先關彈出層、再關對話框。

---

## 4. 施工步驟

1. 取得參考專案原始碼與素材，逐檔閱讀（引擎、武將資料、介面、樣式、測試、文件）。
2. 建立 Vite + React 19 + TS + Tailwind 4 專案骨架；下載地形與三張頭像圖集到 `public/`。
3. 移植 `engine.ts`、`officers.ts`（規則與資料）；`Game.tsx` 只需移除 `'use client'` 與 `__TERRAIN_URL__`，改用 `import.meta.env.BASE_URL`。
4. 移植 `globals.css`，只調整開頭 import；遊戲樣式原樣保留。
5. 自製 UI primitives（`components/ui/`）並補 `ui.css`。
6. 移植 `scripts/test-engine.mjs`，把打包入口改為 `src/game/*`，並為 `Portrait.tsx` 的 `import.meta.env.BASE_URL` 加上 `define`。
7. 逐項驗證：`npm test` → `npm run typecheck` → `npm run build` → 瀏覽器實測。

---

## 5. 驗證

### 5.1 自動化

| 項目 | 結果 |
| --- | --- |
| `npm test`（引擎 23 項規則與回歸測試） | 23 pass / 0 fail |
| `npm run typecheck` | 無錯誤 |
| `npm run build` | 成功（JS 327 KB → gzip 104 KB、CSS 47 KB → gzip 11 KB，含素材共約 3.3 MB） |

### 5.2 瀏覽器實測（Vite preview + 1440×900）

| 驗證項目 | 觀察結果 |
| --- | --- |
| 開局選擇勢力 | 三方頭像正確裁切；選曹操後進入許昌、4,200 金、36,000 兵、第 1 回合、勢力城池數 3/3/3/6 |
| 城池指令 | 徵募兵卒：駐軍 16,000 → 18,500、金 −523（諸葛亮執行，智略減費）、政令 3 → 2 |
| 武將休整 | 執行後顯示「休整至第 4 回合」，且自動任命改派龐統執行下一次指令 |
| 出征對話框 | 默認敵方目標永安；帶兵上限 17,500（趙雲統率 94）；軍糧 1,107；預測「預計勝勢 · 預計餘部 2,290 兵」 |
| 兵力滑桿 | 拖曳後 6,000 → 3,000（步進 500），預測即時改為「預計撤回 820 兵」，留守標示同步 |
| 出征結算 | 下回合攻克永安，守軍變 2,290 —— **與預測數字完全一致** |
| 回合推進 | 回合 3 開始；金 5,703、糧 21,899；AI 亦攻下城池（孫權 4 城） |
| 圖鑑 | 我方 36 位、切換「天下群英」108 位、搜尋「諸葛」得 2 位；頭像圖集裁切正常 |
| 武將詳情 | 統率／武力／智略條、統兵上限、綜合統軍、行軍節糧、內政減費 |
| 戰報 | 依回合列出內政、進軍、攻克、增援訊息，並標示 info/good/war |
| 軍師錦囊 | 分頁切換（玩法／存檔）、四條規則、匯出與匯入按鈕 |
| 存檔 | 重整頁面自動續接；匯出檔為合法 v2 存檔（15 城、4/4/4/3 歸屬、15 筆休整紀錄、檔名 `三分天下-存檔.json`） |
| 另啟新局 | 確認對話框點擊外部不關閉；選擇新勢力 → 重開戰局 |
| 版面 | 1440×900 與參考專案截圖一致（地圖說明為直書、位於左下，與標題無重疊） |

---

## 6. 已知限制與後續

- **素材與規則來自上游**：地形與頭像圖集沿用參考專案，武將數值與道路為上游自訂規則，非《三國志11》原版資料。上游未對遊戲原始碼個別授權（僅說明集合內原創文字與圖像依 CC0 釋出），因此本專案保留完整出處標註，見 `THIRD_PARTY_NOTICES.md`。
- **AI 為規則式**：靠 `isMusterTurn` 決定集結回合、以回合開始情報估算守軍，沒有搜尋或學習；長期勝率未經人類對局驗證（上游 `docs/reference/balance-v2.md` 亦如此聲明）。
- **響應式僅到平板寬度**：`min-height: 680px` 的桌面版型，窄螢幕需捲動城池面板；未針對手機直向優化（與上游一致）。
- **未移植的項目**：上游的 Vercel／Sites 部署設定與 `oxlint`/`oxfmt` 檢查；本專案改用 `tsc --noEmit` 與 `npm test` 作為品質關卡。
