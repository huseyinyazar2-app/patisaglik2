import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlUrl = 'file:///C:/Users/hyaza/Documents/antigravitiy/patisaglik2/docs/pet-help-a4-brosur.html';
const outFile = path.join(root, 'docs', 'Pet-Help-A4-Brochure.png');
const profileDir = path.join(root, '.chrome-brochure-render-profile');
const port = 9334;
const width = 1240;
const height = 1754;

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function waitForChrome() {
  for (let i = 0; i < 80; i += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await delay(250);
    }
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

function createCdpClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || 'CDP error'));
      else resolve(message.result || {});
      return;
    }
    if (message.method && events.has(message.method)) {
      events.get(message.method).forEach((handler) => handler(message.params || {}));
    }
  });

  return {
    async open() {
      if (socket.readyState === WebSocket.OPEN) return;
      await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
      });
    },
    send(method, params = {}) {
      const callId = ++id;
      socket.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
    },
    once(method) {
      return new Promise((resolve) => {
        const handler = (params) => {
          const list = events.get(method) || [];
          events.set(method, list.filter((item) => item !== handler));
          resolve(params);
        };
        events.set(method, [...(events.get(method) || []), handler]);
      });
    },
    close() {
      socket.close();
    }
  };
}

async function main() {
  await fs.mkdir(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    await waitForChrome();
    const target = await fetchJson(`http://127.0.0.1:${port}/json/new`, { method: 'PUT' });
    const cdp = createCdpClient(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: htmlUrl });
    await loaded;
    await delay(700);
    const screenshot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    await fs.writeFile(outFile, Buffer.from(screenshot.data, 'base64'));
    console.log(outFile);
    cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
