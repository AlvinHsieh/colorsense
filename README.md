# ColorSense

ColorSense is a privacy-first browser accessibility project that turns color-dependent web signals
into meaning that can also be understood through text, icons, shapes, and patterns.

> Do not just change colors. Understand them.

## Status

The **MVP core loop is implemented on `main` and is not yet published as a GitHub Release**. The
Chrome Manifest V3 extension can scan visible DOM and SVG color properties on demand, report
deterministic and explainable candidates, highlight findings, and apply reversible non-color
semantic aids. The repository also includes the Issue-to-PR governance and supply-chain baseline.

## Product principle

```text
Color -> Meaning -> Accessible Representation
```

Operating-system color filters remap pixels. ColorSense is designed to understand the semantic role
of a web signal before adding a non-color representation.

## Privacy and security

- Processing is local-first.
- No page DOM, form values, screenshots, or browsing history leave the browser.
- No remote code or external API is used in v0.1.
- The extension requests only `activeTab`, `scripting`, and `storage`; it does not request persistent
  access to all websites.
- Report vulnerabilities privately through [SECURITY.md](SECURITY.md), not a public Issue.

## Development

Requirements:

- Node.js 22 LTS or newer
- pnpm 10.13.1
- Chrome

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build:chrome
pnpm package:chrome
```

Load `apps/extension/.output/chrome-mv3` from `chrome://extensions` using **Load unpacked**.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an Issue or PR. Product and architecture
decisions live under [docs](docs/).

## 繁體中文導覽

ColorSense 的核心不是替整個畫面換色，而是把網頁中只靠顏色傳遞的資訊，轉換成文字、
圖示、形狀與模式。目前 `main` 已完成 MVP 核心流程：使用者可主動掃描可見 DOM／SVG
色彩、檢視具證據與信心分數的候選項目、定位元素，並套用或復原非色彩語意提示；尚未
發布為正式 GitHub Release。

開發需求與指令請參考上方 **Development**；產品範圍請閱讀
[MVP](docs/MVP.md) 與 [Roadmap](docs/ROADMAP.md)。

## License

The browser extension and repository code are licensed under the
[Apache License 2.0](LICENSE). Future hosted AI or cloud services are outside this repository and are
not automatically covered by this open-source grant.
