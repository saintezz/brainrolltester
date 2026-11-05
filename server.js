const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// [FIX #6] BOT_TOKEN обязателен — без него сервер не стартует
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('[FATAL] Переменная окружения BOT_TOKEN не задана. Сервер остановлен.');
  process.exit(1);
}

const PROMO_FILE = path.join(DATA_DIR, 'promocodes.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');
const WITHDRAWS_FILE = path.join(DATA_DIR, 'withdraws.json');
const MAINTENANCE_FILE = path.join(DATA_DIR, 'maintenance.json');
const ANNOUNCEMENT_FILE = path.join(DATA_DIR, 'announcement.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const BANS_FILE = path.join(DATA_DIR, 'bans.json');

const ADMIN_USERNAMES = ['saintezz7', 'vortyn1'];
const START_BALANCE = 500;

// [FIX #25] Лимит тела запроса
const MAX_BODY_SIZE = 1024 * 1024; // 1 MB
// [FIX #7] Максимальный возраст initData (24 часа)
const INIT_DATA_MAX_AGE_SEC = 86400;
// [FIX #11] Rate-limit
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 20; // запросов в секунду на пользователя/ip
// [FIX #45] TTL для игр Mines (10 минут)
const MINES_TTL_MS = 10 * 60 * 1000;

const ITEMS = Object.freeze({
  lagrande: { name: 'La Grande Combination', price: 4 },
  nuclearo: { name: 'Nuclearo Dinausauro', price: 12 },
  witchbroom: { name: 'Witch Broom', price: 29 },
  cupid: { name: 'Cupid Wings', price: 34 },
  cashorcard: { name: 'Cash or Card', price: 34 },
  garama: { name: 'Garama and Madundung', price: 41 },
  waverider: { name: 'Waverider', price: 41 },
  burguro: { name: 'Burguro and Fryuro', price: 70 },
  sammyni: { name: 'Sammyni Fattini', price: 70 },
  popcuru: { name: 'Popcuru and Fizzuru', price: 87 },
  celestial: { name: 'Celestial Pegasus', price: 93 },
  lafoodcombinasion: { name: 'La Food Combinasion', price: 103 },
  fragrama: { name: 'Fragrama and Chocrama', price: 129 },
  cooki: { name: 'Cooki and Milki', price: 130 },
  jolly: { name: 'Jolly Jolly Sahur', price: 132 },
  cerberus: { name: 'Cerberus', price: 155 },
  globba: { name: 'Globba Steppa', price: 164 },
  reinito: { name: 'Reinito Sleighto', price: 170 },
  dugdugdug: { name: 'Dug Dug Dug', price: 201 },
  losamigos: { name: 'Los Amigos', price: 220 },
  cloverat: { name: 'Cloverat Clapat', price: 245 },
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
  grabitron: { name: 'Grabatron', price: 1125 },
  hydra: { name: 'Hydra Dragon Cannelloni', price: 1220 },
  tirilikalika: { name: 'Tirilikalika Tirilikalaka', price: 1255 },
  moby: { name: 'Moby Bros', price: 1600 },
  // [FIX #48] исправлен ID: gingergeart
  gingergeart: { name: 'Ginger Gerat', price: 1920 },
  kraken: { name: 'Kraken', price: 2030 },
  lasupreme: { name: 'La Supreme Combination', price: 2203 },
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
});

const CASE_ONLY_ITEMS = Object.freeze({
  cyberskibidi: { name: 'Cyber Skibidi Toilet', price: 31000 },
  yinyangmeowl: { name: 'YinYang Meowl', price: 35000 },
  goldstrawberry: { name: 'Gold Strawberry Elephant', price: 45000 },
  lavastrawberry: { name: 'Lava Strawberry Elephant', price: 56000 }
});

// [FIX #28] school case — сумма 100
const CASES = Object.freeze({
  witch: { name: 'Witch Case', price: 10, rewards: [{ id: 'lagrande', chance: 76 }, { id: 'nuclearo', chance: 22 }, { id: 'cupid', chance: 1.5 }, { id: 'garama', chance: 0.3 }, { id: 'burguro', chance: 0.2 }, { id: 'popcuru', chance: 0.1 }] },
  fruits: { name: 'Fruits Case', price: 19, rewards: [{ id: 'lagrande', chance: 30 }, { id: 'nuclearo', chance: 50 }, { id: 'cupid', chance: 15 }, { id: 'waverider', chance: 5 }] },
  garama: { name: 'Garama Case', price: 29, rewards: [{ id: 'nuclearo', chance: 40 }, { id: 'cupid', chance: 40 }, { id: 'garama', chance: 15 }, { id: 'burguro', chance: 5 }] },
  yeti: { name: 'Yeti Case', price: 40, rewards: [{ id: 'nuclearo', chance: 50 }, { id: 'cupid', chance: 40 }, { id: 'burguro', chance: 9.99 }, { id: 'polaroidini', chance: 0.01 }] },
  school: { name: 'School Case', price: 59, rewards: [{ id: 'witchbroom', chance: 70 }, { id: 'garama', chance: 20 }, { id: 'lafoodcombinasion', chance: 5 }, { id: 'cerberus', chance: 4 }, { id: 'losadmins', chance: 1 }] },
  arcadragon: { name: 'Arcadragon Case', price: 200, rewards: [{ id: 'cerberus', chance: 60 }, { id: 'globba', chance: 20 }, { id: 'dugdugdug', chance: 10 }, { id: 'guest666', chance: 5 }, { id: 'rubiko', chance: 4 }, { id: 'dragon', chance: 1 }] },
  vampire: { name: 'Vampire Case', price: 299, rewards: [{ id: 'dugdugdug', chance: 50 }, { id: 'losamigos', chance: 30 }, { id: 'losadmins', chance: 12 }, { id: 'ricodinero', chance: 8 }] },
  tacos: { name: 'Tacos Case', price: 340, rewards: [{ id: 'guest666', chance: 77 }, { id: 'losadmins', chance: 13 }, { id: 'rubiko', chance: 10 }] },
  dragon: { name: 'Dragon Case', price: 3900, rewards: [{ id: 'kraken', chance: 70 }, { id: 'digi', chance: 15 }, { id: 'kalikabros', chance: 10 }, { id: 'dragonaquanini', chance: 4.9 }, { id: 'meowl', chance: 0.1 }] },
  strawberry: { name: 'Strawberry Case', price: 8900, rewards: [{ id: 'griffin', chance: 70 }, { id: 'elefantofrigo', chance: 20 }, { id: 'skibidi', chance: 5 }, { id: 'meowl', chance: 5 }] },
  griffin: { name: 'Griffin Case', price: 17000, rewards: [{ id: 'skibidi', chance: 50 }, { id: 'johnpork', chance: 30 }, { id: 'meowl', chance: 17 }, { id: 'strawberryelephant', chance: 3 }] }
});

const MAX_CHANCE = 80;
const MIN_CHANCE = 0.01;

const activeMinesGames = {};

let promocodes = {};
let users = {};
let deposits = [];
let withdraws = [];
let maintenance = { enabled: false, since: null, by: '' };
let currentAnnouncement = null;
let stats = { total_upgrades: 0, total_cases: 0 };
let onlineUsers = new Map();
let pendingBans = {};

// [FIX #11] rate-limit map
const rateBuckets = new Map();

function ensureDataDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {} }
function loadJSON(file, fallback) { try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { console.error('[ERROR] Load', file, err.message); } return fallback; }
function saveJSON(file, data) { try { ensureDataDir(); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); return true; } catch (err) { console.error('[ERROR] Save', file, err.message); return false; } }

