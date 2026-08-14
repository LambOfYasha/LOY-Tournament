const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ensureOffstream, snapshot, runCommand } = require('./lib/offstream');
const { normalizeTrack } = require('./lib/nowplaying');
const { startTwitchBot } = require('./bot/twitch');

const app = express();
const server = http.createServer(app);

const PUBLIC_URL = process.env.PUBLIC_URL || process.env.BASE_URL || '';
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  },
  path: process.env.SOCKET_PATH || "/socket.io"
});

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultData = {
  matchState: {
    tournamentName: "Tekken 8 Tournament",
    round: "Waiting for players",
    bestOf: 3,
    status: "waiting",
    p1: { name: "Player 1", score: 0, character: "" },
    p2: { name: "Player 2", score: 0, character: "" },
    lastUpdated: Date.now()
  },
  signups: [],
  events: [
    {
      id: "evt-1",
      name: "Tekken 8 Weekly #1",
      date: "2026-08-15",
      game: "Tekken 8",
      status: "open",
      description: "Local FGC Tekken 8 tournament. Bring your A-game."
    }
  ],
  offstream: { match: null, results: [], chat: [] },
  nowPlaying: null
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDB() {
  ensureDataDir();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      data.matchState = data.matchState || { ...defaultData.matchState };
      data.signups = Array.isArray(data.signups) ? data.signups : [];
      data.events = Array.isArray(data.events) ? data.events : defaultData.events;
      data.offstream = data.offstream || { match: null, results: [], chat: [] };
      if (!('nowPlaying' in data)) data.nowPlaying = null;
      ensureOffstream(data);
      return data;
    }
  } catch (e) {
    console.error('DB read error, using default:', e.message);
  }
  return JSON.parse(JSON.stringify(defaultData));
}

function writeDB(data) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let db = readDB();

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) return next();
  const key = req.query.key || req.headers['x-admin-key'] || (req.body && req.body.adminKey);
  if (key === ADMIN_KEY) return next();
  return res.status(401).json({ success: false, error: "Unauthorized – provide valid admin key" });
}

function applyOverlayPatch(patch) {
  if (!patch) return;
  db = readDB();
  db.matchState = {
    ...db.matchState,
    ...patch,
    p1: { ...db.matchState.p1, ...(patch.p1 || {}) },
    p2: { ...db.matchState.p2, ...(patch.p2 || {}) },
    lastUpdated: Date.now()
  };
  writeDB(db);
  io.emit('matchUpdate', db.matchState);
}

function handleBot(actor, text) {
  db = readDB();
  const result = runCommand(db, actor, text);
  writeDB(db);
  io.emit('offstreamUpdate', result.snapshot);
  io.emit('signupsUpdate', db.signups);
  if (result.overlay) applyOverlayPatch(result.overlay);
  return result;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});
app.get('/offstream', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'offstream.html'));
});
app.get('/nowplaying', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'nowplaying.html'));
});

app.get('/api/state', (req, res) => {
  db = readDB();
  res.json(db.matchState);
});

app.get('/api/signups', (req, res) => {
  db = readDB();
  res.json(db.signups);
});

app.get('/api/events', (req, res) => {
  db = readDB();
  res.json(db.events);
});

app.get('/api/offstream', (req, res) => {
  db = readDB();
  res.json(snapshot(db));
});

app.get('/api/nowplaying', (req, res) => {
  db = readDB();
  res.json(db.nowPlaying);
});

app.post('/api/signup', (req, res) => {
  db = readDB();
  const { playerTag, whatsapp, region, characterMain, platform, notes, twitch } = req.body || {};

  if (!playerTag || typeof playerTag !== 'string' || playerTag.trim().length < 2) {
    return res.status(400).json({ success: false, error: "playerTag is required (min 2 chars)" });
  }

  const signup = {
    id: uuidv4(),
    playerTag: playerTag.trim(),
    whatsapp: (whatsapp || "").trim(),
    region: (region || "").trim(),
    characterMain: (characterMain || "").trim(),
    platform: (platform || "").trim(),
    notes: (notes || "").trim(),
    twitch: String(twitch || playerTag).trim().replace(/^@/, "").toLowerCase(),
    checkedIn: false,
    checkedInAt: null,
    registeredAt: new Date().toISOString()
  };

  db.signups.push(signup);
  writeDB(db);
  io.emit('signupsUpdate', db.signups);
  io.emit('offstreamUpdate', snapshot(db));
  res.json({ success: true, id: signup.id, signup });
});

app.post('/api/bot', (req, res) => {
  const { login, display, isMod, text, adminKey } = req.body || {};
  if (ADMIN_KEY && !isMod && adminKey !== ADMIN_KEY) {
    // players can still report/confirm; mods from HTTP need key if claiming isMod
  }
  if (ADMIN_KEY && isMod && adminKey !== ADMIN_KEY) {
    return res.status(401).json({ success: false, error: "Unauthorized mod claim" });
  }
  if (!text) return res.status(400).json({ success: false, error: "text is required" });
  const result = handleBot({
    login: String(login || display || "anon").toLowerCase(),
    display: String(display || login || "anon"),
    isMod: Boolean(isMod)
  }, text);
  res.json({ success: true, reply: result.reply, snapshot: result.snapshot });
});

