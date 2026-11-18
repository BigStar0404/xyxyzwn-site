import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const store = resolve(process.env.PIXEL_DATA_DIR || fileURLToPath(new URL('./data/', import.meta.url)));
const port = Number(process.env.PIXEL_PORT || 1313);
const capacity = 2000;
const maxBodyBytes = 4096;
const maxConcurrentSaves = 8;
const galleryPageSize = 24;
const files = new Map([
  ['/pixel/', ['index.html', 'text/html; charset=utf-8']],
  ['/pixel/studio.css', ['studio.css', 'text/css; charset=utf-8']],
  ['/pixel/studio.js', ['studio.js', 'text/javascript; charset=utf-8']],
]);
const artworkName = /^[a-f0-9]{64}\.json$/;
const color = /^#[0-9a-f]{6}$/i;
let activeSaves = 0;
let queuedWrites = Promise.resolve();

await mkdir(store, { recursive: true });

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function validPixels(pixels) {
  return Array.isArray(pixels) && pixels.length === 256 &&
    pixels.every(value => value === null || (typeof value === 'string' && color.test(value))) &&
    pixels.some(Boolean);
}

async function artworkFiles() {
  return (await readdir(store)).filter(name => artworkName.test(name));
}

async function sampleArtworks(res) {
  const names = await artworkFiles();
  const count = Math.min(20, names.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (names.length - i));
    [names[i], names[j]] = [names[j], names[i]];
  }
  json(res, 200, { artworks: await readArtworks(names.slice(0, count)) });
}

async function readArtworks(names) {
  const artworks = await Promise.all(names.map(async name => {
    const pixels = JSON.parse(await readFile(join(store, name), 'utf8'));
    return validPixels(pixels) ? pixels : null;
  }));
  return artworks.filter(Boolean);
}

async function gallery(res, requestedPage) {
  const names = (await artworkFiles()).sort();
  const pages = Math.max(1, Math.ceil(names.length / galleryPageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(requestedPage, 10) || 1));
  const start = (page - 1) * galleryPageSize;
  const artworks = await readArtworks(names.slice(start, start + galleryPageSize));
  json(res, 200, { artworks, page, pages, total: names.length });
}

async function persist(pixels) {
  const content = JSON.stringify(pixels.map(value => value?.toLowerCase() ?? null));
  const name = createHash('sha256').update(content).digest('hex') + '.json';
  const names = await artworkFiles();
  if (names.includes(name)) return { status: 200, id: name.slice(0, -5) };
  if (names.length >= capacity) return { status: 507 };
  const pending = join(store, name + '.tmp');
  try {
    await writeFile(pending, content, { mode: 0o600 });
    await rename(pending, join(store, name));
  } finally {
    await rm(pending, { force: true });
  }
  return { status: 201, id: name.slice(0, -5) };
}

async function saveArtwork(req, res) {
  if (req.headers['sec-fetch-site'] === 'cross-site' ||
      (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) {
    return json(res, 403, { error: 'origin' });
  }
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    return json(res, 415, { error: 'content-type' });
  }
  if (Number(req.headers['content-length']) > maxBodyBytes) {
    return json(res, 413, { error: 'too-large' });
  }
  if (activeSaves >= maxConcurrentSaves) return json(res, 429, { error: 'busy' });

  activeSaves++;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > maxBodyBytes) {
        req.resume();
        return json(res, 413, { error: 'too-large' });
      }
      chunks.push(chunk);
    }
    let pixels;
    try {
      pixels = JSON.parse(Buffer.concat(chunks).toString('utf8'))?.pixels;
    } catch {
      return json(res, 400, { error: 'invalid-json' });
    }
    if (!validPixels(pixels)) return json(res, 400, { error: 'invalid-pixels' });
    const write = queuedWrites.then(() => persist(pixels));
    queuedWrites = write.catch(() => {});
    const { status, id } = await write;
    json(res, status, id ? { id } : { error: 'gallery-full' });
  } finally {
    activeSaves--;
  }
}

function proxy(req, res, upstream) {
  const outgoing = request({
    hostname: '127.0.0.1',
    port: upstream,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `127.0.0.1:${upstream}` },
    timeout: 10000,
  }, source => {
    res.writeHead(source.statusCode, source.headers);
    source.pipe(res);
  });
  outgoing.on('timeout', () => outgoing.destroy());
  outgoing.on('error', () => {
    if (res.headersSent) res.destroy();
    else json(res, 502, { error: 'preview-upstream-unavailable' });
  });
  res.on('close', () => outgoing.destroy());
  req.pipe(outgoing);
}

async function route(req, res) {
  const { pathname: path, searchParams } = new URL(req.url, 'http://localhost');
  if (path === '/pixel/api/artworks') {
    if (req.method === 'GET') {
      return searchParams.has('page') ? gallery(res, searchParams.get('page')) : sampleArtworks(res);
    }
    if (req.method === 'POST') return saveArtwork(req, res);
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'method' });
  if (path === '/pixel') {
    res.writeHead(308, { Location: '/pixel/' }).end();
    return;
  }
  if (files.has(path)) {
    const [name, type] = files.get(path);
    const body = await readFile(new URL(name, import.meta.url));
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  if (path.startsWith('/pixel/')) return json(res, 404, { error: 'not-found' });
  if (process.env.PIXEL_PREVIEW !== '1') return json(res, 404, { error: 'not-found' });
  proxy(req, res, path === '/game' || path.startsWith('/game/') ? 5173 : 1314);
}

createServer({ requestTimeout: 10000, headersTimeout: 5000 }, (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  route(req, res).catch(error => {
    console.error(error);
    if (res.headersSent) res.destroy();
    else json(res, 500, { error: 'server' });
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Pixel Studio: http://127.0.0.1:${port}/pixel/`);
});
