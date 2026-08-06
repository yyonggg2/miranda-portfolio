const typewriterEl = document.getElementById("typewriter");
const photoEl = document.getElementById("corner-photo");

if (typewriterEl) {
  const lines = [
    "Hi! ",
    "My name is Miranda!",
    "Nice to meet you on my journey!",
    " ",
    "I'm a Grade 12 student from Ontario, Canada, who's passionate about creating and building stuff, and I’m trying to pursue an engineering career!",
    " ",
    "Want to learn more about ME?",
    " ",
    "Check out what's in my backpack!",
  ];

  const cursor = document.createElement("span");
  cursor.className = "cursor";

  let lineIndex = 0;
  let charIndex = 0;
  let currentLineEl = null;

  // 屏幕宽度 >= 1000px 时,跟 css/style.css 里 @media (min-width: 1000px) 是同一个断点:
  // 那时候图片是放大的标准尺寸,文字整体居中显示,不需要绕开图片。
  const wideScreen = window.matchMedia("(min-width: 1000px)");

  // 图片是 position:fixed 钉死在左下角的,浏览器没有原生办法让文字自动绕开它。
  // 这个函数手动测量图片和每一行文字的屏幕位置,只给"真的会跟图片重叠"的那几行
  // 加右移的 margin-left,没有重叠的行保持满宽度,相当于自己实现"绕排"效果。
  function avoidPhoto() {
    if (!typewriterEl.children.length) {
      return;
    }

    if (wideScreen.matches) {
      // 宽屏: 文字居中,不用绕图片,把之前窄屏时加的margin清掉
      for (const lineEl of typewriterEl.children) {
        lineEl.style.marginLeft = "0px";
      }
      return;
    }

    if (!photoEl) {
      return;
    }
    const photoRect = photoEl.getBoundingClientRect();
    const containerRect = typewriterEl.getBoundingClientRect();
    const requiredMargin = Math.max(0, photoRect.right + 24 - containerRect.left);

    for (const lineEl of typewriterEl.children) {
      const lineRect = lineEl.getBoundingClientRect();
      const overlapsPhoto =
        lineRect.top < photoRect.bottom && lineRect.bottom > photoRect.top;
      lineEl.style.marginLeft = overlapsPhoto ? requiredMargin + "px" : "0px";
    }
  }

  // 全部文字都打完之后,才在最后一行的末尾(跟文字同一行,不是另起一行)加上这个按钮
  function showBackpackButton() {
    cursor.remove();
    const btn = document.createElement("a");
    // 如果这次首页是"不是第一次进站"跳过来的,说明书包页面之前也一定看过了,
    // 跳转过去的时候也带上 ?played=1,让书包那边的动画也别再重放一次
    btn.href = alreadyPlayed ? "visual-art.html?played=1" : "visual-art.html";
    btn.className = "site-btn";
    btn.textContent = "Go to Backpack";
    currentLineEl.appendChild(btn);
    avoidPhoto(); // 按钮会让这一行变宽,重新算一次要不要让开图片
  }

  function typeNext() {
    if (lineIndex >= lines.length) {
      showBackpackButton();
      return;
    }

    if (charIndex === 0) {
      currentLineEl = document.createElement("div");
      typewriterEl.appendChild(currentLineEl);
    }

    const line = lines[lineIndex];

    if (charIndex < line.length) {
      currentLineEl.textContent += line[charIndex];
      charIndex++;
      currentLineEl.appendChild(cursor);
      avoidPhoto();
      setTimeout(typeNext, 35);
    } else {
      lineIndex++;
      charIndex = 0;
      avoidPhoto();
      setTimeout(typeNext, 250);
    }
  }

  // 直接把所有文字一次性显示出来,不逐字打印,给"已经看过打字效果"的情况用
  function showFullTextInstantly() {
    for (const text of lines) {
      const div = document.createElement("div");
      div.textContent = text;
      typewriterEl.appendChild(div);
    }
    currentLineEl = typewriterEl.lastElementChild;
    showBackpackButton();
    avoidPhoto();
  }

  // 从 visual-art.html 的"Back"链接回来时,网址会带上 ?played=1 这个标记,
  // 用来判断"这不是第一次进这个网站了",不用打字,直接把结果摆出来
  const alreadyPlayed = new URLSearchParams(window.location.search).get("played") === "1";

  if (alreadyPlayed) {
    showFullTextInstantly();
    // 不是第一次进站了,照片也不用再弹一次,直接让它保持最终状态显示
    if (photoEl) {
      photoEl.style.animation = "none";
      photoEl.style.opacity = "1";
    }
  } else {
    typeNext();
  }
  window.addEventListener("resize", avoidPhoto);
}
