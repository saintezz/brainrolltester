const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

const BOT_TOKEN = process.env.BOT_TOKEN || 'ЗАМЕНИТЕ_НА_ВАШ_ТОКЕН';

const PROMO_FILE = path.join(DATA_DIR, 'promocodes.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');
const WITHDRAWS_FILE = path.join(DATA_DIR, 'withdraws.json');
const MAINTENANCE_FILE = path.join(DATA_DIR, 'maintenance.json');
const ANNOUNCEMENT_FILE = path.join(DATA_DIR, 'announcement.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

const ADMIN_USERNAMES = ['saintezz7', 'vortyn1'];

const START_BALANCE = 500;

const ITEMS = {
  lagrande: { name: 'La Grande Combination', price: 4 },
  nuclearo: { name: 'Nuclearo Dinausauro', price: 12 },
  witchbroom: { name: 'Witch Broom', price: 29 },
  cupid: { name: 'Cupid Wings', price: 34 },
  garama: { name: 'Garama and Madundung', price: 41 },
  waverider: { name: 'Waverider', price: 41 },
  burguro: { name: 'Burguro and Fryuro', price: 70 },
  popcuru: { name: 'Popcuru and Fizzuru', price: 87 },
  celestial: { name: 'Celestial Pegasus', price: 93 },
  lafoodcombinasion: { name: 'La Food Combinasion', price: 103 },
  cooki: { name: 'Cooki and Milki', price: 130 },
  jolly: { name: 'Jolly Jolly Sahur', price: 132 },
  cerberus: { name: 'Cerberus', price: 155 },
  globba: { name: 'Globba Steppa', price: 164 },
  dugdugdug: { name: 'Dug Dug Dug', price: 201 },
  losamigos: { name: 'Los Amigos', price: 220 },
  guest666: { name: 'Guest 666', price: 324 },
  losadmins: { name: 'Los Admins', price: 370 },
  rubiko: { name: 'Rubiko and Kubiko', price: 395 },
  lossecret: { name: 'Los Secret Combinasionas', price: 419 },
  ricodinero: { name: 'Rico Dinero', price: 430 },
  foxinilanternini: { name: 'Foxini Lanternini', price: 480 },
  roseyandteddy: { name: 'Rosey and Teddy', price: 501 },
  lacasaboo: { name: 'La Casa Boo', price: 551 },
  ketupas: { name: 'Ketupas Bros', price: 641 },
  skelly: { name: 'Skelly and Coffy', price: 866 },
  dragon: { name: 'Dragon Cannelloni', price: 890 },
  hydra: { name: 'Hydra Dragon Cannelloni', price: 1220 },
  tirilikalika: { name: 'Tirilikalika Tirilikalaka', price: 1255 },
  moby: { name: 'Moby Bros', price: 1600 },
  gingergeart: { name: 'Ginger Gerat', price: 1920 },
  kraken: { name: 'Kraken', price: 2030 },
  digi: { name: 'Digi Narwhal', price: 3492 },
  kalikabros: { name: 'Kalika Bros', price: 3490 },
  dragonaquanini: { name: 'Dragon Aquanini', price: 3701 },
  lovelovebear: { name: 'Love Love Bear', price: 5540 },
  antonio: { name: 'Antonio', price: 5549 },
  griffin: { name: 'Griffin', price: 6307 },
  elefantofrigo: { name: 'Elefanto Frigo', price: 11232 },
  skibidi: { name: 'Skibidi Toilet', price: 13154 },
  johnpork: { name: 'John Pork', price: 16054 },
  meowl: { name: 'Meowl', price: 16839 },
  orchidox: { name: 'Orchidox', price: 16704 },
  signorecarapace: { name: 'Signore Carapace', price: 35000 },
  polaroidini: { name: 'Polaroidini', price: 40000 },
  strawberryelephant: { name: 'Strawberry Elephant', price: 41400 },
  headless: { name: 'Headless Horseman', price: 235000 }
};

const CASE_ONLY_ITEMS = {
  cyberskibidi: { name: 'Cyber Skibidi Toilet', price: 31000 },
  yinyangmeowl: { name: 'YinYang Meowl', price: 35000 },
  goldstrawberry: { name: 'Gold Strawberry Elephant', price: 45000 },
  lavastrawberry: { name: 'Lava Strawberry Elephant', price: 56000 }
};

const CASES = {
  witch: { name: 'Witch Case', price: 10, rewards: [{ id: 'lagrande', chance: 76 }, { id: 'nuclearo', chance: 22 }, { id: 'cupid', chance: 1.5 }, { id: 'garama', chance: 0.3 }, { id: 'burguro', chance: 0.2 }, { id: 'popcuru', chance: 0.1 }] },
  fruits: { name: 'Fruits Case', price: 19, rewards: [{ id: 'lagrande', chance: 30 }, { id: 'nuclearo', chance: 50 }, { id: 'cupid', chance: 15 }, { id: 'waverider', chance: 5 }] },
  garama: { name: 'Garama Case', price: 29, rewards: [{ id: 'nuclearo', chance: 40 }, { id: 'cupid', chance: 40 }, { id: 'garama', chance: 15 }, { id: 'burguro', chance: 5 }] },
  yeti: { name: 'Yeti Case', price: 40, rewards: [{ id: 'nuclearo', chance: 50 }, { id: 'cupid', chance: 40 }, { id: 'burguro', chance: 9.99 }, { id: 'polaroidini', chance: 0.01 }] },
  school: { name: 'School Case', price: 59, rewards: [{ id: 'witchbroom', chance: 60 }, { id: 'garama', chance: 20 }, { id: 'lafoodcombinasion', chance: 5 }, { id: 'cerberus', chance: 4 }, { id: 'losadmins', chance: 1 }] },
  arcadragon: { name: 'Arcadragon Case', price: 200, rewards: [{ id: 'cerberus', chance: 60 }, { id: 'globba', chance: 20 }, { id: 'dugdugdug', chance: 10 }, { id: 'guest666', chance: 5 }, { id: 'rubiko', chance: 4 }, { id: 'dragon', chance: 1 }] },
  vampire: { name: 'Vampire Case', price: 299, rewards: [{ id: 'dugdugdug', chance: 50 }, { id: 'losamigos', chance: 30 }, { id: 'losadmins', chance: 12 }, { id: 'ricodinero', chance: 8 }] },
  tacos: { name: 'Tacos Case', price: 340, rewards: [{ id: 'guest666', chance: 77 }, { id: 'losadmins', chance: 13 }, { id: 'rubiko', chance: 10 }] },
  dragon: { name: 'Dragon Case', price: 3900, rewards: [{ id: 'kraken', chance: 70 }, { id: 'digi', chance: 15 }, { id: 'kalikabros', chance: 10 }, { id: 'dragonaquanini', chance: 4.9 }, { id: 'meowl', chance: 0.1 }] },
  strawberry: { name: 'Strawberry Case', price: 8900, rewards: [{ id: 'griffin', chance: 70 }, { id: 'elefantofrigo', chance: 20 }, { id: 'skibidi', chance: 5 }, { id: 'meowl', chance: 5 }] },
  griffin: { name: 'Griffin Case', price: 17000, rewards: [{ id: 'skibidi', chance: 50 }, { id: 'johnpork', chance: 30 }, { id: 'meowl', chance: 17 }, { id: 'strawberryelephant', chance: 3 }] }
};

const MAX_CHANCE = 80;
const MIN_CHANCE = 0.01;

function getItem(id) { return ITEMS[id] || CASE_ONLY_ITEMS[id] || null; }
function calcUpgradeChance(sourcePrice, targetPrice) {
  if (!sourcePrice || !targetPrice || targetPrice <= sourcePrice) return 0;
  let pct = MAX_CHANCE / (targetPrice / sourcePrice);
  return Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, pct));
}