function loadAll() {
  promocodes = loadJSON(PROMO_FILE, {});
  users = loadJSON(USERS_FILE, {});
  deposits = loadJSON(DEPOSITS_FILE, []);
  withdraws = loadJSON(WITHDRAWS_FILE, []);
  maintenance = loadJSON(MAINTENANCE_FILE, { enabled: false, since: null, by: '' });
  currentAnnouncement = loadJSON(ANNOUNCEMENT_FILE, null);
  stats = loadJSON(STATS_FILE, { total_upgrades: 0, total_cases: 0 });
  pendingBans = loadJSON(BANS_FILE, {});
}
function savePromos() { saveJSON(PROMO_FILE, promocodes); }
function saveUsers() { saveJSON(USERS_FILE, users); }
function saveDeposits() { saveJSON(DEPOSITS_FILE, deposits); }
function saveWithdraws() { saveJSON(WITHDRAWS_FILE, withdraws); }
function saveMaintenance() { saveJSON(MAINTENANCE_FILE, maintenance); }
function saveAnnouncement() { saveJSON(ANNOUNCEMENT_FILE, currentAnnouncement); }
function saveStats() { saveJSON(STATS_FILE, stats); }
function saveBans() { saveJSON(BANS_FILE, pendingBans); }

// [FIX #8] Защита от __proto__/constructor через hasOwnProperty
function getItem(id) {
  if (typeof id !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(ITEMS, id)) return ITEMS[id];
  if (Object.prototype.hasOwnProperty.call(CASE_ONLY_ITEMS, id)) return CASE_ONLY_ITEMS[id];
  return null;
}
function getCase(id) {
  if (typeof id !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(CASES, id)) return CASES[id];
  return null;
}

// [FIX #12] Криптостойкий RNG
function secureRandom() {
  return crypto.randomInt(0, 1000000) / 1000000;
}
function secureRandomInt(min, max) { return crypto.randomInt(min, max); }

function calcUpgradeChance(sourcePrice, targetPrice) {
  if (!sourcePrice || !targetPrice || targetPrice <= sourcePrice) return 0;
  let pct = MAX_CHANCE / (targetPrice / sourcePrice);
  return Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, pct));
}

function updateOnline(telegramId) {
  if (!telegramId) return;
  onlineUsers.set(String(telegramId), Date.now());
}
function getOnlineCount() {
  const now = Date.now();
  let count = 0;
  for (const [id, time] of onlineUsers) {
    if (now - time < 60000) count++;
    else onlineUsers.delete(id);
  }
  return count;
}

function setCORS(res) {
  // [FIX #16] Ограничиваем CORS — разрешаем только Telegram WebApp и локальную разработку
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
  // [FIX #55] Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
function sendJSON(res, status, data) {
  setCORS(res);
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// [FIX #25] readBody с лимитом
function readBody(req) {
  if (req.__body !== undefined) return Promise.resolve(req.__body);
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let aborted = false;
    req.on('data', (c) => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_SIZE) {
        aborted = true;
        reject(new Error('BODY_TOO_LARGE'));
        req.destroy();
        return;
      }
      body += c.toString();
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        const parsed = body ? JSON.parse(body) : {};
        req.__body = parsed;
        resolve(parsed);
      } catch (e) { reject(new Error('Неверный JSON')); }
    });
    req.on('error', reject);
  });
}

