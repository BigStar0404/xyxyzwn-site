const side = 16;
let pixels = Array(side ** 2).fill(null);
const history = [];
let stroke = null;
let tool = 'pen';
let color = '#7c5cff';
let savedKey = '';
let saving = false;

const board = document.querySelector('#board');
const ctx = board.getContext('2d');
const undo = document.querySelector('#undo');
const save = document.querySelector('#save');
const download = document.querySelector('#export');
const message = document.querySelector('#message');
const colorInput = document.querySelector('#color');
const toolButtons = [...document.querySelectorAll('[data-tool]')];
const palette = document.querySelector('#palette');
const swatches = [
  '#272234', '#ffffff', '#ff526f', '#ff9b52', '#ffdf66', '#c6fa6a',
  '#3aba86', '#54d9df', '#558dff', '#7c5cff', '#a05ed1', '#ff9ebc',
];

function render() {
  const cell = board.width / side;
  pixels.forEach((value, i) => {
    const x = i % side;
    const y = Math.floor(i / side);
    ctx.fillStyle = value ?? ((x + y) % 2 === 0 ? '#f5f1fa' : '#e5dfed');
    ctx.fillRect(x * cell, y * cell, cell, cell);
  });
  ctx.beginPath();
  for (let i = 1; i < side; i++) {
    const offset = i * cell + 0.5;
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, board.height);
    ctx.moveTo(0, offset);
    ctx.lineTo(board.width, offset);
  }
  ctx.strokeStyle = '#30213e26';
  ctx.stroke();
}

function updateButtons() {
  const empty = !pixels.some(Boolean);
  undo.disabled = history.length === 0 || Boolean(stroke);
  download.disabled = empty;
  save.disabled = empty || saving || Boolean(stroke) || pixels.join(',') === savedKey;
}

function selectTool(value) {
  tool = value;
  for (const button of toolButtons) button.setAttribute('aria-pressed', button.dataset.tool === tool);
}

function selectColor(value) {
  color = value;
  colorInput.value = value;
  selectTool('pen');
  for (const button of palette.children) button.setAttribute('aria-pressed', button.dataset.color === color);
}

for (const value of swatches) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'swatch';
  button.dataset.color = value;
  button.title = value;
  button.setAttribute('aria-label', `颜色 ${value}`);
  button.style.setProperty('--swatch', value);
  button.addEventListener('click', () => selectColor(value));
  palette.append(button);
}
for (const button of toolButtons) button.addEventListener('click', () => selectTool(button.dataset.tool));
colorInput.addEventListener('input', () => selectColor(colorInput.value));
selectColor(color);

function cellAt(event) {
  const bounds = board.getBoundingClientRect();
  const x = Math.floor((event.clientX - bounds.left) / bounds.width * side);
  const y = Math.floor((event.clientY - bounds.top) / bounds.height * side);
  return x >= 0 && x < side && y >= 0 && y < side ? { x, y } : null;
}

function drawLine(start, end, value) {
  let { x, y } = start;
  const dx = Math.abs(end.x - x);
  const dy = Math.abs(end.y - y);
  const sx = Math.sign(end.x - x);
  const sy = Math.sign(end.y - y);
  let error = dx - dy;
  while (true) {
    pixels[y * side + x] = value;
    if (x === end.x && y === end.y) break;
    const step = 2 * error;
    if (step > -dy) { error -= dy; x += sx; }
    if (step < dx) { error += dx; y += sy; }
  }
}

board.addEventListener('pointerdown', event => {
  if (stroke || event.button !== 0) return;
  const cell = cellAt(event);
  if (!cell) return;
  board.setPointerCapture(event.pointerId);
  stroke = { id: event.pointerId, before: pixels.slice(), last: cell, value: tool === 'eraser' ? null : color };
  drawLine(cell, cell, stroke.value);
  message.textContent = '';
  render();
  updateButtons();
});

board.addEventListener('pointermove', event => {
  if (stroke?.id !== event.pointerId) return;
  const cell = cellAt(event);
  if (cell) {
    drawLine(stroke.last ?? cell, cell, stroke.value);
    render();
  }
  stroke.last = cell;
});