app.post('/api/nowplaying', requireAdmin, (req, res) => {
  const track = normalizeTrack(req.body || {});
  if (!track) return res.status(400).json({ success: false, error: "title is required" });
  db = readDB();
  db.nowPlaying = track;
  writeDB(db);
  io.emit('nowPlaying', track);
  res.json({ success: true, track });
});

app.post('/api/state', requireAdmin, (req, res) => {
  db = readDB();
  const updates = req.body || {};
  db.matchState = {
    ...db.matchState,
    ...updates,
    p1: { ...db.matchState.p1, ...(updates.p1 || {}) },
    p2: { ...db.matchState.p2, ...(updates.p2 || {}) },
    lastUpdated: Date.now()
  };
  db.matchState.p1.score = Number(db.matchState.p1.score) || 0;
  db.matchState.p2.score = Number(db.matchState.p2.score) || 0;
  db.matchState.bestOf = Number(db.matchState.bestOf) || 3;
  writeDB(db);
  io.emit('matchUpdate', db.matchState);
  res.json({ success: true, state: db.matchState });
});

app.delete('/api/signups', requireAdmin, (req, res) => {
  db = readDB();
  db.signups = [];
  writeDB(db);
  io.emit('signupsUpdate', []);
  io.emit('offstreamUpdate', snapshot(db));
  res.json({ success: true });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  db = readDB();
  socket.emit('matchUpdate', db.matchState);
  socket.emit('signupsUpdate', db.signups);
  socket.emit('offstreamUpdate', snapshot(db));
  if (db.nowPlaying) socket.emit('nowPlaying', db.nowPlaying);

  socket.on('requestState', () => {
    db = readDB();
    socket.emit('matchUpdate', db.matchState);
    socket.emit('signupsUpdate', db.signups);
    socket.emit('offstreamUpdate', snapshot(db));
    if (db.nowPlaying) socket.emit('nowPlaying', db.nowPlaying);
  });

  socket.on('adminUpdateMatch', (payload) => {
    if (ADMIN_KEY && payload && payload.adminKey !== ADMIN_KEY) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (!payload || typeof payload !== 'object') return;
    db = readDB();
    const current = db.matchState;
    const newState = {
      ...current,
      ...payload,
      p1: { ...current.p1, ...(payload.p1 || {}) },
      p2: { ...current.p2, ...(payload.p2 || {}) },
      lastUpdated: Date.now()
    };
    delete newState.adminKey;
    newState.p1.score = Number(newState.p1.score) || 0;
    newState.p2.score = Number(newState.p2.score) || 0;
    newState.bestOf = Number(newState.bestOf) || 3;
    db.matchState = newState;
    writeDB(db);
    io.emit('matchUpdate', newState);
  });

  socket.on('adminGetSignups', () => {
    db = readDB();
    socket.emit('signupsUpdate', db.signups);
  });

  socket.on('incrementScore', ({ player, amount = 1, adminKey }) => {
    if (ADMIN_KEY && adminKey !== ADMIN_KEY) return;
    if (player !== 'p1' && player !== 'p2') return;
    db = readDB();
    db.matchState[player].score = (Number(db.matchState[player].score) || 0) + Number(amount);
    db.matchState.lastUpdated = Date.now();
    writeDB(db);
    io.emit('matchUpdate', db.matchState);
  });

  socket.on('resetScores', ({ adminKey } = {}) => {
    if (ADMIN_KEY && adminKey !== ADMIN_KEY) return;
    db = readDB();
    db.matchState.p1.score = 0;
    db.matchState.p2.score = 0;
    db.matchState.lastUpdated = Date.now();
    writeDB(db);
    io.emit('matchUpdate', db.matchState);
  });

  socket.on('botCommand', (payload) => {
    if (!payload || typeof payload.text !== 'string') return;
    const isMod = Boolean(payload.isMod);
    if (ADMIN_KEY && isMod && payload.adminKey !== ADMIN_KEY) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    const result = handleBot({
      login: String(payload.login || payload.display || "anon").toLowerCase(),
      display: String(payload.display || payload.login || "anon"),
      isMod
    }, payload.text);
    socket.emit('botReply', { reply: result.reply });
  });

  socket.on('nowPlayingPush', (payload) => {
    if (ADMIN_KEY && payload && payload.adminKey !== ADMIN_KEY) return;
    const track = normalizeTrack(payload || {});
    if (!track) return;
    db = readDB();
    db.nowPlaying = track;
    writeDB(db);
    io.emit('nowPlaying', track);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

startTwitchBot({
  runChat: (actor, text) => handleBot(actor, text)
});

server.listen(PORT, () => {
  console.log(`FGC Tournament Webapp (LOY Software) running on port ${PORT}`);
  console.log(`  Public URL base: ${PUBLIC_URL || '(local)'}`);
  console.log(`  Overlay:     ${PUBLIC_URL || 'http://localhost:' + PORT}/overlay`);
  console.log(`  Now Playing: ${PUBLIC_URL || 'http://localhost:' + PORT}/nowplaying`);
  console.log(`  Offstream:   ${PUBLIC_URL || 'http://localhost:' + PORT}/offstream`);
  console.log(`  Admin:       ${PUBLIC_URL || 'http://localhost:' + PORT}/admin`);
  console.log(`  Signup:      ${PUBLIC_URL || 'http://localhost:' + PORT}/signup`);
  if (ADMIN_KEY) console.log('  Admin key protection: ENABLED');
  else console.log('  Admin key protection: OFF (set ADMIN_KEY env to enable)');
});
