require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
if (!BOT_TOKEN) {
  console.error('[FATAL] Переменная окружения BOT_TOKEN не задана.');
  process.exit(1);
}
console.log('[INIT] BOT_TOKEN задан, длина=' + BOT_TOKEN.length + ', префикс=' + BOT_TOKEN.slice(0, 10) + '...');

// ================== ПОДКЛЮЧЕНИЕ К БД ==================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true }
});

pool.connect((err, client, release) => {
  if (err) return console.error('Ошибка подключения к базе:', err.stack);
  console.log('✅ Успешное подключение к PostgreSQL (Neon)');
  release();
});

const ADMIN_USERNAMES = ['saintezz7', 'vortyn1'];
const START_BALANCE = 500;

const MAX_BODY_SIZE = 1024 * 1024;
const INIT_DATA_MAX_AGE_SEC = 86400;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 30;
const MINES_TTL_MS = 10 * 60 * 1000;

// ★ Минимальная цена предмета для пополнения/вывода
const MIN_DEPOSIT_PRICE = 41;
const MIN_WITHDRAW_PRICE = 41;

// ================== USERNAME CASE + STAKING =================
const USERNAME_CASE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const USERNAME_TAG = 'BrainrotGGame';
const USERNAME_TAG_LOWER = USERNAME_TAG.toLowerCase();

const STAKING_TIERS = Object.freeze({
  week:    { id: 'week',    label: 'Неделя',   bonus: 10, duration_ms:  7 * 24 * 60 * 60 * 1000 },
  twoWeek: { id: 'twoWeek', label: '2 недели', bonus: 25, duration_ms: 14 * 24 * 60 * 60 * 1000 },
  month:   { id: 'month',   label: 'Месяц',    bonus: 40, duration_ms: 30 * 24 * 60 * 60 * 1000 }
});

// ================== КОНСТАНТЫ ИГРЫ =================
const ITEMS = Object.freeze({
  tangtang: { name: 'Tang Tang Keletang', price: 17 }, lostangsitos: { name: 'Los Tangsitos', price: 34 },
  worl: { name: 'W or L', price: 28 }, tictacsahur: { name: 'TicTac Sahur', price: 19 },
  lagrande: { name: 'La Grande Combination', price: 4 }, nuclearo: { name: 'Nuclearo Dinausauro', price: 12 },
  witchbroom: { name: 'Witch Broom', price: 29 }, cupid: { name: 'Cupid Wings', price: 34 },
  cashorcard: { name: 'Cash or Card', price: 34 }, garama: { name: 'Garama and Madundung', price: 41 },
  waverider: { name: 'Waverider', price: 41 }, burguro: { name: 'Burguro and Fryuro', price: 70 },
  sammyni: { name: 'Sammyni Fattini', price: 70 }, popcuru: { name: 'Popcuru and Fizzuru', price: 87 },
  celestial: { name: 'Celestial Pegasus', price: 93 }, lafoodcombinasion: { name: 'La Food Combinasion', price: 103 },
  fragrama: { name: 'Fragrama and Chocrama', price: 129 }, cooki: { name: 'Cooki and Milki', price: 130 },
  jolly: { name: 'Jolly Jolly Sahur', price: 132 }, cerberus: { name: 'Cerberus', price: 155 },
  globba: { name: 'Globba Steppa', price: 164 }, reinito: { name: 'Reinito Sleighto', price: 170 },
  dugdugdug: { name: 'Dug Dug Dug', price: 201 }, losamigos: { name: 'Los Amigos', price: 220 },
  cloverat: { name: 'Cloverat Clapat', price: 245 }, guest666: { name: 'Guest 666', price: 324 },
  losadmins: { name: 'Los Admins', price: 370 }, rubiko: { name: 'Rubiko and Kubiko', price: 395 },
  lossecret: { name: 'Los Secret Combinasionas', price: 419 }, ricodinero: { name: 'Rico Dinero', price: 430 },
  foxinilanternini: { name: 'Foxini Lanternini', price: 480 }, roseyandteddy: { name: 'Rosey and Teddy', price: 501 },
  lacasaboo: { name: 'La Casa Boo', price: 551 }, ketupas: { name: 'Ketupas Bros', price: 641 },
  skelly: { name: 'Skelly and Coffy', price: 866 }, dragon: { name: 'Dragon Cannelloni', price: 890 },
  grabitron: { name: 'Grabatron', price: 1125 }, hydra: { name: 'Hydra Dragon Cannelloni', price: 1220 },
  tirilikalika: { name: 'Tirilikalika Tirilikalaka', price: 1255 }, moby: { name: 'Moby Bros', price: 1600 },
  gingergeart: { name: 'Ginger Gerat', price: 1920 }, kraken: { name: 'Kraken', price: 2030 },
  lasupreme: { name: 'La Supreme Combination', price: 2203 }, digi: { name: 'Digi Narwhal', price: 3492 },
  kalikabros: { name: 'Kalika Bros', price: 3490 }, dragonaquanini: { name: 'Dragon Aquanini', price: 3701 },
  lovelovebear: { name: 'Love Love Bear', price: 5540 }, antonio: { name: 'Antonio', price: 5549 },
  griffin: { name: 'Griffin', price: 6307 }, elefantofrigo: { name: 'Elefanto Frigo', price: 11232 },
  skibidi: { name: 'Skibidi Toilet', price: 13154 }, johnpork: { name: 'John Pork', price: 16054 },
  meowl: { name: 'Meowl', price: 16839 }, orchidox: { name: 'Orchidox', price: 16704 },
  signorecarapace: { name: 'Signore Carapace', price: 35000 }, polaroidini: { name: 'Polaroidini', price: 40000 },
  strawberryelephant: { name: 'Strawberry Elephant', price: 41400 }, headless: { name: 'Headless Horseman', price: 235000 }
});

const CASE_ONLY_ITEMS = Object.freeze({
  cyberskibidi: { name: 'Cyber Skibidi Toilet', price: 31000 }, yinyangmeowl: { name: 'YinYang Meowl', price: 35000 },
  goldstrawberry: { name: 'Gold Strawberry Elephant', price: 45000 }, lavastrawberry: { name: 'Lava Strawberry Elephant', price: 56000 }
});