// [FIX #7, #6] Валидация initData: проверка hash, auth_date, timing-safe
function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== 'string') return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    // [FIX #7] timing-safe сравнение
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    // [FIX #7] проверка auth_date
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (!authDate || (Date.now() / 1000 - authDate) > INIT_DATA_MAX_AGE_SEC) return null;
    const userJson = params.get('user');
    if (!userJson) return null;
    const u = JSON.parse(userJson);
    if (!u || !u.id) return null;
    return { id: String(u.id), username: String(u.username || '') };
  } catch (e) { return null; }
}

// [FIX #1] getTelegramUser: ТОЛЬКО из валидного initData. Никакого fallback на body.
function getTelegramUser(req) {
  return validateTelegramInitData(req.headers['x-telegram-init-data']);
}

// [FIX #2] requireAdmin: админ только по валидному initData
function requireAdmin(req) {
  const u = getTelegramUser(req);
  if (!u) return null;
  if (!ADMIN_USERNAMES.includes((u.username || '').toLowerCase())) return null;
  return u;
}

// [FIX #11] rate-limit
function checkRateLimit(key) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}
// Периодическая очистка rateBuckets
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateBuckets) {
    if (now - v.start > RATE_LIMIT_WINDOW_MS * 10) rateBuckets.delete(k);
  }
}, 60000);

