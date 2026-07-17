const LOBES = {
  '#ff6b4a': { name: '额叶', block: 'kexue' },
  '#4ade80': { name: '顶叶', block: 'aihao' },
  '#fbbf24': { name: '颞叶', block: 'wenke' },
  '#a78bfa': { name: '枕叶', block: 'wenke' },
  '#38bdf8': { name: '小脑', block: 'tiyu' },
};

const BLOCKS = {
  kexue: '理科',
  tiyu: '体育',
  wenke: '文科艺术',
  aihao: '思考与爱好',
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const outlineImg = document.getElementById('brain-outline');
const glowCanvas = document.getElementById('brain-glow');
const label = document.getElementById('brain-label');
const stage = document.getElementById('brain-stage');
const glowCtx = glowCanvas.getContext('2d');

const regionsImg = new Image();
regionsImg.src = 'assets/brain-regions.png';

let regionsData = null;
let width = 0;
let height = 0;

// Pre-built colored, isolated shape for each lobe, drawn from the region
// map once so hover doesn't need to re-scan pixels every time.
const lobeLayers = {};

function buildLobeLayers() {
  for (const hex of Object.keys(LOBES)) {
    const [r, g, b] = hexToRgb(hex);
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const ctx = layer.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const src = regionsData.data;
    const out = imageData.data;
    for (let i = 0; i < src.length; i += 4) {
      if (src[i] === r && src[i + 1] === g && src[i + 2] === b) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    lobeLayers[hex] = layer;
  }
}

regionsImg.onload = () => {
  width = regionsImg.naturalWidth;
  height = regionsImg.naturalHeight;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = width;
  sampleCanvas.height = height;
  const sampleCtx = sampleCanvas.getContext('2d');
  sampleCtx.drawImage(regionsImg, 0, 0);
  regionsData = sampleCtx.getImageData(0, 0, width, height);

  glowCanvas.width = width;
  glowCanvas.height = height;
  buildLobeLayers();
};

outlineImg.addEventListener('load', () => {
  stage.classList.add('visible');
});

function hexAt(x, y) {
  const i = (y * width + x) * 4;
  const d = regionsData.data;
  if (d[i + 3] === 0) return null;
  const r = d[i], g = d[i + 1], b = d[i + 2];
  if (r < 15 && g < 15 && b < 15) return null;
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

let currentBlock = null;

function showBlock(block) {
  glowCtx.clearRect(0, 0, width, height);
  for (const [hex, lobe] of Object.entries(LOBES)) {
    if (lobe.block === block) {
      glowCtx.drawImage(lobeLayers[hex], 0, 0);
    }
  }
  glowCanvas.classList.add('active');
  label.textContent = BLOCKS[block];
}

function clearBlock() {
  glowCanvas.classList.remove('active');
  label.textContent = '';
  currentBlock = null;
}

stage.addEventListener('mousemove', (e) => {
  if (!regionsData) return;
  const rect = outlineImg.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
  if (x < 0 || y < 0 || x >= width || y >= height) {
    clearBlock();
    return;
  }
  const hex = hexAt(x, y);
  if (!hex || !LOBES[hex]) {
    clearBlock();
    return;
  }
  const block = LOBES[hex].block;
  if (block !== currentBlock) {
    currentBlock = block;
    showBlock(block);
  }
});

stage.addEventListener('mouseleave', clearBlock);