// ★ НОВЫЕ КЕЙСЫ: orange, apple, allin
const CASES = Object.freeze({
  school: { name: 'School Case', price: 12, rewards: [{ id: 'lagrande', chance: 40 }, { id: 'nuclearo', chance: 25 }, { id: 'tangtang', chance: 15 }, { id: 'tictacsahur', chance: 10 }, { id: 'worl', chance: 5 }, { id: 'lostangsitos', chance: 4 }, { id: 'garama', chance: 0.9 }, { id: 'burguro', chance: 0.1 }] },
  orange: { name: 'Orange Case', price: 29, rewards: [
    { id: 'tangtang', chance: 55 },
    { id: 'worl', chance: 25 },
    { id: 'witchbroom', chance: 10 },
    { id: 'garama', chance: 5 },
    { id: 'sammyni', chance: 3 },
    { id: 'popcuru', chance: 2 }
  ] },
  sun: { name: 'Sun Case', price: 39, rewards: [{ id: 'tictacsahur', chance: 50 }, { id: 'worl', chance: 30 }, { id: 'garama', chance: 17 }, { id: 'burguro', chance: 2 }, { id: 'cerberus', chance: 1 }] },
  apple: { name: 'Apple Case', price: 59, rewards: [
    { id: 'witchbroom', chance: 50 },
    { id: 'garama', chance: 25 },
    { id: 'sammyni', chance: 15 },
    { id: 'burguro', chance: 10 }
  ] },
  winter: { name: 'Winter Case', price: 61, rewards: [{ id: 'lostangsitos', chance: 40 }, { id: 'garama', chance: 30 }, { id: 'burguro', chance: 10 }, { id: 'popcuru', chance: 5 }, { id: 'fragrama', chance: 4 }, { id: 'cerberus', chance: 0.5 }, { id: 'dugdugdug', chance: 0.3 }, { id: 'roseyandteddy', chance: 0.1 }, { id: 'lacasaboo', chance: 0.1 }] },
  autumn: { name: 'Autumn Case', price: 90, rewards: [{ id: 'garama', chance: 40 }, { id: 'burguro', chance: 30 }, { id: 'popcuru', chance: 20 }, { id: 'cloverat', chance: 5 }, { id: 'guest666', chance: 4 }, { id: 'lossecret', chance: 3 }, { id: 'roseyandteddy', chance: 1 }] },
  radioactive: { name: 'Radioctive Case', price: 150, rewards: [{ id: 'fragrama', chance: 60 }, { id: 'globba', chance: 30 }, { id: 'losamigos', chance: 9 }, { id: 'rubiko', chance: 0.9 }, { id: 'ketupas', chance: 0.1 }] },
  money: { name: 'Money Case', price: 201, rewards: [{ id: 'cerberus', chance: 70 }, { id: 'dugdugdug', chance: 20 }, { id: 'cloverat', chance: 9 }, { id: 'guest666', chance: 0.3 }, { id: 'ricodinero', chance: 0.3 }, { id: 'lacasaboo', chance: 0.2 }, { id: 'skelly', chance: 0.1 }] },
  spring: { name: 'Spring Case', price: 451, rewards: [{ id: 'rubiko', chance: 50 }, { id: 'ricodinero', chance: 20 }, { id: 'lacasaboo', chance: 20 }, { id: 'ketupas', chance: 8 }, { id: 'skelly', chance: 2 }] },
  allin: { name: 'ALL IN Case', price: 590, rewards: [
    { id: 'coin20', chance: 60 },
    { id: 'dragon', chance: 39.9 },
    { id: 'skibidi', chance: 0.1 }
  ] },
  summer: { name: 'Summer Case', price: 3241, rewards: [{ id: 'kraken', chance: 50 }, { id: 'lasupreme', chance: 20 }, { id: 'digi', chance: 15 }, { id: 'dragonaquanini', chance: 10 }, { id: 'antonio', chance: 4 }, { id: 'skibidi', chance: 1 }] },
  easter: { name: 'Easter Case', price: 9000, rewards: [{ id: 'antonio', chance: 50 }, { id: 'griffin', chance: 30 }, { id: 'skibidi', chance: 10 }, { id: 'johnpork', chance: 5 }, { id: 'meowl', chance: 4 }, { id: 'strawberryelephant', chance: 0.9 }, { id: 'headless', chance: 0.1 }] },
  farm: { name: 'Farm Case', price: 54000, rewards: [{ id: 'strawberryelephant', chance: 99 }, { id: 'headless', chance: 1 }] },
  username: { name: 'Username Case', price: 0, rewards: [{ id: 'coin2', chance: 50 }, { id: 'lagrande', chance: 49.9 }, { id: 'dragon', chance: 0.1 }] }
});

const COIN_REWARDS = Object.freeze({
  coin20: 20,
  coin2: 2
});

const MAX_CHANCE = 80;
const MIN_CHANCE = 0.01;
const activeMinesGames = {};

let maintenance = { enabled: false, since: null, by: '' };
let currentAnnouncement = null;
let stats = { total_upgrades: 0, total_cases: 0 };
let onlineUsers = new Map();
const rateBuckets = new Map();

// ================== ХЕЛПЕРЫ ==================
function getItem(id) {
  if (typeof id !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(ITEMS, id)) return ITEMS[id];
  if (Object.prototype.hasOwnProperty.call(CASE_ONLY_ITEMS, id)) return CASE_ONLY_ITEMS[id];
  if (Object.prototype.hasOwnProperty.call(COIN_REWARDS, id)) {
    return { name: COIN_REWARDS[id] + ' монет', price: COIN_REWARDS[id], isCoin: true };
  }
  return null;
}
function getCase(id) {
  if (typeof id !== 'string') return null;
  if (Object.prototype.hasOwnProperty.call(CASES, id)) return CASES[id];
  return null;
}
function secureRandom() { return crypto.randomInt(0, 1000000) / 1000000; }
function secureRandomInt(min, max) { return crypto.randomInt(min, max); }
function calcUpgradeChance(sourcePrice, targetPrice) {
  if (!sourcePrice || !targetPrice || targetPrice <= sourcePrice) return 0;
  let pct = MAX_CHANCE / (targetPrice / sourcePrice);
  return Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, pct));
}
function minesMultiplier(minesCount) {
  if (minesCount === 2) return 1.04; if (minesCount === 3) return 1.13;
  if (minesCount === 5) return 1.24; if (minesCount === 10) return 1.37;
  if (minesCount === 24) return 24.00; return 1 + (minesCount * 0.05);
}
function updateOnline(telegramId) { if (!telegramId) return; onlineUsers.set(String(telegramId), Date.now()); }
function getOnlineCount() {
  const now = Date.now(); let count = 0;
  for (const [id, time] of onlineUsers) { if (now - time < 60000) count++; else onlineUsers.delete(id); }
  return count;
}

