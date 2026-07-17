# 项目骨架设计

日期: 2026-07-17

## 背景

个人网站项目 (mirandayong.com),主题是"大脑"视觉隐喻。项目文件夹目前完全为空,
只有一份记录需求和设计规范的 CLAUDE.md。这是从零开始的第一步:搭建最基础的
项目骨架,不涉及大脑图形或交互功能,那些是后续单独的步骤。

## 范围

本次只做骨架,不做:
- 大脑 SVG 图形
- 鼠标悬停高亮 / 光晕交互
- 具体板块内容

## 技术选型

纯 HTML/CSS/JS,不使用任何框架或构建工具。理由:用户不熟悉搭建网站的流程,
浏览器直接打开 index.html 就能看效果,减少不必要的概念负担;部署到
GitHub Pages 时也最简单,不需要构建步骤。

## 文件结构

```
portfolio/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── .gitignore
└── CLAUDE.md (已存在)
```

- `index.html`: HTML5 骨架,包含 charset/viewport meta、页面标题、
  Google Fonts 引入 (Space Grotesk 标题/正文、JetBrains Mono 标签/技术文字)、
  引入 css/style.css 和 js/main.js、body 里放一个占位标题用于确认页面能正常加载。
- `css/style.css`: 基础 reset (box-sizing, margin/padding 归零) +
  深色渐变背景 (#05060a 到 #0d1117) + body 上设置 font-family,
  让最基础的视觉风格从第一步就符合已定的设计规范。
- `js/main.js`: 空文件,占位,为后续交互逻辑留位置。
- `.gitignore`: 常见的系统/编辑器垃圾文件 (如 .DS_Store)。

## Git

只初始化本地仓库 (`git init`),不连接 GitHub 远程仓库。远程仓库和部署是
后续单独的步骤。骨架文件(包括本设计文档)完成后做第一次 commit。

## 验收标准

- 用浏览器直接打开 index.html,能看到深色渐变背景和占位标题,字体正确加载。
- `git log` 能看到一次初始 commit,包含以上所有文件。
