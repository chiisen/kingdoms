# 第三方與授權說明 / Third-party and licensing notes

## 參考專案

本專案是以下作品的複刻實作，遊戲規則、武將數值、地圖與全部美術素材均來自該專案：

- **作品**：三分天下 · 百將風雲 / Three Kingdoms: Hundred Heroes, v0.2.0
- **作者**：[MartinDelophy](https://github.com/MartinDelophy)
- **來源**：[awesome-gpt-6-astra · works/three-kingdoms](https://github.com/MartinDelophy/awesome-gpt-6-astra/tree/main/works/three-kingdoms)

依該專案說明，集合內的原創文字與圖像依集合根目錄的 **CC0 1.0** 條款釋出，上游的 `THIRD_PARTY_NOTICES.md` 亦載明「No separate MIT or other software-license grant for the game-specific source is asserted by this submission」，亦即**遊戲程式碼本身未被個別授予授權**。本專案因此：

- 保留完整出處標註與上游文件（`docs/reference/`）；
- 僅作學習與複刻練習用途，並未主張對上游程式碼或素材的權利；
- 若上游作者要求，應移除或改用其他素材。

## 沿用的檔案

| 類別 | 內容 | 本專案位置 |
| --- | --- | --- |
| 美術素材 | 水墨地形圖 | `public/terrain.jpg` |
| 美術素材 | 魏／蜀／吳各 36 格頭像圖集 | `public/portraits/*-v2.jpg` |
| 圖示 | 網站圖示 | `public/favicon.svg` |
| 遊戲規則與資料 | 地圖、經濟、戰鬥、AI、存檔驗證 | `src/game/engine.ts` |
| 遊戲規則與資料 | 108 位武將資料與圖集映射 | `src/game/officers.ts` |
| 樣式 | 遊戲主題與版面樣式 | `src/styles/globals.css` |
| 介面 | 介面元件與畫面結構（經改寫） | `src/game/Game.tsx`、`src/game/Portrait.tsx` |
| 測試 | 引擎規則與回歸測試（改寫入口路徑） | `scripts/test-engine.mjs` |
| 文件 | 原始需求、驗證紀錄、平衡報告、頭像生成提示詞 | `docs/reference/` |

介面層的元件（`src/components/ui/`）與建置設定（`vite.config.ts`、`tsconfig.json`、`package.json`）為本專案自行撰寫，未使用上游的 shadcn／Base UI 元件程式碼。

頭像與地形由上游專案以圖像生成工具製作，**不含《三國志11》原版人物畫像、音樂或遊戲程式碼**；武將能力值與道路連結為該專案自訂的遊戲規則，非歷史或原版資料。頭像生成提示詞原文見 [docs/reference/portrait-assets.md](docs/reference/portrait-assets.md)。

## 使用的開源套件

以下套件由 npm 安裝使用，各自依其隨附授權散布，本專案不再轉載其授權全文：

| 套件 | 用途 | 授權 |
| --- | --- | --- |
| [react](https://www.npmjs.com/package/react) / [react-dom](https://www.npmjs.com/package/react-dom) | 介面 | MIT |
| [vite](https://www.npmjs.com/package/vite) / [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) | 建置與開發伺服器 | MIT |
| [tailwindcss](https://www.npmjs.com/package/tailwindcss) / [@tailwindcss/vite](https://www.npmjs.com/package/@tailwindcss/vite) | 樣式工具 | MIT |
| [lucide-react](https://www.npmjs.com/package/lucide-react) | 圖示 | ISC |
| [clsx](https://www.npmjs.com/package/clsx) / [tailwind-merge](https://www.npmjs.com/package/tailwind-merge) | 類名合併 | MIT |
| [tw-animate-css](https://www.npmjs.com/package/tw-animate-css) | 動畫工具類 | MIT |
| [esbuild](https://www.npmjs.com/package/esbuild) | 測試時打包引擎 | MIT |
| [typescript](https://www.npmjs.com/package/typescript) | 型別檢查 | Apache-2.0 |

遊戲使用系統字型與可選的合成提示音，未內嵌商業字型或音樂。