function nickHasRequiredTag(nick) {
  if (!nick || typeof nick !== 'string') return false;
  const cleaned = nick.replace(/@/g, ' ').toLowerCase();
  return cleaned.includes(USERNAME_TAG_LOWER);
}

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '', size = 0, aborted = false;
    req.on('data', (c) => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_SIZE) { aborted = true; reject(new Error('BODY_TOO_LARGE')); req.destroy(); return; }
      body += c.toString();
    });
    req.on('end', () => {
      if (aborted) return;
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(new Error('Неверный JSON')); }
    });
    req.on('error', reject);
  });
}

function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== 'string') return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (!authDate || (Date.now() / 1000 - authDate) > INIT_DATA_MAX_AGE_SEC) return null;
    const userJson = params.get('user');
    if (!userJson) return null;
    const u = JSON.parse(userJson);
    if (!u || !u.id) return null;

    const firstName = String(u.first_name || '').trim();
    const lastName  = String(u.last_name  || '').trim();
    const nickname  = [firstName, lastName].filter(Boolean).join(' ').trim();

    return {
      id: String(u.id),
      username: String(u.username || ''),
      first_name: firstName,
      last_name: lastName,
      nick: nickname
    };
  } catch (e) { return null; }
}
function getTelegramUser(req) { return validateTelegramInitData(req.headers['x-telegram-init-data']); }
function requireAdmin(req) {
  const u = getTelegramUser(req);
  if (!u) return null;
  if (!ADMIN_USERNAMES.includes((u.username || '').toLowerCase())) return null;
  return u;
}

function checkRateLimit(key) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) { rateBuckets.set(key, { start: now, count: 1 }); return true; }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++; return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateBuckets) { if (now - v.start > RATE_LIMIT_WINDOW_MS * 10) rateBuckets.delete(k); }
}, 60000);

