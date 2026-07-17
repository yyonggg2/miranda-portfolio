# Project Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the most basic project skeleton for the mirandayong.com portfolio site — index.html, css/js folders, and a local git repo — with no framework or build tooling.

**Architecture:** Static site, three files (`index.html`, `css/style.css`, `js/main.js`) linked together directly, openable in a browser with no server or build step.

**Tech Stack:** Plain HTML5, CSS3, vanilla JS. Google Fonts (Space Grotesk, JetBrains Mono) loaded via `<link>`. No package manager, no bundler.

## Global Constraints

- Background: dark gradient `#05060a` to `#0d1117` (from CLAUDE.md design spec)
- Fonts: Space Grotesk (headings/body), JetBrains Mono (labels/technical text)
- No framework, no build tool — plain HTML/CSS/JS only
- Git: local repo only for this plan, no GitHub remote yet
- Any change to the locked design spec (colors, fonts, interaction rules) requires asking the user first — this plan does not touch those, it only applies them as given

---

### Task 1: HTML + CSS skeleton with base visual style

**Files:**
- Create: `index.html`
- Create: `css/style.css`

**Interfaces:**
- Produces: `index.html` links to `css/style.css` and `js/main.js` (the latter created in Task 2, so the `<script>` tag will 404 until then — expected and checked in Task 2, not this task)

- [ ] **Step 1: Create `css/style.css`**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  background: linear-gradient(180deg, #05060a 0%, #0d1117 100%);
  color: #ffffff;
  font-family: 'Space Grotesk', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Miranda Yong</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <h1>Miranda Yong</h1>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Open `index.html` directly in a browser and verify**

Expected: dark gradient background (near-black, slightly lighter toward the bottom), white "Miranda Yong" heading centered on the page, rendered in Space Grotesk (a geometric sans-serif — compare against [fonts.google.com/specimen/Space+Grotesk](https://fonts.google.com/specimen/Space+Grotesk) if unsure). A 404 in the browser console for `js/main.js` is expected at this point and not a problem — that file doesn't exist until Task 2.

Report back to the user for confirmation before continuing to Task 2.

---

### Task 2: JS placeholder, git init, first commit

**Files:**
- Create: `js/main.js`
- Create: `.gitignore`
- Create: `docs/superpowers/specs/2026-07-17-project-skeleton-design.md` (already written during brainstorming, included here for the commit)
- Create: `docs/superpowers/plans/2026-07-17-project-skeleton.md` (this file, included here for the commit)

**Interfaces:**
- Consumes: `index.html` from Task 1, which references `js/main.js` via `<script src="js/main.js">`
- Produces: initialized local git repo with one commit containing the full skeleton

- [ ] **Step 1: Create empty `js/main.js`**

```js
```

(Empty file — placeholder for future interactivity. No content needed yet.)

- [ ] **Step 2: Reload `index.html` in the browser and verify no console errors**

Expected: no 404 for `js/main.js` in the browser console anymore (page behavior is otherwise unchanged, since the file is empty).

- [ ] **Step 3: Create `.gitignore`**

```
.DS_Store
Thumbs.db
*.log
.vscode/
```

- [ ] **Step 4: Initialize git repo**

Run: `git init`
Expected: `Initialized empty Git repository in .../portfolio/.git/`

- [ ] **Step 5: Stage and commit everything**

```bash
git add index.html css/style.css js/main.js .gitignore CLAUDE.md docs/
git commit -m "Initial project skeleton: index.html, css/js folders, base dark theme"
```

- [ ] **Step 6: Verify the commit**

Run: `git log --oneline`
Expected: one commit listed, e.g. `abc1234 Initial project skeleton: index.html, css/js folders, base dark theme`

Run: `git status`
Expected: `nothing to commit, working tree clean`

Report back to the user for confirmation. This completes the project skeleton — next steps (brain SVG graphic, hover interactions, content) are separate future plans.