function normalizeTarget(target) { return String(target || '').trim().replace(/^@+/, ''); }
function findUserByTarget(target) {
  const t = normalizeTarget(target);
  if (!t) return null;
  if (Object.prototype.hasOwnProperty.call(users, t)) return { id: String(t), user: users[t] };
  const low = t.toLowerCase();
  for (const id in users) {
    if (!Object.prototype.hasOwnProperty.call(users, id)) continue;
    if (String(users[id].username || '').toLowerCase() === low) return { id: String(id), user: users[id] };
  }
  return null;
}
function isBannedUser(u) { return !!(u && u.ban && u.ban.active); }
function banInfo(u) { return { reason: (u.ban && u.ban.reason) || 'Не указана', at: (u.ban && u.ban.at) || null, by: (u.ban && u.ban.by) || '' }; }
function applyBanToUser(u, reason, admin) {
  u.ban = { active: true, reason: reason || 'Не указана', at: new Date().toISOString(), by: admin || 'admin' };
  u.unban_notice = null;
  u.updated_at = new Date().toISOString();
}
function applyPendingBan(userId, u) {
  if (!u) return false;
  const un = String(u.username || '').toLowerCase();
  if (!un || !pendingBans[un]) return false;
  const p = pendingBans[un];
  applyBanToUser(u, p.reason || 'Не указана', p.by || 'admin');
  delete pendingBans[un];
  saveBans();
  saveUsers();
  return true;
}
function ensureUser(telegramId, username) {
  if (!telegramId) telegramId = 'guest_' + Date.now();
  if (!users[telegramId]) {
    users[telegramId] = {
      balance: START_BALANCE,
      inventory: [],
      username: username || '',
      roblox_name: '',
      custom_nick: '',
      avatar: '',
      accent: '',
      promos_used: [],
      ban: null,
      unban_notice: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } else if (username && users[telegramId].username !== username) {
    users[telegramId].username = username;
    users[telegramId].updated_at = new Date().toISOString();
  }
  const u = users[telegramId];
  if (!Array.isArray(u.promos_used)) u.promos_used = [];
  if (!Array.isArray(u.inventory)) u.inventory = [];
  // [FIX #8] защита от NaN баланса
  if (typeof u.balance !== 'number' || !isFinite(u.balance)) u.balance = 0;
  applyPendingBan(telegramId, u);
  return u;
}
function isAdmin(username) { return ADMIN_USERNAMES.includes((username || '').toLowerCase()); }

// [FIX #4, #14] — предмет на выводе блокируется через withdraws (pending), а также через u.locked_items
function computePendingWithdrawIds(telegramId) {
  const s = new Set();
  for (const w of withdraws) {
    if (w.status === 'pending' && String(w.telegram_id) === String(telegramId)) s.add(w.item_id);
  }
  return [...s];
}
function computePendingWithdrawDetails(telegramId) {
  const map = {};
  for (const w of withdraws) {
    if (w.status === 'pending' && String(w.telegram_id) === String(telegramId)) {
      map[w.item_id] = { time: w.time_slot, ts: w.created_at };
    }
  }
  return map;
}
function publicUser(u, telegramId) {
  const banned = isBannedUser(u);
  return {
    balance: (typeof u.balance === 'number' && isFinite(u.balance)) ? u.balance : 0,
    inventory: Array.isArray(u.inventory) ? u.inventory : [],
    username: u.username || '',
    custom_nick: u.custom_nick || '',
    avatar: u.avatar || '',
    pending_withdraw_ids: computePendingWithdrawIds(telegramId),
    pending_withdraw_details: computePendingWithdrawDetails(telegramId),
    banned,
    ban: banned ? banInfo(u) : null,
    unban_notice: (u.unban_notice && !u.unban_notice.seen) ? { reason: u.unban_notice.reason || 'Решение администрации', at: u.unban_notice.at || null } : null
  };
}
function denyIfBanned(res, u) {
  if (isBannedUser(u)) {
    sendJSON(res, 403, { ok: false, error: 'BANNED', message: 'Вы заблокированы по решению администрации', ban: banInfo(u) });
    return true;
  }
  return false;
}
function listActiveBans() {
  const list = [];
  for (const id in users) {
    if (!Object.prototype.hasOwnProperty.call(users, id)) continue;
    const u = users[id];
    if (isBannedUser(u)) list.push({ id, username: u.username || '', reason: u.ban.reason || 'Не указана', at: u.ban.at || null, by: u.ban.by || '', pending: false });
  }
  for (const name in pendingBans) {
    if (!Object.prototype.hasOwnProperty.call(pendingBans, name)) continue;
    const p = pendingBans[name];
    list.push({ id: null, username: name, reason: p.reason || 'Не указана', at: p.at || null, by: p.by || '', pending: true });
  }
  list.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  return list;
}

// [FIX #45] Автоочистка зависших Mines-игр
setInterval(() => {
  const now = Date.now();
  for (const uid in activeMinesGames) {
    const g = activeMinesGames[uid];
    if (g && now - g.started_at > MINES_TTL_MS) {
      // возвращаем ставку в виде баланса
      const u = users[uid];
      if (u && g.total_bet_value > 0) {
        u.balance += g.total_bet_value;
        u.updated_at = new Date().toISOString();
        saveUsers();
      }
      delete activeMinesGames[uid];
    }
  }
}, 60000);

// [FIX #11] rate-limit helper для пользователя
function rateKeyForUser(user, ip) {
  if (user && user.id) return 'u:' + user.id;
  return 'ip:' + (ip || 'unknown');
}

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
      try { await readBody(req); }
      catch (e) {
        if (e.message === 'BODY_TOO_LARGE') return sendJSON(res, 413, { ok: false, error: 'Слишком большой запрос' });
        req.__body = {};
      }
    }

    const reqUrl = new URL(req.url, 'http://localhost');

    // [FIX #11] Глобальный rate-limit (по IP, если не удалось определить юзера)
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const preUser = getTelegramUser(req);
    if (!checkRateLimit(rateKeyForUser(preUser, ip))) {
      return sendJSON(res, 429, { ok: false, error: 'Слишком много запросов, подожди немного' });
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
        (req.method === 'GET' && req.url.startsWith('/api/admin/bans')) ||
        (req.method === 'POST' && req.url === '/api/admin/maintenance');

      if (!allowed) {
        // [FIX #2] Только админ по валидному initData может обходить техперерыв
        const adminUser = requireAdmin(req);
        if (!adminUser) {
          return sendJSON(res, 503, { ok: false, error: 'MAINTENANCE', message: 'Технический перерыв' });
        }
      }
    }

    if (req.method === 'GET' && req.url === '/api/maintenance') {
      return sendJSON(res, 200, { ok: true, maintenance });
    }
    if (req.method === 'POST' && req.url === '/api/admin/maintenance') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const body = req.__body || {};
      const { enabled } = body;
      maintenance = { enabled: !!enabled, since: enabled ? new Date().toISOString() : null, by: enabled ? adminUser.username : '' };
      saveMaintenance();
      return sendJSON(res, 200, { ok: true, maintenance });
    }

    if (req.method === 'POST' && req.url === '/api/admin/announce') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      if (currentAnnouncement && (Date.now() - currentAnnouncement.timestamp <= 10000)) {
        return sendJSON(res, 429, { ok: false, error: 'Подождите, пока текущий анонс не закончится' });
      }
      const body = req.__body || {};
      const text = String(body.text || '').trim().slice(0, 100);
      if (!text) return sendJSON(res, 400, { ok: false, error: 'Текст не может быть пустым' });
      currentAnnouncement = { text, timestamp: Date.now(), by: adminUser.username, username: adminUser.username };
      saveAnnouncement();
      return sendJSON(res, 200, { ok: true, announcement: currentAnnouncement });
    }

    if (req.method === 'POST' && req.url === '/api/admin/ban') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const body = req.__body || {};
      const target = normalizeTarget(body.target);
      const reason = String(body.reason || '').trim().slice(0, 120) || 'Не указана';
      if (!target) return sendJSON(res, 400, { ok: false, error: 'Введите юзера в тг' });
      const admin = (adminUser.username || '').toLowerCase();
      const found = findUserByTarget(target);
      if (found) {
        if ((found.user.username || '').toLowerCase() === admin) return sendJSON(res, 400, { ok: false, error: 'Нельзя забанить самого себя' });
        applyBanToUser(found.user, reason, adminUser.username);
        saveUsers();
        return sendJSON(res, 200, { ok: true, banned: true, reason, user: { id: found.id, username: found.user.username || target } });
      }
      if (/^\d+$/.test(target)) return sendJSON(res, 404, { ok: false, error: 'Юзер с таким ID не найден' });
      const low = target.toLowerCase();
      if (!/^[a-z0-9_]{2,64}$/i.test(low)) return sendJSON(res, 400, { ok: false, error: 'Неверный юзернейм' });
      // [FIX #23] Ограничиваем размер pendingBans
      if (Object.keys(pendingBans).length >= 1000) {
        // удаляем самый старый
        let oldestKey = null, oldestAt = Infinity;
        for (const k in pendingBans) {
          const at = new Date(pendingBans[k].at || 0).getTime();
          if (at < oldestAt) { oldestAt = at; oldestKey = k; }
        }
        if (oldestKey) delete pendingBans[oldestKey];
      }
      pendingBans[low] = { reason, at: new Date().toISOString(), by: adminUser.username };
      saveBans();
      return sendJSON(res, 200, { ok: true, banned: true, pending: true, reason, user: { id: null, username: low } });
    }
    if (req.method === 'POST' && req.url === '/api/admin/unban') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const body = req.__body || {};
      const target = normalizeTarget(body.target);
      const reason = String(body.reason || '').trim().slice(0, 120);
      if (!target) return sendJSON(res, 400, { ok: false, error: 'Введите юзера в тг' });
      const admin = (adminUser.username || '').toLowerCase();
      const found = findUserByTarget(target);
      if (found) {
        const u = found.user;
        if (!isBannedUser(u)) return sendJSON(res, 400, { ok: false, error: 'Этот юзер не забанен' });
        const finalReason = reason || u.ban.reason || 'Решение администрации';
        u.ban = { active: false, reason: u.ban.reason || 'Не указана', at: u.ban.at || null, by: u.ban.by || '', unbanned_at: new Date().toISOString(), unbanned_by: adminUser.username, unban_reason: finalReason };
        u.unban_notice = { reason: finalReason, at: new Date().toISOString(), by: adminUser.username, seen: false };
        u.updated_at = new Date().toISOString();
        saveUsers();
        return sendJSON(res, 200, { ok: true, unbanned: true, reason: finalReason, user: { id: found.id, username: u.username || target } });
      }
      const low = target.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(pendingBans, low)) {
        const finalReason = reason || pendingBans[low].reason || 'Решение администрации';
        delete pendingBans[low];
        saveBans();
        return sendJSON(res, 200, { ok: true, unbanned: true, pending: true, reason: finalReason, user: { id: null, username: low } });
      }
      return sendJSON(res, 404, { ok: false, error: 'Юзер не найден' });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/admin/bans')) {
      // [FIX #2] админ только по initData
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      return sendJSON(res, 200, { ok: true, bans: listActiveBans() });
    }

    // [FIX #2] Создание промокодов — только админ
    if (req.method === 'POST' && req.url === '/api/create') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const body = req.__body || {};
      const { code, uses, type, value } = body;
      if (!code || String(code).trim().length < 3) return sendJSON(res, 400, { ok: false, error: 'Название минимум 3 символа' });
      const upperCode = String(code).trim().toUpperCase().slice(0, 20);
      if (Object.prototype.hasOwnProperty.call(promocodes, upperCode)) return sendJSON(res, 409, { ok: false, error: 'Промокод уже есть' });
      const parsedUses = parseInt(uses, 10);
      if (!parsedUses || parsedUses < 1 || parsedUses > 100000) return sendJSON(res, 400, { ok: false, error: 'Некорректное число активаций' });
      let storedValue;
      if (type === 'balance') {
        storedValue = parseInt(value, 10);
        if (!storedValue || storedValue < 1 || storedValue > 10000000) return sendJSON(res, 400, { ok: false, error: 'Некорректная сумма' });
      } else if (type === 'item') {
        if (!getItem(value)) return sendJSON(res, 400, { ok: false, error: 'Неизвестный предмет' });
        storedValue = value;
      } else {
        return sendJSON(res, 400, { ok: false, error: 'Неизвестный тип награды' });
      }
      promocodes[upperCode] = { code: upperCode, uses: parsedUses, type, value: storedValue, createdAt: new Date().toISOString() };
      savePromos();
      return sendJSON(res, 200, { ok: true, promo: promocodes[upperCode] });
    }
    if (req.method === 'POST' && req.url === '/api/activate') {
      // [FIX #1] пользователь только из initData
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      const body = req.__body || {};
      const { code } = body;
      if (!code) return sendJSON(res, 400, { ok: false, error: 'Введите промокод' });
      const upperCode = String(code).trim().toUpperCase().slice(0, 20);
      if (!Array.isArray(u.promos_used)) u.promos_used = [];
      if (u.promos_used.includes(upperCode)) return sendJSON(res, 409, { ok: false, error: 'Вы уже активировали этот промокод. Один человек — одна активация.' });
      if (!Object.prototype.hasOwnProperty.call(promocodes, upperCode)) return sendJSON(res, 404, { ok: false, error: 'Промокод не найден' });
      const promo = promocodes[upperCode];
      if (promo.uses <= 0) return sendJSON(res, 410, { ok: false, error: 'Промокод больше не активен' });
      promo.uses -= 1;
      u.promos_used.push(upperCode);
      if (promo.type === 'balance') {
        u.balance = (typeof u.balance === 'number' && isFinite(u.balance) ? u.balance : 0) + promo.value;
      } else if (promo.type === 'item') {
        if (!Array.isArray(u.inventory)) u.inventory = [];
        u.inventory.push(promo.value);
      }
      u.updated_at = new Date().toISOString();
      savePromos();
      saveUsers();
      return sendJSON(res, 200, { ok: true, type: promo.type, value: promo.value, remaining: promo.uses });
    }
    // [FIX #16] промокоды — только админ
    if (req.method === 'GET' && req.url === '/api/promocodes') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      return sendJSON(res, 200, { ok: true, promocodes });
    }

    if (req.method === 'POST' && req.url === '/api/case/open') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const body = req.__body || {};
      const { case_id, qty } = body;
      const c = getCase(case_id);
      if (!c) return sendJSON(res, 404, { ok: false, error: 'Кейс не найден' });
      const quantity = Math.max(1, Math.min(5, parseInt(qty, 10) || 1));
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      const totalCost = c.price * quantity;
      if (!isFinite(u.balance) || u.balance < totalCost) return sendJSON(res, 400, { ok: false, error: 'Недостаточно монет' });
      u.balance -= totalCost;
      const wonItems = [];
      for (let i = 0; i < quantity; i++) {
        // [FIX #12] крипто-RNG
        const rng = secureRandom() * 100;
        let acc = 0;
        let wonId = c.rewards[0].id;
        for (const r of c.rewards) {
          acc += r.chance;
          if (rng <= acc) { wonId = r.id; break; }
        }
        u.inventory.push(wonId);
        wonItems.push(wonId);
      }
      u.updated_at = new Date().toISOString();
      saveUsers();
      stats.total_cases += quantity;
      saveStats();
      return sendJSON(res, 200, { ok: true, won: wonItems, new_balance: u.balance, inventory: u.inventory });
    }

    if (req.method === 'POST' && req.url === '/api/upgrade') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const body = req.__body || {};
      const { source_item_id, target_item_id } = body;
      const src = getItem(source_item_id);
      const tgt = getItem(target_item_id);
      if (!src || !tgt) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      if (tgt.price <= src.price) return sendJSON(res, 400, { ok: false, error: 'Цель должна быть дороже' });
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      const idx = u.inventory.indexOf(source_item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Исходный предмет не найден' });
      if (computePendingWithdrawIds(user.id).includes(source_item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });
      u.inventory.splice(idx, 1);
      const chance = calcUpgradeChance(src.price, tgt.price);
      // [FIX #12] крипто-RNG
      const success = secureRandom() * 100 <= chance;
      if (success) u.inventory.push(target_item_id);
      u.updated_at = new Date().toISOString();
      saveUsers();
      stats.total_upgrades += 1;
      saveStats();
      return sendJSON(res, 200, { ok: true, success, chance, won_item: success ? target_item_id : null, new_balance: u.balance, inventory: u.inventory });
    }

    if (req.method === 'POST' && req.url === '/api/shop/buy') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const body = req.__body || {};
      const { item_id } = body;
      const item = getItem(item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      if (!isFinite(u.balance) || u.balance < item.price) return sendJSON(res, 400, { ok: false, error: 'Недостаточно монет' });
      u.balance -= item.price;
      u.inventory.push(item_id);
      u.updated_at = new Date().toISOString();
      saveUsers();
      return sendJSON(res, 200, { ok: true, new_balance: u.balance, inventory: u.inventory });
    }
    if (req.method === 'POST' && req.url === '/api/shop/sell') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const body = req.__body || {};
      const { item_id } = body;
      const item = getItem(item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      const idx = u.inventory.indexOf(item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Предмета нет в инвентаре' });
      // [FIX #4] нельзя продать предмет на выводе
      if (computePendingWithdrawIds(user.id).includes(item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });
      u.inventory.splice(idx, 1);
      u.balance += item.price;
      u.updated_at = new Date().toISOString();
      saveUsers();
      return sendJSON(res, 200, { ok: true, new_balance: u.balance, inventory: u.inventory });
    }

    if (req.method === 'POST' && req.url === '/api/mines/start') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const body = req.__body || {};
      const { item_ids, mines_count } = body;
      if (!Array.isArray(item_ids) || item_ids.length === 0 || item_ids.length > 5) return sendJSON(res, 400, { ok: false, error: 'Выберите от 1 до 5 предметов' });
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      // [FIX #45] нельзя начать новую игру, если уже есть активная
      if (activeMinesGames[user.id]) return sendJSON(res, 400, { ok: false, error: 'Сначала завершите текущую игру' });

      const pendingW = computePendingWithdrawIds(user.id);
      let totalBetValue = 0;
      for (const id of item_ids) {
        const it = getItem(id);
        if (!it) return sendJSON(res, 400, { ok: false, error: 'Неизвестный предмет' });
        if (!u.inventory.includes(id)) return sendJSON(res, 400, { ok: false, error: 'Предмет не найден в инвентаре' });
        if (pendingW.includes(id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });
        totalBetValue += it.price;
      }
      if (totalBetValue <= 0) return sendJSON(res, 400, { ok: false, error: 'Ставка слишком мала' });

      item_ids.forEach(id => {
        const idx = u.inventory.indexOf(id);
        if (idx !== -1) u.inventory.splice(idx, 1);
      });

      const safeMinesCount = Math.min(24, Math.max(1, parseInt(mines_count, 10) || 2));
      const minesPositions = new Set();
      while (minesPositions.size < safeMinesCount) {
        minesPositions.add(secureRandomInt(0, 25));
      }

      activeMinesGames[user.id] = {
        bet_items: item_ids.slice(),
        total_bet_value: totalBetValue,
        mines_count: minesPositions.size,
        mines_positions: [...minesPositions],
        opened: [],
        started_at: Date.now()
      };

      u.updated_at = new Date().toISOString();
      saveUsers();
      return sendJSON(res, 200, { ok: true, inventory: u.inventory, mines_count: minesPositions.size, total_bet_value: totalBetValue });
    }

    if (req.method === 'POST' && req.url === '/api/mines/open') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const body = req.__body || {};
      const { cell_index } = body;
      // [FIX #43] валидация cell_index
      if (!Number.isInteger(cell_index) || cell_index < 0 || cell_index > 24) return sendJSON(res, 400, { ok: false, error: 'Некорректная ячейка' });
      const game = activeMinesGames[user.id];
      if (!game) return sendJSON(res, 400, { ok: false, error: 'Игра не найдена' });
      if (game.opened.includes(cell_index)) return sendJSON(res, 400, { ok: false, error: 'Ячейка уже открыта' });

      const isBomb = game.mines_positions.includes(cell_index);
      game.opened.push(cell_index);

      if (isBomb) {
        delete activeMinesGames[user.id];
        return sendJSON(res, 200, {
          ok: true,
          is_bomb: true,
          win_amount: 0,
          opened: game.opened,
          inventory: users[user.id].inventory,
          new_balance: users[user.id].balance
        });
      } else {
        const totalSafe = 25 - game.mines_count;
        if (game.opened.length === totalSafe) {
          const mult = minesMultiplier(game.mines_count);
          const winAmount = Math.floor(game.total_bet_value * mult);
          const u = users[user.id];
          u.balance = (typeof u.balance === 'number' && isFinite(u.balance) ? u.balance : 0) + winAmount;
          saveUsers();
          delete activeMinesGames[user.id];
          return sendJSON(res, 200, {
            ok: true,
            is_bomb: false,
            win_amount: winAmount,
            opened: game.opened,
            inventory: u.inventory,
            new_balance: u.balance
          });
        }
        return sendJSON(res, 200, { ok: true, is_bomb: false, opened: game.opened });
      }
    }

    if (req.method === 'POST' && req.url === '/api/mines/cashout') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const game = activeMinesGames[user.id];
      if (!game) return sendJSON(res, 400, { ok: false, error: 'Игра не найдена' });
      if (game.opened.length === 0) return sendJSON(res, 400, { ok: false, error: 'Открой хотя бы одну ячейку' });

      const mult = minesMultiplier(game.mines_count);
      const winAmount = Math.floor(game.total_bet_value * mult);
      const u = users[user.id];
      u.balance = (typeof u.balance === 'number' && isFinite(u.balance) ? u.balance : 0) + winAmount;
      saveUsers();
      delete activeMinesGames[user.id];
      return sendJSON(res, 200, { ok: true, win_amount: winAmount, new_balance: u.balance, inventory: u.inventory });
    }

    // [FIX #3] Депозит: проверяем наличие предмета и СРАЗУ его списываем
    if (req.method === 'POST' && req.url === '/api/deposit/create') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const body = req.__body || {};
      const { item_id } = body;
      const roblox_name = String(body.roblox_name || '').trim().slice(0, 40);
      if (!item_id || !roblox_name) return sendJSON(res, 400, { ok: false, error: 'Не хватает данных' });
      const item = getItem(item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      const idx = u.inventory.indexOf(item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Предмета нет в инвентаре' });
      if (computePendingWithdrawIds(user.id).includes(item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });
      // Списываем предмет сразу
      u.inventory.splice(idx, 1);
      u.updated_at = new Date().toISOString();
      saveUsers();
      const dep = {
        id: 'dep_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
        telegram_id: user.id,
        username: user.username || '',
        item_id,
        item_name: item.name,
        item_price: item.price,
        base_price: item.price,
        roblox_name,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      deposits.push(dep);
      saveDeposits();
      return sendJSON(res, 200, { ok: true, deposit: dep, new_balance: u.balance, inventory: u.inventory });
    }
    // [FIX #17] только админ по initData
    if (req.method === 'GET' && req.url.startsWith('/api/deposits')) {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      return sendJSON(res, 200, { ok: true, deposits });
    }
    if (req.method === 'POST' && req.url === '/api/deposit/status') {
      // [FIX #2] админ только по initData
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const body = req.__body || {};
      const { id, status } = body;
      if (!id || !['accepted', 'rejected'].includes(status)) return sendJSON(res, 400, { ok: false, error: 'Неверные данные' });
      const dep = deposits.find(d => d.id === id);
      if (!dep) return sendJSON(res, 404, { ok: false, error: 'Заявка не найдена' });
      if (dep.status !== 'pending') return sendJSON(res, 409, { ok: false, error: 'Уже обработана' });
      dep.status = status;
      dep.processed_at = new Date().toISOString();
      dep.processed_by = adminUser.username;
      // [FIX #3] при accepted — предмет уже списан при создании, поэтому просто возвращаем баланс.
      // при rejected — возвращаем предмет в инвентарь.
      const u = ensureUser(dep.telegram_id, dep.username);
      if (status === 'accepted') {
        u.balance = (typeof u.balance === 'number' && isFinite(u.balance) ? u.balance : 0) + dep.item_price;
      } else if (status === 'rejected') {
        u.inventory.push(dep.item_id);
      }
      u.updated_at = new Date().toISOString();
      saveUsers();
      saveDeposits();
      return sendJSON(res, 200, { ok: true, deposit: dep });
    }

    // [FIX #4] Вывод: предмет блокируется через withdraws (pending) — но не списываем, а помечаем
    if (req.method === 'POST' && req.url === '/api/withdraw/create') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const body = req.__body || {};
      const { item_id } = body;
      const roblox_name = String(body.roblox_name || '').trim().slice(0, 40);
      const time_slot = String(body.time_slot || '').trim().slice(0, 60);
      if (!item_id || !roblox_name || !time_slot) return sendJSON(res, 400, { ok: false, error: 'Не хватает данных' });
      // [FIX #20] валидация time_slot
      if (!/^\d{1,2}:\d{2}\s+МСК\s+\d{1,2}\s+[а-яё]+$/i.test(time_slot)) return sendJSON(res, 400, { ok: false, error: 'Неверный формат времени' });
      const item = getItem(item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      if (u.inventory.indexOf(item_id) === -1) return sendJSON(res, 400, { ok: false, error: 'Предмет не найден в инвентаре' });
      if (withdraws.some(w => w.status === 'pending' && String(w.telegram_id) === String(user.id) && w.item_id === item_id)) return sendJSON(res, 409, { ok: false, error: 'Предмет уже на выводе' });
      const wd = {
        id: 'wd_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
        telegram_id: user.id,
        username: user.username || '',
        item_id,
        item_name: item.name,
        item_price: item.price,
        roblox_name,
        time_slot,
        comment: '',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      withdraws.push(wd);
      saveWithdraws();
      return sendJSON(res, 200, { ok: true, withdraw: wd });
    }
    // [FIX #17] только админ по initData
    if (req.method === 'GET' && req.url.startsWith('/api/withdraws')) {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      return sendJSON(res, 200, { ok: true, withdraws });
    }
    if (req.method === 'POST' && req.url === '/api/withdraw/status') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const body = req.__body || {};
      const { id, status } = body;
      if (!id || !['accepted', 'rejected'].includes(status)) return sendJSON(res, 400, { ok: false, error: 'Неверные данные' });
      const wd = withdraws.find(w => w.id === id);
      if (!wd) return sendJSON(res, 404, { ok: false, error: 'Заявка не найдена' });
      if (wd.status !== 'pending') return sendJSON(res, 409, { ok: false, error: 'Уже обработана' });
      wd.status = status;
      wd.processed_at = new Date().toISOString();
      wd.processed_by = adminUser.username;
      const u = ensureUser(wd.telegram_id, wd.username);
      if (status === 'accepted') {
        // [FIX #14] если предмет уже продан/апгрейжен — заявку нельзя принять
        const i = u.inventory.indexOf(wd.item_id);
        if (i === -1) {
          wd.status = 'failed';
          saveWithdraws();
          return sendJSON(res, 409, { ok: false, error: 'Предмета уже нет в инвентаре. Заявка помечена как failed.' });
        }
        u.inventory.splice(i, 1);
        u.updated_at = new Date().toISOString();
        saveUsers();
      }
      // rejected — предмет остаётся в инвентаре, разблокировка автоматическая (status != pending)
      saveWithdraws();
      return sendJSON(res, 200, { ok: true, withdraw: wd });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/ban/status')) {
      const id = String(reqUrl.searchParams.get('telegram_id') || '');
      const uname = normalizeTarget(reqUrl.searchParams.get('username') || '');
      if (!id) return sendJSON(res, 200, { ok: true, banned: false, ban: null, unban_notice: null });
      const u = ensureUser(id, uname);
      const banned = isBannedUser(u);
      return sendJSON(res, 200, {
        ok: true,
        banned,
        ban: banned ? banInfo(u) : null,
        unban_notice: (u.unban_notice && !u.unban_notice.seen) ? { reason: u.unban_notice.reason || 'Решение администрации', at: u.unban_notice.at || null } : null
      });
    }
    if (req.method === 'POST' && req.url === '/api/unban/ack') {
      // [FIX #1] только свой unban ack
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const u = users[user.id];
      if (u && u.unban_notice) { u.unban_notice.seen = true; saveUsers(); }
      return sendJSON(res, 200, { ok: true });
    }

    // [FIX #18] /api/user/:id — только свой профиль по initData
    if (req.method === 'GET' && req.url.startsWith('/api/user/')) {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const requestedId = decodeURIComponent(reqUrl.pathname.slice('/api/user/'.length));
      if (String(requestedId) !== String(user.id)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа к чужому профилю' });
      updateOnline(user.id);
      const u = ensureUser(user.id, user.username);
      saveUsers();
      return sendJSON(res, 200, { ok: true, user: publicUser(u, user.id) });
    }
    if (req.method === 'POST' && req.url === '/api/user/update') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const body = req.__body || {};
      const { custom_nick, avatar } = body;
      const u = ensureUser(user.id, user.username);
      if (denyIfBanned(res, u)) return;
      // [FIX #21] валидация custom_nick и avatar
      if (typeof custom_nick === 'string') {
        // только безопасные символы, без HTML
        const clean = custom_nick.replace(/[<>&"']/g, '').trim().slice(0, 20);
        u.custom_nick = clean;
      }
      if (typeof avatar === 'string') {
        // разрешаем только data:image/* или http(s) URL, и не длиннее 512KB base64
        if (avatar === '') {
          u.avatar = '';
        } else if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(avatar) && avatar.length <= 700000) {
          u.avatar = avatar;
        } else if (/^https?:\/\/[^\s"'<>]+$/i.test(avatar) && avatar.length <= 2048) {
          u.avatar = avatar;
        } else {
          return sendJSON(res, 400, { ok: false, error: 'Некорректный аватар' });
        }
      }
      u.updated_at = new Date().toISOString();
      saveUsers();
      return sendJSON(res, 200, { ok: true, user: publicUser(u, user.id) });
    }

    sendJSON(res, 404, { ok: false, error: 'Метод не найден' });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { ok: false, error: 'Server Error' });
  }
});

// [FIX] helper для множителя Mines (используется и в open, и в cashout)
function minesMultiplier(minesCount) {
  if (minesCount === 2) return 1.04;
  if (minesCount === 3) return 1.13;
  if (minesCount === 5) return 1.24;
  if (minesCount === 10) return 1.37;
  if (minesCount === 24) return 24.00;
  return 1 + (minesCount * 0.05);
}

loadAll();

(function migrateBalances() {
  let changed = 0;
  for (const id in users) {
    if (!Object.prototype.hasOwnProperty.call(users, id)) continue;
    if (typeof users[id].balance !== 'number' || !isFinite(users[id].balance)) {
      users[id].balance = START_BALANCE;
      changed++;
    }
    if (!Array.isArray(users[id].inventory)) { users[id].inventory = []; changed++; }
  }
  if (changed > 0) {
    saveUsers();
    console.log('[MIGRATE] Исправлено ' + changed + ' пользователей');
  }
})();

server.listen(PORT, () => console.log('Brainrot Game server started on port ' + PORT));