function finishStroke(event) {
  if (stroke?.id !== event.pointerId) return;
  if (pixels.some((value, i) => value !== stroke.before[i])) {
    if (history.length === 100) history.shift();
    history.push(stroke.before);
  }
  stroke = null;
  updateButtons();
}

for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  board.addEventListener(event, finishStroke);
}

undo.addEventListener('click', () => {
  if (stroke || !history.length) return;
  pixels = history.pop();
  message.textContent = '';
  render();
  updateButtons();
});

function artworkCanvas(artwork, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side * scale;
  const image = canvas.getContext('2d');
  artwork.forEach((value, i) => {
    if (!value) return;
    image.fillStyle = value;
    image.fillRect(i % side * scale, Math.floor(i / side) * scale, scale, scale);
  });
  return canvas;
}

download.addEventListener('click', () => {
  const png = artworkCanvas(pixels, 16);
  png.toBlob(blob => {
    if (!blob) {
      message.textContent = 'PNG 导出失败，请重试。';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '像素工坊.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
});

save.addEventListener('click', async () => {
  const submitted = pixels.slice();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  saving = true;
  message.textContent = '正在保存…';
  updateButtons();
  try {
    const response = await fetch('/pixel/api/artworks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixels: submitted }),
      signal: controller.signal,
    });
    if (response.status === 429) {
      message.textContent = '保存太频繁，请稍后重试。';
    } else if (response.status === 507) {
      message.textContent = '图库已满，你仍然可以导出 PNG。';
    } else if (response.ok) {
      savedKey = submitted.join(',');
      message.textContent = '已保存到网站图库。';
    } else {
      throw new Error('Save failed');
    }
  } catch {
    message.textContent = '暂时无法保存，请重试或先导出 PNG。';
  } finally {
    clearTimeout(timeout);
    saving = false;
    updateButtons();
  }
});

const gallery = document.querySelector('#gallery');
const grid = document.querySelector('#gallery-grid');
const galleryStatus = document.querySelector('#gallery-status');
const galleryPages = document.querySelector('#gallery-pages');
const previous = document.querySelector('#gallery-prev');
const next = document.querySelector('#gallery-next');
let galleryPage = 1;
let galleryRequest;

async function loadGallery(page) {
  galleryRequest?.abort();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  galleryRequest = controller;
  galleryStatus.textContent = '正在加载图库…';
  grid.replaceChildren();
  previous.disabled = next.disabled = true;
  try {
    const response = await fetch(`/pixel/api/artworks?page=${page}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Gallery unavailable');
    const result = await response.json();
    if (galleryRequest !== controller) return;
    galleryPage = result.page;
    galleryStatus.textContent = result.total ? `共 ${result.total} 张作品` : '图库还没有作品。';
    grid.replaceChildren(...result.artworks.map((artwork, index) => {
      const item = document.createElement('li');
      const canvas = artworkCanvas(artwork, 1);
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `本页第 ${index + 1} 张像素画`);
      item.append(canvas);
      return item;
    }));
    galleryPages.hidden = result.pages < 2;
    document.querySelector('#gallery-page').textContent = `${result.page} / ${result.pages}`;
    previous.disabled = result.page <= 1;
    next.disabled = result.page >= result.pages;
  } catch {
    if (galleryRequest !== controller) return;
    galleryPages.hidden = true;
    galleryStatus.textContent = '图库暂时无法打开，请关闭后重试。';
  } finally {
    clearTimeout(timeout);
  }
}

document.querySelector('#open-gallery').addEventListener('click', () => {
  gallery.showModal();
  loadGallery(1);
});
gallery.addEventListener('close', () => {
  if (gallery.open) return;
  galleryRequest?.abort();
  galleryRequest = undefined;
});
previous.addEventListener('click', () => loadGallery(galleryPage - 1));
next.addEventListener('click', () => loadGallery(galleryPage + 1));

render();