let promocodes = {}, users = {}, deposits = [], withdraws = [];
let maintenance = { enabled: false, since: null, by: '' };
let currentAnnouncement = null;
let stats = { total_upgrades: 0, total_cases: 0 };
let onlineUsers = new Map();

function ensureDataDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {} }
function loadJSON(file, fallback) { try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { console.error('[ERROR] Load', file, err.message); } return fallback; }
function saveJSON(file, data) { try { ensureDataDir(); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); } catch (err) { console.error('[ERROR] Save', file, err.message); } }

function loadAll() {
  promocodes = loadJSON(PROMO_FILE, {});
  users = loadJSON(USERS_FILE, {});
  deposits = loadJSON(DEPOSITS_FILE, []);
  withdraws = loadJSON(WITHDRAWS_FILE, []);
  maintenance = loadJSON(MAINTENANCE_FILE, { enabled: false, since: null, by: '' });
  currentAnnouncement = loadJSON(ANNOUNCEMENT_FILE, null);
  stats = loadJSON(STATS_FILE, { total_upgrades: 0, total_cases: 0 });
}
function savePromos() { saveJSON(PROMO_FILE, promocodes); }
function saveUsers() { saveJSON(USERS_FILE, users); }
function saveDeposits() { saveJSON(DEPOSITS_FILE, deposits); }
function saveWithdraws() { saveJSON(WITHDRAWS_FILE, withdraws); }
function saveMaintenance() { saveJSON(MAINTENANCE_FILE, maintenance); }
function saveAnnouncement() { saveJSON(ANNOUNCEMENT_FILE, currentAnnouncement); }
function saveStats() { saveJSON(STATS_FILE, stats); }

