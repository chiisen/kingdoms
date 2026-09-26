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
npm test           # 全部 69 項測試（引擎／音訊／文字／介面）
npm run lint       # oxlint（correctness + suspicious + perf）
npm run typecheck  # TypeScript 型別檢查
```

測試可分別執行：`npm run test:engine`（23 項規則與回歸）、`npm run test:audio`（9 項樂曲與合成圖）、`npm run test:text`（5 項繁簡文字與搜尋表）、`npm run test:ui`（32 項元件與演出邏輯，vitest + jsdom）；開發時可用 `npm run test:watch`。改動武將資料後，用 `node scripts/build-search-forms.mjs` 重新產生簡體搜尋表（`npm run test:text` 會檢查它是否同步）。

`dist/` 是純靜態輸出，可直接放到任何靜態主機；請以 HTTP 提供整個目錄，不要直接以 `file://` 開啟 `index.html`。

## 玩法

- **經營城池**：開墾農田、發展商貿、徵募兵卒、操練軍隊、修築城防，每次消耗 1 道政令。可自動擇優任命執行武將，智略越高越省錢；武將執行後休整 2 回合。
- **調兵出征**：只能沿道路進軍相鄰城池，也能向友城增援。出征需留守 1,000 兵、消耗軍糧，主將統率決定帶兵上限。出征前會預測勝敗與預估餘部。
- **百將圖鑑**：以姓名、定位或專長搜尋，依勢力篩選，查看頭像與統率／武力／智略。搜尋**簡繁皆可**（輸入「诸葛亮」或「諸葛亮」都會找到同一位武將）。
- **統一十五城**：與兩個 AI 勢力競爭，佔領全部 15 城且無敵軍在外即獲勝。新佔城池安民 2 回合，產出減半。
- **存檔**：每次行動自動存入瀏覽器，可匯出／匯入 JSON 繼續戰局（含舊版存檔遷移）。
- **配樂與音效**：三國風格的程序化配樂與介面音效，右上角喇叭可隨時開關（見下節）。
- **數值演出**：指令與回合結算後，金錢、軍糧、兵力、士氣等數值會滾動變化並浮出差額（見下節）。

介面為**繁體中文**（參考專案原為簡體中文，本專案已全文轉換；字型堆疊也改以 PingFang TC／微軟正黑體／宋體 TC 優先）。支援滑鼠與觸控，建議使用現代桌面瀏覽器。

文字轉換以 OpenCC（`cn` → `tw`）批次處理 `src/game/*`、`src/components/ui/*` 與 `index.html`，再人工校正專有名詞（例如「凌統」不應轉為「淩統」）。轉換工具保留在 `scripts/convert-s2t.mjs`，指令為 `node scripts/convert-s2t.mjs <檔案...>`；`docs/reference/` 內的上游文件維持簡體原文，未經轉換。

## 配樂與音效

所有聲音都在瀏覽器內以 Web Audio API **即時合成**，不打包、不下載任何音訊檔，因此沒有音樂授權問題（也與參考專案「僅使用合成提示音」的作法一致）。

- **配樂**：D 宮調五聲音階（宮商角徵羽）的 20 小節循環，76 BPM、約 63 秒。編制為撥弦箏聲主旋律、第二段轉為帶揉弦的弓弦線條、低音、琵琶式分解和弦、鼓與編鐘點綴；A 段（8 小節）留白、B 段（8 小節）上八度展開、4 小節過門接回開頭，鼓點在段末有過門滾奏。
- **音效**：點選、開關、確認、取消、下達城池指令、徵兵、錢糧、出征、交戰、攻克、回合開始、勝利、失敗、錯誤等，各有不同的合成音色（撥弦、編鐘、鼓、噪音）。
- **播放規則**：**預設靜音**，由右上角喇叭開啟；受瀏覽器自動播放限制，音樂在開啟的那次點擊後才開始，分頁切換到背景會暫停、回來時續播；開關狀態存在瀏覽器，重整後沿用。

