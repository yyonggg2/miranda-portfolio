const BLOCK_NAMES = {
  Frontal: "Frontal Lobe",
  Cerebellum: "Cerebellum",
  Parietal: "Parietal Lobe",
  Temporal: "Temporal Lobe",
  Occipital: "Occipital Lobe",
};

const BLOCK_ITEMS = {
  Frontal: ["Mathematics", "Software Projects", "Hardware Projects"],
  Cerebellum: ["Sports"],
  Parietal: ["CAD"],
  Temporal: ["Journal", "Thoughts"],
  Occipital: ["Miranda's Perspective Gallery"],
};

const outlineImg = document.getElementById("brain-outline");
const stage = document.getElementById("brain-stage");
const label = document.getElementById("brain-label");
const panelList = document.getElementById("brain-panel-list");
const allRegions = document.querySelectorAll(".region");

outlineImg.addEventListener("load", () => {
  stage.classList.add("visible");
});

function activateBlock(block) {
  allRegions.forEach((el) => {
    if (el.dataset.block === block) {
      const color = el.dataset.color;
      const name = BLOCK_NAMES[block];
      const items = BLOCK_ITEMS[block];
      el.classList.add("active");
      el.style.fill = color;
      el.style.filter = `drop-shadow(0 0 14px ${color})`;

      document
        .getElementById("brain-panel")
        .style.setProperty("--panel-color", color);
      document.querySelector("#brain-panel h2").textContent = name;

      panelList.innerHTML = "";
      items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        panelList.appendChild(li);
      });
    }
  });
  label.textContent = BLOCK_NAMES[block];
}

function clearAll() {
  allRegions.forEach((el) => {
    el.classList.remove("active");
    el.style.fill = "";
    el.style.filler = "";
  });

  label.textContent = "";
  panelList.innerHTML = "";
  document.querySelector("#brain-panel h2").textContent = "";
}

allRegions.forEach((el) => {
  el.addEventListener("mouseenter", () => activateBlock(el.dataset.block));
  el.addEventListener("mouseleave", clearAll);
});