// ================== БД ХЕЛПЕРЫ ==================
async function getUser(telegramId, username) {
  if (!telegramId) telegramId = 'guest_' + Date.now();
  let res = await pool.query('SELECT * FROM users WHERE id = $1', [telegramId]);
  if (res.rows.length === 0) {
    const newUser = {
      id: telegramId, balance: START_BALANCE, inventory: [],
      username: username || '', custom_nick: '', avatar: '',
      promos_used: [], ban: null, unban_notice: null, best_drop: null,
      pending_withdraw_details: {}
    };
    await pool.query(
      `INSERT INTO users (id, balance, inventory, username, custom_nick, avatar, promos_used, ban, unban_notice, best_drop, pending_withdraw_details) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [newUser.id, newUser.balance, JSON.stringify(newUser.inventory), newUser.username, newUser.custom_nick, newUser.avatar, JSON.stringify(newUser.promos_used), null, null, null, JSON.stringify({})]
    );
    return newUser;
  }
  const u = res.rows[0];
  u.inventory = u.inventory || [];
  u.promos_used = u.promos_used || [];
  u.pending_withdraw_details = u.pending_withdraw_details || {};
  if (username && u.username !== username) {
    await pool.query('UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2', [username, telegramId]);
    u.username = username;
  }
  return u;
}

async function updateUser(telegramId, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map(k => {
    if (typeof fields[k] === 'object' && fields[k] !== null && !(fields[k] instanceof Date)) {
      return JSON.stringify(fields[k]);
    }
    return fields[k];
  });
  await pool.query(`UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1`, [telegramId, ...values]);
}

async function getPendingWithdrawIds(telegramId) {
  const res = await pool.query("SELECT item_id FROM withdraws WHERE telegram_id = $1 AND status = 'pending'", [telegramId]);
  return res.rows.map(r => r.item_id);
}

function publicUser(u, pendingWithdrawIds = []) {
  const banned = !!(u.ban && u.ban.active);
  return {
    balance: (typeof u.balance === 'number' && isFinite(u.balance)) ? u.balance : 0,
    inventory: Array.isArray(u.inventory) ? u.inventory : [],
    username: u.username || '', custom_nick: u.custom_nick || '', avatar: u.avatar || '',
    pending_withdraw_ids: pendingWithdrawIds,
    pending_withdraw_details: (u.pending_withdraw_details && typeof u.pending_withdraw_details === 'object') ? u.pending_withdraw_details : {},
    banned, ban: banned ? u.ban : null,
    best_drop: u.best_drop || null,
    unban_notice: (u.unban_notice && !u.unban_notice.seen) ? { reason: u.unban_notice.reason || 'Решение администрации', at: u.unban_notice.at || null } : null
  };
}

async function listActiveBans() {
  const res = await pool.query("SELECT id, username, ban FROM users WHERE ban IS NOT NULL AND (ban->>'active')::boolean = true");
  return res.rows.map(r => ({
    id: r.id, username: r.username || '', reason: r.ban?.reason || 'Не указана', at: r.ban?.at || null, by: r.ban?.by || '', pending: false
  }));
}

async function getUsernameCaseStatus(telegramId, nick) {
  const hasRequired = nickHasRequiredTag(nick || '');
  const res = await pool.query(
    "SELECT last_opened_at FROM username_case WHERE telegram_id = $1",
    [String(telegramId)]
  );
  let nextAvailableAt = 0;
  if (res.rows.length > 0 && res.rows[0].last_opened_at) {
    nextAvailableAt = new Date(res.rows[0].last_opened_at).getTime() + USERNAME_CASE_COOLDOWN_MS;
  }
  const now = Date.now();
  return {
    has_required_username: hasRequired,
    required_tag: '@' + USERNAME_TAG,
    next_available_at: nextAvailableAt,
    can_open: hasRequired && now >= nextAvailableAt,
    cooldown_ms: USERNAME_CASE_COOLDOWN_MS
  };
}

setInterval(() => {
  const now = Date.now();
  for (const uid in activeMinesGames) {
    const g = activeMinesGames[uid];
    if (g && now - g.started_at > MINES_TTL_MS) {
      delete activeMinesGames[uid];
    }
  }
}, 60000);

// ================== СЕРВЕР ==================
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { setCORS(res); res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    setCORS(res);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true, status: 'alive', bot_token_valid: !!BOT_TOKEN,
      maintenance: maintenance.enabled, uptime_sec: Math.floor(process.uptime()), time: new Date().toISOString()
    }));
    return;
  }

  try {
    let body = {};
    if (req.method === 'POST') {
      try { body = await readBody(req); }
      catch (e) { return sendJSON(res, 413, { ok: false, error: 'Слишком большой запрос' }); }
    }
    const reqUrl = new URL(req.url, 'http://localhost');
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const preUser = getTelegramUser(req);

    if (!checkRateLimit(preUser ? 'u:' + preUser.id : 'ip:' + ip)) {
      return sendJSON(res, 429, { ok: false, error: 'Слишком много запросов, подожди немного' });
    }

    // ================== ОБЩИЕ ЭНДПОИНТЫ ==================
    if (req.method === 'GET' && req.url === '/api/stats') return sendJSON(res, 200, { ok: true, online: getOnlineCount(), upgrades: stats.total_upgrades, cases: stats.total_cases });

    if (req.method === 'GET' && req.url === '/api/announcement') {
      if (currentAnnouncement && (Date.now() - currentAnnouncement.timestamp > 10000)) currentAnnouncement = null;
      return sendJSON(res, 200, { ok: true, announcement: currentAnnouncement });
    }

    if (maintenance.enabled) {
      const allowed = (req.method === 'GET' && req.url === '/api/maintenance') || (req.method === 'GET' && req.url === '/api/stats') || (req.method === 'GET' && req.url === '/api/announcement') || (req.method === 'GET' && req.url.startsWith('/api/admin/bans')) || (req.method === 'POST' && req.url === '/api/admin/maintenance');
      if (!allowed) { const adminUser = requireAdmin(req); if (!adminUser) return sendJSON(res, 503, { ok: false, error: 'MAINTENANCE', message: 'Технический перерыв' }); }
    }

    if (req.method === 'GET' && req.url === '/api/maintenance') return sendJSON(res, 200, { ok: true, maintenance });

    // ================== АДМИНКА ==================
    if (req.method === 'POST' && req.url === '/api/admin/maintenance') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      maintenance = { enabled: !!body.enabled, since: body.enabled ? new Date().toISOString() : null, by: body.enabled ? adminUser.username : '' };
      return sendJSON(res, 200, { ok: true, maintenance });
    }
    if (req.method === 'POST' && req.url === '/api/admin/announce') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      if (currentAnnouncement && (Date.now() - currentAnnouncement.timestamp <= 10000)) return sendJSON(res, 429, { ok: false, error: 'Подождите, пока текущий анонс не закончится' });
      const text = String(body.text || '').trim().slice(0, 100);
      if (!text) return sendJSON(res, 400, { ok: false, error: 'Текст не может быть пустым' });
      currentAnnouncement = { text, timestamp: Date.now(), by: adminUser.username, username: adminUser.username };
      return sendJSON(res, 200, { ok: true, announcement: currentAnnouncement });
    }

    if (req.method === 'POST' && req.url === '/api/admin/ban') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const target = String(body.target || '').trim().replace(/^@+/, '');
      const reason = String(body.reason || '').trim().slice(0, 120) || 'Не указана';
      if (!target) return sendJSON(res, 400, { ok: false, error: 'Введите юзера в тг' });

      const found = await pool.query("SELECT id, username, ban FROM users WHERE id = $1 OR LOWER(username) = LOWER($2)", [target, target]);
      if (found.rows.length > 0) {
        const u = found.rows[0];
        const ban = { active: true, reason, at: new Date().toISOString(), by: adminUser.username };
        await pool.query("UPDATE users SET ban = $1, unban_notice = NULL, updated_at = NOW() WHERE id = $2", [JSON.stringify(ban), u.id]);
        return sendJSON(res, 200, { ok: true, banned: true, reason, user: { id: u.id, username: u.username || target } });
      }
      return sendJSON(res, 404, { ok: false, error: 'Юзер не найден в базе' });
    }
    if (req.method === 'POST' && req.url === '/api/admin/unban') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const target = String(body.target || '').trim().replace(/^@+/, '');
      const reason = String(body.reason || '').trim().slice(0, 120);

      const found = await pool.query("SELECT id, username, ban FROM users WHERE id = $1 OR LOWER(username) = LOWER($2)", [target, target]);
      if (found.rows.length > 0) {
        const u = found.rows[0];
        if (!u.ban || !u.ban.active) return sendJSON(res, 400, { ok: false, error: 'Этот юзер не забанен' });
        const finalReason = reason || u.ban.reason || 'Решение администрации';
        const unban_notice = { reason: finalReason, at: new Date().toISOString(), by: adminUser.username, seen: false };
        const ban = { ...u.ban, active: false, unbanned_at: new Date().toISOString(), unbanned_by: adminUser.username };
        await pool.query("UPDATE users SET ban = $1, unban_notice = $2, updated_at = NOW() WHERE id = $3", [JSON.stringify(ban), JSON.stringify(unban_notice), u.id]);
        return sendJSON(res, 200, { ok: true, unbanned: true, reason: finalReason, user: { id: u.id, username: u.username || target } });
      }
      return sendJSON(res, 404, { ok: false, error: 'Юзер не найден' });
    }
    if (req.method === 'GET' && req.url.startsWith('/api/admin/bans')) {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      return sendJSON(res, 200, { ok: true, bans: await listActiveBans() });
    }

    // ================== ПРОМОКОДЫ ==================
    if (req.method === 'POST' && req.url === '/api/create') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const { code, uses, type, value } = body;
      if (!code || String(code).trim().length < 3) return sendJSON(res, 400, { ok: false, error: 'Название минимум 3 символа' });
      const upperCode = String(code).trim().toUpperCase().slice(0, 20);

      const exists = await pool.query("SELECT code FROM promocodes WHERE code = $1", [upperCode]);
      if (exists.rows.length > 0) return sendJSON(res, 409, { ok: false, error: 'Промокод уже есть' });

      const parsedUses = parseInt(uses, 10);
      if (!parsedUses || parsedUses < 1 || parsedUses > 100000) return sendJSON(res, 400, { ok: false, error: 'Некорректное число активаций' });

      let storedValue;
      if (type === 'balance') {
        storedValue = parseInt(value, 10);
        if (!storedValue || storedValue < 1 || storedValue > 10000000) return sendJSON(res, 400, { ok: false, error: 'Некорректная сумма' });
      } else if (type === 'item') {
        if (!getItem(value)) return sendJSON(res, 400, { ok: false, error: 'Неизвестный предмет' });
        storedValue = value;
      } else return sendJSON(res, 400, { ok: false, error: 'Неизвестный тип награды' });

      await pool.query("INSERT INTO promocodes (code, uses, type, value) VALUES ($1, $2, $3, $4)", [upperCode, parsedUses, type, String(storedValue)]);
      return sendJSON(res, 200, { ok: true, promo: { code: upperCode, uses: parsedUses, type, value: storedValue } });
    }

    if (req.method === 'POST' && req.url === '/api/activate') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const upperCode = String(body.code || '').trim().toUpperCase().slice(0, 20);
      if (!upperCode) return sendJSON(res, 400, { ok: false, error: 'Введите промокод' });

      if (u.promos_used.includes(upperCode)) return sendJSON(res, 409, { ok: false, error: 'Вы уже активировали этот промокод' });

      const promoRes = await pool.query("SELECT * FROM promocodes WHERE code = $1", [upperCode]);
      if (promoRes.rows.length === 0) return sendJSON(res, 404, { ok: false, error: 'Промокод не найден' });

      const promo = promoRes.rows[0];
      if (promo.uses <= 0) return sendJSON(res, 410, { ok: false, error: 'Промокод больше не активен' });

      await pool.query("UPDATE promocodes SET uses = uses - 1 WHERE code = $1", [upperCode]);

      const updates = { promos_used: [...u.promos_used, upperCode] };
      if (promo.type === 'balance') {
        updates.balance = u.balance + parseInt(promo.value, 10);
      } else if (promo.type === 'item') {
        updates.inventory = [...u.inventory, promo.value];
      }

      await updateUser(user.id, updates);
      return sendJSON(res, 200, { ok: true, type: promo.type, value: promo.type === 'balance' ? parseInt(promo.value, 10) : promo.value, remaining: promo.uses - 1 });
    }

    if (req.method === 'GET' && req.url === '/api/promocodes') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const res = await pool.query("SELECT * FROM promocodes");
      return sendJSON(res, 200, { ok: true, promocodes: res.rows });
    }

    // ================== USERNAME CASE ==================
    if (req.method === 'GET' && req.url === '/api/username-case/status') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });

      const nickFromQuery = String(reqUrl.searchParams.get('nick') || '');
      const nick = nickFromQuery || user.nick || '';

      const st = await getUsernameCaseStatus(user.id, nick);
      return sendJSON(res, 200, { ok: true, ...st, nick });
    }

    if (req.method === 'POST' && req.url === '/api/username-case/open') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);

      const nickFromBody = String(body.nick || '');
      const nick = nickFromBody || user.nick || '';

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const st = await getUsernameCaseStatus(user.id, nick);
      if (!st.has_required_username) {
        return sendJSON(res, 400, { ok: false, error: 'USERNAME_REQUIRED', required_tag: st.required_tag });
      }
      if (Date.now() < st.next_available_at) {
        return sendJSON(res, 429, { ok: false, error: 'COOLDOWN', next_available_at: st.next_available_at });
      }

      const c = getCase('username');
      const rng = secureRandom() * 100;
      let acc = 0, wonId = c.rewards[0].id;
      for (const r of c.rewards) { acc += r.chance; if (rng <= acc) { wonId = r.id; break; } }

      const nowIso = new Date().toISOString();
      let newBalance = u.balance;
      let newInv = [...u.inventory];
      let rewardType = 'item';
      let rewardValue = wonId;

      if (COIN_REWARDS[wonId]) {
        rewardType = 'balance';
        rewardValue = COIN_REWARDS[wonId];
        newBalance = u.balance + COIN_REWARDS[wonId];
      } else {
        const wonObj = getItem(wonId);
        if (!wonObj) return sendJSON(res, 500, { ok: false, error: 'Ошибка награды' });
        newInv.push(wonId);
      }

      await updateUser(user.id, { balance: newBalance, inventory: newInv });

      await pool.query(
        `INSERT INTO username_case (telegram_id, last_opened_at) VALUES ($1, $2)
         ON CONFLICT (telegram_id) DO UPDATE SET last_opened_at = EXCLUDED.last_opened_at`,
        [String(user.id), nowIso]
      );

      return sendJSON(res, 200, {
        ok: true,
        reward_type: rewardType,
        reward_value: rewardValue,
        new_balance: newBalance,
        inventory: newInv,
        next_available_at: new Date(nowIso).getTime() + USERNAME_CASE_COOLDOWN_MS
      });
    }

    // ================== СТЕЙКИНГ ==================
    if (req.method === 'GET' && req.url === '/api/staking/info') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const res1 = await pool.query(
        "SELECT * FROM staking WHERE telegram_id = $1 ORDER BY created_at DESC LIMIT 1",
        [String(user.id)]
      );
      let stake = null;
      if (res1.rows.length > 0) {
        const s = res1.rows[0];
        stake = {
          id: s.id, amount: Number(s.amount), tier: s.tier, bonus: s.bonus,
          ends_at: new Date(s.ends_at).getTime(),
          claimed: !!s.claimed
        };
      }
      return sendJSON(res, 200, { ok: true, stake, tiers: Object.values(STAKING_TIERS) });
    }

    if (req.method === 'POST' && req.url === '/api/staking/start') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const amount = parseInt(body.amount, 10);
      const tier = STAKING_TIERS[String(body.tier || '')];
      if (!amount || amount < 100) return sendJSON(res, 400, { ok: false, error: 'Минимум 100 монет' });
      if (!tier) return sendJSON(res, 400, { ok: false, error: 'Неверный срок' });
      if (u.balance < amount) return sendJSON(res, 400, { ok: false, error: 'Недостаточно монет' });

      const active = await pool.query(
        "SELECT id FROM staking WHERE telegram_id = $1 AND claimed = false",
        [String(user.id)]
      );
      if (active.rows.length > 0) return sendJSON(res, 409, { ok: false, error: 'У вас уже есть активный стейк' });

      const now = Date.now();
      const endsAt = now + tier.duration_ms;
      const id = 'stk_' + now + '_' + crypto.randomBytes(4).toString('hex');

      await pool.query(
        `INSERT INTO staking (id, telegram_id, amount, tier, bonus, ends_at, claimed, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, NOW())`,
        [id, String(user.id), amount, tier.id, tier.bonus, new Date(endsAt).toISOString()]
      );

      await updateUser(user.id, { balance: u.balance - amount });

      return sendJSON(res, 200, {
        ok: true,
        stake: { id, amount, tier: tier.id, bonus: tier.bonus, ends_at: endsAt, claimed: false },
        new_balance: u.balance - amount
      });
    }

    if (req.method === 'POST' && req.url === '/api/staking/claim') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const res1 = await pool.query(
        "SELECT * FROM staking WHERE telegram_id = $1 AND claimed = false ORDER BY created_at DESC LIMIT 1",
        [String(user.id)]
      );
      if (res1.rows.length === 0) return sendJSON(res, 404, { ok: false, error: 'Нет активного стейка' });
      const s = res1.rows[0];
      if (Date.now() < new Date(s.ends_at).getTime()) {
        return sendJSON(res, 400, { ok: false, error: 'Срок ещё не истёк', ends_at: new Date(s.ends_at).getTime() });
      }

      const payout = Math.floor(Number(s.amount) * (1 + s.bonus / 100));
      await pool.query("UPDATE staking SET claimed = true WHERE id = $1", [s.id]);
      await updateUser(user.id, { balance: u.balance + payout });

      return sendJSON(res, 200, { ok: true, payout, new_balance: u.balance + payout });
    }

    // ================== КЕЙСЫ ==================
    if (req.method === 'POST' && req.url === '/api/case/open') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);

      const c = getCase(body.case_id);
      if (!c) return sendJSON(res, 404, { ok: false, error: 'Кейс не найден' });
      if (body.case_id === 'username') return sendJSON(res, 400, { ok: false, error: 'Этот кейс открывается через /api/username-case/open' });

      const quantity = Math.max(1, Math.min(5, parseInt(body.qty, 10) || 1));
      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const totalCost = c.price * quantity;
      if (!isFinite(u.balance) || u.balance < totalCost) return sendJSON(res, 400, { ok: false, error: 'Недостаточно монет' });

      let newInv = [...u.inventory];
      let newBestDrop = u.best_drop;
      const wonItems = [];
      let balanceGained = 0;

      for (let i = 0; i < quantity; i++) {
        const rng = secureRandom() * 100; let acc = 0; let wonId = c.rewards[0].id;
        for (const r of c.rewards) { acc += r.chance; if (rng <= acc) { wonId = r.id; break; } }
        wonItems.push(wonId);

        if (Object.prototype.hasOwnProperty.call(COIN_REWARDS, wonId)) {
          balanceGained += COIN_REWARDS[wonId];
          continue;
        }

        newInv.push(wonId);

        const wonItemObj = getItem(wonId);
        if (wonItemObj && (!newBestDrop || wonItemObj.price > newBestDrop.price)) {
          newBestDrop = { id: wonId, name: wonItemObj.name, price: wonItemObj.price, won_at: new Date().toISOString() };
        }
      }

      const newBalance = u.balance - totalCost + balanceGained;
      await updateUser(user.id, { balance: newBalance, inventory: newInv, best_drop: newBestDrop });
      return sendJSON(res, 200, { ok: true, won: wonItems, new_balance: newBalance, inventory: newInv, best_drop: newBestDrop });
    }

    // ================== АПГРЕЙД ==================
    if (req.method === 'POST' && req.url === '/api/upgrade') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);

      const src = getItem(body.source_item_id), tgt = getItem(body.target_item_id);
      if (!src || !tgt) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      if (tgt.price <= src.price) return sendJSON(res, 400, { ok: false, error: 'Цель должна быть дороже' });

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const idx = u.inventory.indexOf(body.source_item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Исходный предмет не найден' });

      const pendingW = await getPendingWithdrawIds(user.id);
      if (pendingW.includes(body.source_item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });

      let newInv = [...u.inventory];
      newInv.splice(idx, 1);

      const chance = calcUpgradeChance(src.price, tgt.price);
      const success = secureRandom() * 100 <= chance;
      let newBestDrop = u.best_drop;

      if (success) {
        newInv.push(body.target_item_id);
        if (!newBestDrop || tgt.price > newBestDrop.price) {
          newBestDrop = { id: body.target_item_id, name: tgt.name, price: tgt.price, won_at: new Date().toISOString() };
        }
      }

      stats.total_upgrades++;
      await updateUser(user.id, { inventory: newInv, best_drop: newBestDrop });
      return sendJSON(res, 200, { ok: true, success, chance, won_item: success ? body.target_item_id : null, new_balance: u.balance, inventory: newInv, best_drop: newBestDrop });
    }

    if (req.method === 'POST' && req.url === '/api/user/reset-best-drop') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      await updateUser(user.id, { best_drop: null });
      return sendJSON(res, 200, { ok: true });
    }

    // ================== МАГАЗИН ==================
    if (req.method === 'POST' && req.url === '/api/shop/buy') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const item = getItem(body.item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });
      if (u.balance < item.price) return sendJSON(res, 400, { ok: false, error: 'Недостаточно монет' });

      const newInv = [...u.inventory, body.item_id];
      await updateUser(user.id, { balance: u.balance - item.price, inventory: newInv });
      return sendJSON(res, 200, { ok: true, new_balance: u.balance - item.price, inventory: newInv });
    }

    if (req.method === 'POST' && req.url === '/api/shop/sell') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);
      const item = getItem(body.item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const idx = u.inventory.indexOf(body.item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Предмета нет в инвентаре' });

      const pendingW = await getPendingWithdrawIds(user.id);
      if (pendingW.includes(body.item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });

      const newInv = [...u.inventory];
      newInv.splice(idx, 1);

      await updateUser(user.id, { balance: u.balance + item.price, inventory: newInv });
      return sendJSON(res, 200, { ok: true, new_balance: u.balance + item.price, inventory: newInv });
    }

    // ================== МИНЫ ==================
    if (req.method === 'POST' && req.url === '/api/mines/start') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });

      const item_ids = body.item_ids;
      if (!Array.isArray(item_ids) || item_ids.length === 0 || item_ids.length > 5) return sendJSON(res, 400, { ok: false, error: 'Выберите от 1 до 5 предметов' });

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });
      if (activeMinesGames[user.id]) return sendJSON(res, 400, { ok: false, error: 'Сначала завершите текущую игру' });

      const pendingW = await getPendingWithdrawIds(user.id);
      let totalBetValue = 0;

      for (const id of item_ids) {
        const it = getItem(id);
        if (!it) return sendJSON(res, 400, { ok: false, error: 'Неизвестный предмет' });
        if (!u.inventory.includes(id)) return sendJSON(res, 400, { ok: false, error: 'Предмет не найден в инвентаре' });
        if (pendingW.includes(id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });
        totalBetValue += it.price;
      }
      if (totalBetValue <= 0) return sendJSON(res, 400, { ok: false, error: 'Ставка слишком мала' });

      const newInv = [...u.inventory];
      item_ids.forEach(id => { const idx = newInv.indexOf(id); if (idx !== -1) newInv.splice(idx, 1); });

      const safeMinesCount = Math.min(24, Math.max(1, parseInt(body.mines_count, 10) || 2));
      const minesPositions = new Set();
      while (minesPositions.size < safeMinesCount) minesPositions.add(secureRandomInt(0, 25));

      activeMinesGames[user.id] = {
        bet_items: item_ids.slice(), total_bet_value: totalBetValue,
        mines_count: minesPositions.size, mines_positions: [...minesPositions],
        opened: [], started_at: Date.now()
      };

      await updateUser(user.id, { inventory: newInv });
      return sendJSON(res, 200, { ok: true, inventory: newInv, mines_count: minesPositions.size, total_bet_value: totalBetValue });
    }

    if (req.method === 'POST' && req.url === '/api/mines/open') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });

      const cell_index = body.cell_index;
      if (!Number.isInteger(cell_index) || cell_index < 0 || cell_index > 24) return sendJSON(res, 400, { ok: false, error: 'Некорректная ячейка' });

      const game = activeMinesGames[user.id];
      if (!game) return sendJSON(res, 400, { ok: false, error: 'Игра не найдена' });
      if (game.opened.includes(cell_index)) return sendJSON(res, 400, { ok: false, error: 'Ячейка уже открыта' });

      const isBomb = game.mines_positions.includes(cell_index);
      game.opened.push(cell_index);

      if (isBomb) {
        delete activeMinesGames[user.id];
        const u = await getUser(user.id);
        return sendJSON(res, 200, { ok: true, is_bomb: true, win_amount: 0, opened: game.opened, inventory: u.inventory, new_balance: u.balance });
      } else {
        const totalSafe = 25 - game.mines_count;
        if (game.opened.length === totalSafe) {
          const mult = minesMultiplier(game.mines_count);
          const winAmount = Math.floor(game.total_bet_value * mult);
          const u = await getUser(user.id);
          await updateUser(user.id, { balance: u.balance + winAmount });
          delete activeMinesGames[user.id];
          return sendJSON(res, 200, { ok: true, is_bomb: false, win_amount: winAmount, opened: game.opened, inventory: u.inventory, new_balance: u.balance + winAmount });
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
      const u = await getUser(user.id);

      await updateUser(user.id, { balance: u.balance + winAmount });
      delete activeMinesGames[user.id];

      return sendJSON(res, 200, { ok: true, win_amount: winAmount, new_balance: u.balance + winAmount, inventory: u.inventory });
    }

    // ================== ДЕПОЗИТЫ ==================
    if (req.method === 'POST' && req.url === '/api/deposit/create') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);

      const item_id = body.item_id;
      const roblox_name = String(body.roblox_name || '').trim().slice(0, 40);
      if (!item_id || !roblox_name) return sendJSON(res, 400, { ok: false, error: 'Не хватает данных' });

      const item = getItem(item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      if (item.price < MIN_DEPOSIT_PRICE) return sendJSON(res, 400, { ok: false, error: 'Минимум ' + MIN_DEPOSIT_PRICE + ' монет для пополнения' });

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const idx = u.inventory.indexOf(item_id);
      if (idx === -1) return sendJSON(res, 400, { ok: false, error: 'Предмета нет в инвентаре' });

      const pendingW = await getPendingWithdrawIds(user.id);
      if (pendingW.includes(item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет на выводе' });

      const newInv = [...u.inventory];
      newInv.splice(idx, 1);
      await updateUser(user.id, { inventory: newInv });

      const depId = 'dep_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      await pool.query(
        "INSERT INTO deposits (id, telegram_id, username, item_id, item_name, item_price, roblox_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')",
        [depId, user.id, user.username || '', item_id, item.name, item.price, roblox_name]
      );

      return sendJSON(res, 200, { ok: true, deposit: { id: depId, item_id, roblox_name }, new_balance: u.balance, inventory: newInv });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/deposits')) {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const res = await pool.query("SELECT * FROM deposits ORDER BY created_at DESC");
      return sendJSON(res, 200, { ok: true, deposits: res.rows });
    }

    if (req.method === 'POST' && req.url === '/api/deposit/status') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });

      const { id, status } = body;
      if (!id || !['accepted', 'rejected'].includes(status)) return sendJSON(res, 400, { ok: false, error: 'Неверные данные' });

      const depRes = await pool.query("SELECT * FROM deposits WHERE id = $1", [id]);
      if (depRes.rows.length === 0) return sendJSON(res, 404, { ok: false, error: 'Заявка не найдена' });

      const dep = depRes.rows[0];
      if (dep.status !== 'pending') return sendJSON(res, 409, { ok: false, error: 'Уже обработана' });

      await pool.query("UPDATE deposits SET status = $1, processed_at = NOW(), processed_by = $2 WHERE id = $3", [status, adminUser.username, id]);

      const u = await getUser(dep.telegram_id, dep.username);
      if (status === 'accepted') {
        await updateUser(dep.telegram_id, { balance: u.balance + dep.item_price });
      } else if (status === 'rejected') {
        await updateUser(dep.telegram_id, { inventory: [...u.inventory, dep.item_id] });
      }
      return sendJSON(res, 200, { ok: true, deposit: { ...dep, status } });
    }

    // ================== ВЫВОДЫ ==================
    if (req.method === 'POST' && req.url === '/api/withdraw/create') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);

      const item_id = body.item_id;
      const roblox_name = String(body.roblox_name || '').trim().slice(0, 40);
      const time_slot = String(body.time_slot || '').trim().slice(0, 60) || 'pending';

      if (!item_id || !roblox_name) return sendJSON(res, 400, { ok: false, error: 'Не хватает данных' });

      const item = getItem(item_id);
      if (!item) return sendJSON(res, 404, { ok: false, error: 'Предмет не найден' });
      if (item.price < MIN_WITHDRAW_PRICE) return sendJSON(res, 400, { ok: false, error: 'Минимум ' + MIN_WITHDRAW_PRICE + ' монет для вывода' });

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });
      if (!u.inventory.includes(item_id)) return sendJSON(res, 400, { ok: false, error: 'Предмет не найден в инвентаре' });

      const wdRes = await pool.query("SELECT id FROM withdraws WHERE telegram_id = $1 AND item_id = $2 AND status = 'pending'", [user.id, item_id]);
      if (wdRes.rows.length > 0) return sendJSON(res, 409, { ok: false, error: 'Предмет уже на выводе' });

      const wdId = 'wd_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      await pool.query(
        "INSERT INTO withdraws (id, telegram_id, username, item_id, item_name, item_price, roblox_name, time_slot, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')",
        [wdId, user.id, user.username || '', item_id, item.name, item.price, roblox_name, time_slot]
      );

      return sendJSON(res, 200, { ok: true, withdraw: { id: wdId, item_id, time_slot } });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/withdraws')) {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });
      const res = await pool.query("SELECT * FROM withdraws ORDER BY created_at DESC");
      return sendJSON(res, 200, { ok: true, withdraws: res.rows });
    }

    if (req.method === 'POST' && req.url === '/api/withdraw/status') {
      const adminUser = requireAdmin(req);
      if (!adminUser) return sendJSON(res, 403, { ok: false, error: 'Нет доступа' });

      const { id, status, time_slot } = body;
      if (!id || !['accepted', 'rejected'].includes(status)) return sendJSON(res, 400, { ok: false, error: 'Неверные данные' });

      const wdRes = await pool.query("SELECT * FROM withdraws WHERE id = $1", [id]);
      if (wdRes.rows.length === 0) return sendJSON(res, 404, { ok: false, error: 'Заявка не найдена' });

      const wd = wdRes.rows[0];
      if (wd.status !== 'pending') return sendJSON(res, 409, { ok: false, error: 'Уже обработана' });

      if (status === 'accepted') {
        const finalTime = String(time_slot || wd.time_slot || '').trim().slice(0, 80);

        await pool.query(
          "UPDATE withdraws SET status = 'accepted', time_slot = $1, processed_at = NOW(), processed_by = $2 WHERE id = $3",
          [finalTime, adminUser.username, id]
        );

        await pool.query(
          `UPDATE users 
           SET pending_withdraw_details = COALESCE(pending_withdraw_details, '{}'::jsonb) || jsonb_build_object($1::text, jsonb_build_object('approved', true, 'time', $2::text, 'shown', false))
           WHERE id = $3`,
          [wd.item_id, finalTime, wd.telegram_id]
        );

        const u = await getUser(wd.telegram_id, wd.username);
        const i = u.inventory.indexOf(wd.item_id);
        if (i === -1) {
          await pool.query("UPDATE withdraws SET status = 'failed' WHERE id = $1", [id]);
          return sendJSON(res, 409, { ok: false, error: 'Предмета уже нет в инвентаре' });
        }
        const newInv = [...u.inventory];
        newInv.splice(i, 1);
        await updateUser(wd.telegram_id, { inventory: newInv });

        return sendJSON(res, 200, { ok: true, withdraw: { ...wd, status: 'accepted', time_slot: finalTime } });
      }

      // rejected
      await pool.query(
        "UPDATE withdraws SET status = 'rejected', processed_at = NOW(), processed_by = $1 WHERE id = $2",
        [adminUser.username, id]
      );
      await pool.query(
        "UPDATE users SET pending_withdraw_details = COALESCE(pending_withdraw_details, '{}'::jsonb) - $1::text WHERE id = $2",
        [wd.item_id, wd.telegram_id]
      );
      return sendJSON(res, 200, { ok: true, withdraw: { ...wd, status: 'rejected' } });
    }

    if (req.method === 'POST' && req.url === '/api/withdraw/mark-shown') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const itemId = String(body.item_id || '');
      if (!itemId) return sendJSON(res, 400, { ok: false, error: 'Не указан item_id' });
      await pool.query(
        `UPDATE users 
         SET pending_withdraw_details = jsonb_set(COALESCE(pending_withdraw_details, '{}'::jsonb), ARRAY[$1::text, 'shown'], 'true')
         WHERE id = $2 AND pending_withdraw_details ? $1`,
        [itemId, user.id]
      );
      return sendJSON(res, 200, { ok: true });
    }

    // ================== БАНЫ И ЮЗЕР ==================
    if (req.method === 'GET' && req.url.startsWith('/api/ban/status')) {
      const id = String(reqUrl.searchParams.get('telegram_id') || '');
      const uname = String(reqUrl.searchParams.get('username') || '').replace(/^@+/, '');
      if (!id) return sendJSON(res, 200, { ok: true, banned: false, ban: null, unban_notice: null });

      const u = await getUser(id, uname);
      const banned = !!(u.ban && u.ban.active);
      return sendJSON(res, 200, { ok: true, banned, ban: banned ? u.ban : null, unban_notice: (u.unban_notice && !u.unban_notice.seen) ? { reason: u.unban_notice.reason || 'Решение администрации', at: u.unban_notice.at || null } : null });
    }

    if (req.method === 'POST' && req.url === '/api/unban/ack') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      const u = await getUser(user.id);
      if (u.unban_notice) {
        const notice = { ...u.unban_notice, seen: true };
        await updateUser(user.id, { unban_notice: notice });
      }
      return sendJSON(res, 200, { ok: true });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/user/')) {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });

      const requestedId = decodeURIComponent(reqUrl.pathname.slice('/api/user/'.length));
      if (String(requestedId) !== String(user.id)) return sendJSON(res, 403, { ok: false, error: 'Нет доступа к чужому профилю' });

      updateOnline(user.id);
      const u = await getUser(user.id, user.username);
      const pendingW = await getPendingWithdrawIds(user.id);
      return sendJSON(res, 200, { ok: true, user: publicUser(u, pendingW) });
    }

    if (req.method === 'POST' && req.url === '/api/user/update') {
      const user = getTelegramUser(req);
      if (!user) return sendJSON(res, 401, { ok: false, error: 'Не авторизован' });
      updateOnline(user.id);

      const u = await getUser(user.id, user.username);
      if (u.ban && u.ban.active) return sendJSON(res, 403, { ok: false, error: 'BANNED' });

      const updates = {};
      if (typeof body.custom_nick === 'string') {
        updates.custom_nick = body.custom_nick.replace(/[<>&"']/g, '').trim().slice(0, 20);
      }
      if (typeof body.avatar === 'string') {
        if (body.avatar === '') updates.avatar = '';
        else if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(body.avatar) && body.avatar.length <= 700000) updates.avatar = body.avatar;
        else if (/^https?:\/\/[^\s"'<>]+$/i.test(body.avatar) && body.avatar.length <= 2048) updates.avatar = body.avatar;
        else return sendJSON(res, 400, { ok: false, error: 'Некорректный аватар' });
      }

      if (Object.keys(updates).length > 0) {
        await updateUser(user.id, updates);
      }

      const fresh = await getUser(user.id);
      const pendingW = await getPendingWithdrawIds(user.id);
      return sendJSON(res, 200, { ok: true, user: publicUser(fresh, pendingW) });
    }

    sendJSON(res, 404, { ok: false, error: 'Метод не найден' });
  } catch (err) {
    console.error('[ERROR]', err);
    sendJSON(res, 500, { ok: false, error: 'Server Error' });
  }
});

server.listen(PORT, () => {
  console.log('Бурмалда забилдилась на адресе: ' + PORT);
  console.log('ТОКЕН БОТА: OK (length=' + BOT_TOKEN.length + ')');
});