想調整氛圍時，`src/game/audio.ts` 開頭的 `SCORE_BPM`、`MUSIC_ROOT_HZ`、`PENTATONIC` 與各段樂句資料就是整首曲子的來源。

## 數值變化演出

- **滾動計數**：金錢、軍糧、總兵力、政令、城池駐軍、士氣／城防、天下歸心進度，都會從舊值滾到新值（約 0.6 秒）。
- **浮動差額**：數值旁會浮出 `+2,500`／`−523` 的差額，綠色向上、紅色向下，1.5 秒後淡出。
- **地圖上的數值**：每座城池標示的駐軍會跟著補給、徵兵、交戰與佔領滾動更新，並在城池下方浮出差額（例如 `+4,500`、`−13,500`），數字同時泛綠或泛紅；左下角圖例的各勢力城池數會在易主時跳動；出征時的行軍旗標會彈出後沿道路脈動，抵達後目的城池的數字接著變化。
- **對應高亮**：城池指令按鈕會閃一下、士氣／城防進度條平滑伸縮並泛光、政令格逐格彈跳、軍情文字滑入、攻克城池時城池光暈擴散並升起旗幟。
- **不誤報**：切換檢視的城市、讀取存檔或另啟新局時，數字直接顯示結果，不會跳出假的差額。
- **可及性**：若系統設定「減少動態效果」（`prefers-reduced-motion`），上述動畫會自動停用，數字直接顯示結果。

## 專案結構

