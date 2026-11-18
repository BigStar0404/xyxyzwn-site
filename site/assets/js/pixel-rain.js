const toggle = document.querySelector('#pixel-rain-toggle');
const status = document.querySelector('#pixel-rain-status');
const limit = 20;
let request;
let stopAnimation;

function stop() {
  request?.abort();
  request = undefined;
  stopAnimation?.();
  stopAnimation = undefined;
  toggle.setAttribute('aria-pressed', 'false');
}

async function start() {
  status.textContent = '';
  const controller = new AbortController();
  request = controller;
  toggle.setAttribute('aria-pressed', 'true');
  try {
    const response = await fetch('/pixel/api/artworks', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(7000)]),
    });
    if (!response.ok) throw new Error('Gallery unavailable');
    const { artworks } = await response.json();
    if (request !== controller) return;
    if (artworks.length) {
      stopAnimation = animate(artworks.slice(0, limit));
    } else {
      stop();
      status.textContent = toggle.dataset.empty;
    }
  } catch {
    if (request !== controller) return;
    stop();
    status.textContent = toggle.dataset.error;
  } finally {
    if (request === controller) request = undefined;
  }
}

toggle.addEventListener('click', () => {
  if (request || stopAnimation) stop();
  else start();
});
start();

function makeTile(pixels) {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 16;
  const ctx = tile.getContext('2d');
  pixels.forEach((color, i) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(i % 16, Math.floor(i / 16), 1, 1);
  });
  return tile;
}

function bounceApart(a, b, size) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const overlapX = size - Math.abs(dx);
  const overlapY = size - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return;
  if (overlapX < overlapY) {
    const push = Math.sign(dx || 1) * overlapX / 2;
    a.x += push;
    b.x -= push;
    if ((a.vx - b.vx) * push < 0) [a.vx, b.vx] = [b.vx, a.vx];
  } else {
    const push = Math.sign(dy || 1) * overlapY / 2;
    a.y += push;
    b.y -= push;
    if ((a.vy - b.vy) * push < 0) [a.vy, b.vy] = [b.vy, a.vy];
  }
}

function animate(artworks) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-rain-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const gravity = 440;
  let width, height, size, frame, travel, speedLimit;
  let last = performance.now();
  let elapsed = 0;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    size = width < 560 ? 32 : 44;
    travel = Math.max(1, height - size);
    speedLimit = Math.sqrt(2 * gravity * travel) + 40;
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    ctx.setTransform(density, 0, 0, density, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  const tiles = artworks.map((pixels, index) => ({
    image: makeTile(pixels),
    x: Math.random() * (width - size),
    y: -size,
    vx: (Math.random() - 0.5) * 165,
    vy: 20,
    dropAt: index * 0.12,
  }));

  function draw(now) {
    const dt = Math.min((now - last) / 1000, 0.02);
    last = now;
    elapsed += dt;
    const active = tiles.filter(tile => tile.dropAt <= elapsed);
    ctx.clearRect(0, 0, width, height);
    for (const tile of active) {
      tile.vy = Math.min(tile.vy + gravity * dt, speedLimit);
      tile.x += tile.vx * dt;
      tile.y += tile.vy * dt;
    }
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) bounceApart(active[i], active[j], size);
    }
    for (const tile of active) {
      if (tile.x < 0 || tile.x > width - size) {
        tile.vx = tile.x < 0 ? Math.abs(tile.vx) : -Math.abs(tile.vx);
        tile.x = Math.max(0, Math.min(width - size, tile.x));
      }
      if (tile.y < -size) {
        tile.y = -size;
        tile.vy = Math.abs(tile.vy);
      } else if (tile.y > travel) {
        tile.y = travel;
        const rebound = Math.abs(tile.vy) * 0.88;
        if (rebound ** 2 / (2 * gravity) < travel * 0.58) {
          const jumpHeight = travel * (0.72 + Math.random() * 0.22);
          tile.vy = -Math.sqrt(2 * gravity * jumpHeight);
          tile.vx = (Math.random() < 0.5 ? -1 : 1) * (65 + Math.random() * 100);
        } else {
          tile.vy = -rebound;
        }
      }
      const x = Math.round(tile.x);
      const y = Math.round(tile.y);
      ctx.fillStyle = '#fff8eb';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = '#362742';
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      ctx.drawImage(tile.image, x + 2, y + 2, size - 4, size - 4);
    }
    frame = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  frame = requestAnimationFrame(draw);
  return () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(frame);
    canvas.remove();
  };
}