function updateOnline(telegramId) {
  if (!telegramId) return;
  onlineUsers.set(String(telegramId), Date.now());
}
function getOnlineCount() {
  const now = Date.now();
  let count = 0;
  for (const [id, time] of onlineUsers) {
    if (now - time < 60000) {
      count++;
    } else {
      onlineUsers.delete(id);
    }
  }
  return count;
}

function setCORS(res) { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data'); }
function sendJSON(res, status, data) { setCORS(res); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }

function readBody(req) {
  if (req.__body !== undefined) return Promise.resolve(req.__body);
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c.toString());
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        req.__body = parsed;
        resolve(parsed);
      } catch (e) { reject(new Error('Неверный JSON')); }
    });
    req.on('error', reject);
  });
}

function validateTelegramInitData(initData) {
  if (!initData || BOT_TOKEN === 'ЗАМЕНИТЕ_НА_ВАШ_ТОКЕН') return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash'); if (!hash) return null;
    params.delete('hash');
    const dataCheckString = [...params.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computedHash !== hash) return null;
    const userJson = params.get('user'); if (!userJson) return null;
    const u = JSON.parse(userJson);
    return { id: String(u.id), username: u.username || '' };
  } catch (e) { return null; }
}
function getTelegramUser(req, body) {
  const validated = validateTelegramInitData(req.headers['x-telegram-init-data']);
  if (validated) return validated;
  if (body && body.telegram_id) return { id: String(body.telegram_id), username: body.username || '' };
  return null;
}
function ensureUser(telegramId, username) {
  if (!telegramId) telegramId = 'guest_' + Date.now();
  if (!users[telegramId]) {
    users[telegramId] = { balance: START_BALANCE, inventory: [], username: username || '', roblox_name: '', custom_nick: '', avatar: '', accent: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  } else if (username && users[telegramId].username !== username) {
    users[telegramId].username = username; users[telegramId].updated_at = new Date().toISOString();
  }
  return users[telegramId];
}
function isAdmin(username) { return ADMIN_USERNAMES.includes((username || '').toLowerCase()); }
function computePendingWithdrawIds(telegramId) { const s = new Set(); for (const w of withdraws) { if (w.status === 'pending' && String(w.telegram_id) === String(telegramId)) s.add(w.item_id); } return [...s]; }
function publicUser(u, telegramId) { return { balance: u.balance || 0, inventory: Array.isArray(u.inventory) ? u.inventory : [], username: u.username || '', custom_nick: u.custom_nick || '', avatar: u.avatar || '', pending_withdraw_ids: computePendingWithdrawIds(telegramId) }; }

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { setCORS(res); res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    setCORS(res);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Brainrot Game server is alive');
    return;
  }

  try {
    if (req.method === 'POST') {
      try { await readBody(req); } catch (e) { req.__body = {}; }
    }

    if (req.method === 'GET' && req.url === '/api/stats') {
      return sendJSON(res, 200, { ok: true, online: getOnlineCount(), upgrades: stats.total_upgrades, cases: stats.total_cases });
    }

    if (req.method === 'GET' && req.url === '/api/announcement') {
      if (currentAnnouncement && (Date.now() - currentAnnouncement.timestamp > 10000)) {
        currentAnnouncement = null;
        saveAnnouncement();
      }
      return sendJSON(res, 200, { ok: true, announcement: currentAnnouncement });
    }

    if (maintenance.enabled) {
      const allowed =
        (req.method === 'GET' && req.url === '/api/maintenance') ||
        (req.method === 'GET' && req.url === '/api/stats') ||
        (req.method === 'GET' && req.url === '/api/announcement') ||
        (req.method === 'POST' && req.url === '/api/admin/maintenance');

      if (!allowed) {
        const initUser = validateTelegramInitData(req.headers['x-telegram-init-data']);
        const bodyUser = req.__body || {};
        const effectiveUsername = (initUser?.username || bodyUser.username || '').toLowerCase();

        if (!isAdmin(effectiveUsername)) {
          return sendJSON(res, 503, { ok: false, error: 'MAINTENANCE', message: 'Технический перерыв' });
        }
      }
    }

    if (req.method === 'GET' && req.url === '/api/maintenance') {
      return sendJSON(res, 200, { ok: true, maintenance });
    }
    if (req.method === 'POST' && req.url === '/api/admin/maintenance') {
      const body = await readBody(req);
      const admin = (body.admin_username || '').toLowerCase();
      if (!isAdmin(admin)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const { enabled } = body;
      maintenance = { enabled: !!enabled, since: enabled ? new Date().toISOString() : null, by: enabled ? admin : '' };
      saveMaintenance();
      return sendJSON(res, 200, { ok: true, maintenance });
    }

    if (req.method === 'POST' && req.url === '/api/admin/announce') {
      const body = await readBody(req);
      const admin = (body.admin_username || '').toLowerCase();
      if (!isAdmin(admin)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      
      if (currentAnnouncement && (Date.now() - currentAnnouncement.timestamp <= 10000)) {
        return sendJSON(res, 429, { ok: false, error: 'Подождите, пока текущий анонс не закончится' });
      }

      const text = (body.text || '').trim();
      if (!text) return sendJSON(res, 400, { ok: false, error: 'Текст не может быть пустым' });
      
      currentAnnouncement = { text, timestamp: Date.now(), by: admin, username: admin };
      saveAnnouncement();
      return sendJSON(res, 200, { ok: true, announcement: currentAnnouncement });
    }

    if (req.method === 'POST' && req.url === '/api/create') {
      const body = await readBody(req);
      const { code, uses, type, value, admin_username } = body;
      if (!isAdmin(admin_username)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      if (!code || code.trim().length < 3) return sendJSON(res, 400, { ok: false, error: 'Название минимум 3 символа' });
      const upperCode = code.trim().toUpperCase();
      if (promocodes[upperCode]) return sendJSON(res, 409, { ok: false, error: 'Промокод уже есть' });
      if (type === 'item' && !getItem(value)) return sendJSON(res, 400, { ok: false, error: 'Неизвестный предмет' });
      promocodes[upperCode] = { code: upperCode, uses: parseInt(uses), type, value: type === 'percent' ? parseInt(value) : value, createdAt: new Date().toISOString() };
      savePromos();
      return sendJSON(res, 200, { ok: true, promo: promocodes[upperCode] });
    }
    if (req.method === 'POST' && req.url === '/api/activate') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const { code } = body;
      if (!code) return sendJSON(res, 400, { ok: false, error: 'Введите промокод' });
      const upperCode = code.trim().toUpperCase();
      const promo = promocodes[upperCode];
      if (!promo) return sendJSON(res, 404, { ok: false, error: 'Промокод не найден' });
      if (promo.uses <= 0) return sendJSON(res, 410, { ok: false, error: 'Промокод больше не активен' });
      promo.uses -= 1; savePromos();
      const u = ensureUser(user.id, user.username);
      if (promo.type === 'balance') u.balance = (u.balance || 0) + promo.value;
      else if (promo.type === 'item') { if (!Array.isArray(u.inventory)) u.inventory = []; u.inventory.push(promo.value); }
      u.updated_at = new Date().toISOString(); saveUsers();
      return sendJSON(res, 200, { ok: true, type: promo.type, value: promo.value, remaining: promo.uses });
    }
    if (req.method === 'GET' && req.url === '/api/promocodes') return sendJSON(res, 200, { ok: true, promocodes });

    if (req.method === 'POST' && req.url === '/api/case/open') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const { case_id, qty } = body;
      const c = CASES[case_id]; if (!c) return sendJSON(res, 404, { ok: false, error: 'Кейс не найден' });
      const quantity = Math.max(1, Math.min(5, parseInt(qty) || 1));
      const u = ensureUser(user.id, user.username);
      const totalCost = c.price * quantity;
      if (u.balance < totalCost) return sendJSON(res, 400, { ok: false, error: 'Недостаточно монет' });
      u.balance -= totalCost;
      const wonItems = [];
      for (let i = 0; i < quantity; i++) {
        const rng = Math.random() * 100; let acc = 0; let wonId = c.rewards[0].id;
        for (const r of c.rewards) { acc += r.chance; if (rng <= acc) { wonId = r.id; break; } }
        u.inventory.push(wonId); wonItems.push(wonId);
      }
      u.updated_at = new Date().toISOString(); saveUsers();
      
      stats.total_cases += quantity;
      saveStats();
      
      return sendJSON(res, 200, { ok: true, won: wonItems, new_balance: u.balance, inventory: u.inventory });
    }

    if (req.method === 'POST' && req.url === '/api/upgrade') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const { source_item_id, target_item_id } = body;
      const src = getItem(source_item_id), tgt = getItem(target_item_id);
      if (!src || !tgt) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      if (tgt.price <= src.price) return sendJSON(res, 400, { ok: false, error: 'Цель должна быть дороже' });
      const u = ensureUser(user.id, user.username);
      const idx = u.inventory.indexOf(source_item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Исходный предмет не найден' });
      if (computePendingWithdrawIds(user.id).includes(source_item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });
      u.inventory.splice(idx, 1);
      const chance = calcUpgradeChance(src.price, tgt.price);
      const success = Math.random() * 100 <= chance;
      if (success) { 
        u.inventory.push(target_item_id); 
      }
      u.updated_at = new Date().toISOString(); saveUsers();
      
      stats.total_upgrades += 1;
      saveStats();
      
      return sendJSON(res, 200, { ok: true, success, chance, won_item: success ? target_item_id : null, new_balance: u.balance, inventory: u.inventory });
    }

    if (req.method === 'POST' && req.url === '/api/shop/buy') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const { item_id } = body;
      const item = getItem(item_id); if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      const u = ensureUser(user.id, user.username);
      if (u.balance < item.price) return sendJSON(res, 400, { ok: false, error: 'Недостаточно монет' });
      u.balance -= item.price; u.inventory.push(item_id);
      u.updated_at = new Date().toISOString(); saveUsers();
      return sendJSON(res, 200, { ok: true, new_balance: u.balance, inventory: u.inventory });
    }
    if (req.method === 'POST' && req.url === '/api/shop/sell') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const { item_id } = body;
      const item = getItem(item_id); if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      const u = ensureUser(user.id, user.username);
      const idx = u.inventory.indexOf(item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Предмета нет в инвентаре' });
      if (computePendingWithdrawIds(user.id).includes(item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });
      u.inventory.splice(idx, 1); u.balance += item.price;
      u.updated_at = new Date().toISOString(); saveUsers();
      return sendJSON(res, 200, { ok: true, new_balance: u.balance, inventory: u.inventory });
    }

    if (req.method === 'POST' && req.url === '/api/deposit/create') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const { item_id, roblox_name } = body;
      if (!item_id || !roblox_name) return sendJSON(res, 400, { ok: false, error: 'Не хватает данных' });
      const u = ensureUser(user.id, user.username);
      const dep = { id: 'dep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), telegram_id: user.id, username: user.username || '', item_id, item_name: getItem(item_id)?.name || '', item_price: getItem(item_id)?.price || 0, base_price: getItem(item_id)?.price || 0, roblox_name, status: 'pending', created_at: new Date().toISOString() };
      deposits.push(dep); saveDeposits();
      return sendJSON(res, 200, { ok: true, deposit: dep });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/deposits')) {
      const url = new URL(req.url, 'http://localhost'); const admin = url.searchParams.get('admin') || '';
      if (!isAdmin(admin)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      return sendJSON(res, 200, { ok: true, deposits });
    }
    if (req.method === 'POST' && req.url === '/api/deposit/status') {
      const body = await readBody(req);
      const { id, status, admin } = body;
      if (!isAdmin(admin)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      if (!id || !['accepted', 'rejected'].includes(status)) return sendJSON(res, 400, { ok: false, error: 'Неверные данные' });
      const dep = deposits.find(d => d.id === id); if (!dep) return sendJSON(res, 404, { ok: false, error: 'Заявка не найдена' });
      if (dep.status !== 'pending') return sendJSON(res, 409, { ok: false, error: 'Уже обработана' });
      dep.status = status; dep.processed_at = new Date().toISOString(); dep.processed_by = admin || 'admin';
      if (status === 'accepted') { const u = ensureUser(dep.telegram_id, dep.username); u.balance = (u.balance || 0) + dep.item_price; saveUsers(); }
      saveDeposits();
      return sendJSON(res, 200, { ok: true, deposit: dep });
    }

    if (req.method === 'POST' && req.url === '/api/withdraw/create') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const { item_id, roblox_name, time_slot, comment } = body;
      if (!item_id || !roblox_name || !time_slot) return sendJSON(res, 400, { ok: false, error: 'Не хватает данных' });
      const u = ensureUser(user.id, user.username);
      if (u.inventory.indexOf(item_id) === -1) return sendJSON(res, 400, { ok: false, error: 'Предмет не найден в инвентаре' });
      if (withdraws.some(w => w.status === 'pending' && String(w.telegram_id) === String(user.id) && w.item_id === item_id)) return sendJSON(res, 409, { ok: false, error: 'Предмет уже на выводе' });
      const wd = { id: 'wd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), telegram_id: user.id, username: user.username || '', item_id, item_name: getItem(item_id)?.name || '', item_price: getItem(item_id)?.price || 0, roblox_name, time_slot, comment: comment || '', status: 'pending', created_at: new Date().toISOString() };
      withdraws.push(wd); saveWithdraws();
      return sendJSON(res, 200, { ok: true, withdraw: wd });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/withdraws')) {
      const url = new URL(req.url, 'http://localhost'); const admin = url.searchParams.get('admin') || '';
      if (!isAdmin(admin)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      return sendJSON(res, 200, { ok: true, withdraws });
    }
    if (req.method === 'POST' && req.url === '/api/withdraw/status') {
      const body = await readBody(req);
      const { id, status, admin } = body;
      if (!isAdmin(admin)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      if (!id || !['accepted', 'rejected'].includes(status)) return sendJSON(res, 400, { ok: false, error: 'Неверные данные' });
      const wd = withdraws.find(w => w.id === id); if (!wd) return sendJSON(res, 404, { ok: false, error: 'Заявка не найдена' });
      if (wd.status !== 'pending') return sendJSON(res, 409, { ok: false, error: 'Уже обработана' });
      wd.status = status; wd.processed_at = new Date().toISOString(); wd.processed_by = admin || 'admin';
      const u = ensureUser(wd.telegram_id, wd.username);
      if (status === 'accepted') { const i = u.inventory.indexOf(wd.item_id); if (i !== -1) u.inventory.splice(i, 1); u.updated_at = new Date().toISOString(); saveUsers(); }
      saveWithdraws();
      return sendJSON(res, 200, { ok: true, withdraw: wd });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/user/')) {
      const id = decodeURIComponent(req.url.slice('/api/user/'.length));
      updateOnline(id);
      const u = ensureUser(id); saveUsers();
      return sendJSON(res, 200, { ok: true, user: publicUser(u, id) });
    }
    if (req.method === 'POST' && req.url === '/api/user/update') {
      const body = await readBody(req);
      const user = getTelegramUser(req, body); if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const { custom_nick, avatar, balance } = body;
      const u = ensureUser(user.id, user.username);
      if (typeof custom_nick === 'string') u.custom_nick = custom_nick.slice(0, 20);
      if (typeof avatar === 'string') u.avatar = avatar;
      // 👇 Сохранение баланса с клиента (после мини-игр и т.п.)
      if (typeof balance === 'number' && isFinite(balance) && balance >= 0) {
        u.balance = balance;
      }
      u.updated_at = new Date().toISOString(); saveUsers();
      return sendJSON(res, 200, { ok: true, user: publicUser(u, user.id) });
    }

    sendJSON(res, 404, { ok: false, error: 'Метод не найден' });
  } catch (err) { console.error(err); sendJSON(res, 500, { ok: false, error: 'Server Error' }); }
});

loadAll();

// Одноразовая миграция: тем пользователям, у которых вообще нет поля balance, ставим START_BALANCE.
// Если поле balance уже есть — НЕ трогаем (это и ломало ранее синхронизацию).
(function migrateBalances() {
  let changed = 0;
  for (const id in users) {
    if (typeof users[id].balance !== 'number') {
      users[id].balance = START_BALANCE;
      changed++;
    }
  }
  if (changed > 0) {
    saveUsers();
    console.log('[MIGRATE] Установлен стартовый баланс ' + START_BALANCE + ' для ' + changed + ' пользователей без поля balance');
  }
})();

server.listen(PORT, () => console.log('Brainrot Game server started on port ' + PORT));
