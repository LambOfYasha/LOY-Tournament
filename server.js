const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Production-ready CORS + Socket.io
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.BASE_URL || '';
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  },
  // Allow path-based deployment if needed later
  path: process.env.SOCKET_PATH || "/socket.io"
});

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || ""; // optional; if set, protect /admin and mutating routes
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
  ]
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

// Simple optional admin key middleware
function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) return next(); // open if no key configured
  const key = req.query.key || req.headers['x-admin-key'] || (req.body && req.body.adminKey);
  if (key === ADMIN_KEY) return next();
  return res.status(401).json({ success: false, error: "Unauthorized – provide valid admin key" });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.get('/admin', (req, res) => {
  // Page itself is public; mutations are protected
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay.html'));
});

// Public API
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

app.post('/api/signup', (req, res) => {
  db = readDB();
  const { playerTag, whatsapp, region, characterMain, platform, notes } = req.body || {};

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
    registeredAt: new Date().toISOString()
  };

  db.signups.push(signup);
  writeDB(db);
  io.emit('signupsUpdate', db.signups);
  res.json({ success: true, id: signup.id, signup });
});

// Protected mutating routes
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
  res.json({ success: true });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  db = readDB();
  socket.emit('matchUpdate', db.matchState);
  socket.emit('signupsUpdate', db.signups);

  socket.on('requestState', () => {
    db = readDB();
    socket.emit('matchUpdate', db.matchState);
    socket.emit('signupsUpdate', db.signups);
  });

  socket.on('adminUpdateMatch', (payload) => {
    // Optional key check via payload.adminKey if ADMIN_KEY is set
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
    delete newState.adminKey; // don't store the key
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

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`FGC Tournament Webapp (LOY Software) running on port ${PORT}`);
  console.log(`  Public URL base: ${PUBLIC_URL || '(local)'}`);
  console.log(`  Overlay:  ${PUBLIC_URL || 'http://localhost:' + PORT}/overlay`);
  console.log(`  Admin:    ${PUBLIC_URL || 'http://localhost:' + PORT}/admin`);
  console.log(`  Signup:   ${PUBLIC_URL || 'http://localhost:' + PORT}/signup`);
  if (ADMIN_KEY) console.log('  Admin key protection: ENABLED');
  else console.log('  Admin key protection: OFF (set ADMIN_KEY env to enable)');
});
