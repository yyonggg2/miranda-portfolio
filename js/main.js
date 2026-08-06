const BLOCK_NAMES = {
  Frontal: "Frontal Lobe",
  Cerebellum: "Cerebellum",
  Parietal: "Parietal Lobe",
  Temporal: "Temporal Lobe",
  Occipital: "Occipital Lobe",
};

const BLOCK_PAGE = {
  Frontal: { category: "Thoughts", href: "thoughts.html" },
  Parietal: { category: "Project", href: "project.html" },
  Cerebellum: { category: "Project", href: "project.html" },
  Temporal: { category: "Experience", href: "experience.html" },
  Occipital: { category: "Visual Art", href: "visual-art.html" },
};

const outlineImg = document.getElementById("brain-outline");
const stage = document.getElementById("brain-stage");
const label = document.getElementById("brain-label");
const panelList = document.getElementById("brain-panel-list");
const allRegions = document.querySelectorAll(".region");
const profilelinks = document.querySelector(".links"); 
let pinnedBlock = null;

if (outlineImg.complete) {
  stage.classList.add("visible");
} else {
  outlineImg.addEventListener("load", () => {
    stage.classList.add("visible");
  });
}

function activateBlock(block) {
  allRegions.forEach((el) => {
    if (el.dataset.block === block) {
      const color = el.dataset.color;
      const name = BLOCK_NAMES[block];
      const page = BLOCK_PAGE[block];
      el.classList.add("active");
      el.style.fill = color;
      el.style.filter = `drop-shadow(0 0 14px ${color})`;

      document
        .getElementById("brain-panel")
        .style.setProperty("--panel-color", color);
      document.querySelector("#brain-panel h2").textContent = name;

      panelList.innerHTML = "";
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = page.href;
      link.textContent = page.category;
      li.appendChild(link);
      panelList.appendChild(li);
    }
  });
  label.textContent = BLOCK_NAMES[block];
}

function selectedBlock(block) {
  if (pinnedBlock === block) {
    pinnedBlock = null;
    document.getElementById("user-hint").textContent =
      "Double click to select a brain region";
  } else {
    pinnedBlock = block;
    document.getElementById("user-hint").textContent =
      "Double click to deselect";
  }
}

function clearAll() {
  allRegions.forEach((el) => {
    el.classList.remove("active");
    el.style.fill = "";
    el.style.filter = "";
  });

  if (pinnedBlock !== null) {
    activateBlock(pinnedBlock);
    return;
  }

  label.textContent = "";
  panelList.innerHTML = "";
  document.querySelector("#brain-panel h2").textContent = "";
}

allRegions.forEach((el) => {
  el.addEventListener("mouseenter", () => activateBlock(el.dataset.block));
  el.addEventListener("mouseleave", clearAll);
  el.addEventListener("dblclick", () => selectedBlock(el.dataset.block));
});