```
├── index.html
├── src/
│   ├── main.tsx / App.tsx          掛載與入口
│   ├── game/
│   │   ├── engine.ts               地圖、經濟、戰鬥、AI、存檔驗證與遷移
│   │   ├── officers.ts             108 位武將資料與頭像圖集映射
│   │   ├── search-forms.ts         簡體搜尋表（產生檔，供圖鑑簡繁搜尋）
│   │   ├── audio.ts                程序化配樂與音效（樂句資料、合成、排程）
│   │   ├── Portrait.tsx            以 CSS 裁切圖集單格
│   │   └── Game.tsx                遊戲介面：地圖、城池面板、圖鑑、戰報、對話框
│   ├── components/
│   │   ├── AnimatedNumber.tsx      滾動計數、差額浮動、城池易主偵測
│   │   ├── __tests__/              元件與演出邏輯測試（vitest）
│   │   └── ui/                     Dialog / AlertDialog / Select / Slider / Tabs / Input
│   ├── test/                       測試環境設定（jsdom、reduced-motion 切換）
│   ├── lib/utils.ts
│   └── styles/
│       ├── globals.css             遊戲主題與全部版面樣式
│       ├── ui.css                  UI primitive 基礎樣式
│       └── effects.css             數值變化與演出動畫
├── public/
│   ├── terrain.jpg                 水墨戰略地形圖
│   └── portraits/{wei,shu,wu}-v2.jpg
├── scripts/
│   ├── test-engine.mjs             引擎測試（node:test + esbuild）
│   ├── test-audio.mjs              樂曲結構與合成圖測試
│   ├── test-text.mjs               繁簡文字與搜尋表不變式測試
│   ├── build-search-forms.mjs      產生簡體搜尋表
│   └── convert-s2t.mjs             繁體轉換工具（OpenCC）
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
| 音訊 | 合成提示音 | 程序化配樂與音效（Web Audio API，無音檔） |
| 測試 | node:test + esbuild | node:test + esbuild，另加 vitest + jsdom 測介面 |
| 檢查 | oxlint + oxfmt | oxlint（`npm run lint`），未採用 oxfmt |

遊戲引擎（`engine.ts`）與武將資料（`officers.ts`）沿用上游規則與數值，確保玩法與數值一致；介面層與建置流程重寫，因此相依套件少、建置快、不需要框架特定的部署設定。差異與理由詳見 [docs/analysis-plan.md](docs/analysis-plan.md)。

## 驗證

`npm test` 共 69 項，全部通過；`npm run lint` 亦為零警告（`.oxlintrc.json` 開啟 correctness、suspicious 與 perf 三類，共 131 條規則；僅關閉 `unicorn/no-array-sort` 與 `unicorn/consistent-function-scoping` 兩條風格規則——前者在本專案都是「先複製再排序」的安全寫法，後者與移植過來的上游程式風格衝突）。

**引擎 23 項**（`scripts/test-engine.mjs`，node:test + esbuild）：地圖連通性、對稱開局、108 位武將、指令成本與上限、武將休整、統兵上限、戰鬥預測與結算一致、安民減產、政令成長、AI 公平性與協同攻城、80 回合長局不變式、存檔驗證與 v1→v2 遷移、圖集邊界。

**音訊 9 項**（`scripts/test-audio.mjs`）：樂曲為 20 小節、每小節都有低音與鼓、所有音高都在五聲音階內、樂曲可重現、排程器建立完整合成圖並遵守時間窗、16 個音效都能產生發聲節點、沒有 Web Audio 時不崩潰、預設為靜音。開發時藉此抓到分解和弦走音與把陣列索引當成音量兩個 bug。

**文字 5 項**（`scripts/test-text.mjs`）：把每個介面原始碼用 OpenCC 轉一次，如果結果與原檔不同就代表混進了簡體字；另有「徵只用於徵兵、不用於出征」的專項檢查，以及「簡體搜尋表與武將資料同步」的檢查。這套測試立刻抓到主選單按鈕誤植為「起兵出**徵**」。

**介面 32 項**（`src/**/__tests__`，vitest + jsdom）：
- 演出邏輯：差額的方向與文字、浮標會自動消失、`showDelta` 可關閉、數字會滾動到真值、**動畫影格不觸發時仍會落到真值**（背景分頁情境）、reduced-motion 時直接顯示結果、城池易主只回報真正換手的城池、攻克高亮會自動清除。
- 介面元件：對話框的 portal 與焦點進出、遮罩關閉、確認框不吃外部點擊、Select 的鍵盤與外部點擊、**按一次 Esc 只關彈出層、再按一次才關對話框**、滑桿的方向鍵／翻頁鍵／上下限、分頁切換。
- 整合：開局流程、下達城池指令後面板與地圖標示同步並浮出差額、結束回合推進日期與政令、**每個地圖標示都等於引擎的實際兵力**、**換新戰局不會浮出假差額**、沒有 Web Audio 也能玩、重整後續接存檔、**圖鑑以繁體或簡體查詢都會找到同一位武將**、預設靜音且開關狀態會記住。

這兩套新測試各抓到一個真實缺陷：主選單按鈕誤植「出徵」，以及城池駐軍計數在「另啟新局後仍以舊戰局數字比較」而浮出假的 `−2,500`。我另外用突變測試確認這兩條守得住：把 campaign key 拿掉、把 Esc 守衛拿掉，對應測試都會失敗。

仍以人工驗證（未自動化）：實際渲染出來的畫面與動畫流暢度，以及可聽見的音訊。瀏覽器實測（Vite preview，1440×900）涵蓋開局選勢力、城池指令、出征對話框與兵力滑桿、回合結算、圖鑑搜尋與篩選、武將詳情、戰報、軍師錦囊分頁、存檔匯出與重整續接、另啟新局；音訊以 `OfflineAudioContext` 離線渲染真實合成路徑（A 段／B 段／過門／循環接點 RMS 0.039～0.062、峰值 0.28～0.41，無爆音）；演出則在瀏覽器讀 DOM 驗證差額文字、浮標幾何與動畫名稱。實測時「攻克永安」的實際餘部 2,290 兵與出征前的預測數字完全一致。

## 素材與授權

- 地形與頭像圖集來自參考專案 `works/three-kingdoms/public/`，由該專案以圖像生成工具製作，不含《三國志11》原版素材；頭像為三張 1254×1254 的 6×6 圖集，介面以 CSS 定位裁切顯示。
- 依參考專案說明，該集合內的原創文字與圖像依 CC0 1.0 釋出；程式碼部分上游未個別授予授權，本專案僅在保留完整出處標註的前提下作為複刻練習使用。詳見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 本專案程式碼依 [MIT License](LICENSE) 釋出。
