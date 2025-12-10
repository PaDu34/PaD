const fs = require("fs");
const path = require("path");

// ==== GBank Functions ======
const gbankFile = path.join(__dirname, "gbank_balance.json");

if (!fs.existsSync(gbankFile)) {
  fs.writeFileSync(gbankFile, JSON.stringify({}, null, 2));
}

function loadBank() {
  return JSON.parse(fs.readFileSync(gbankFile));
}
function saveBank(data) {
  fs.writeFileSync(gbankFile, JSON.stringify(data, null, 2));
}

function ensureUser(uid) {
  const db = loadBank();
  if (!db[uid]) db[uid] = { balance: 500 };
  saveBank(db);
}

function getMoney(uid) {
  const db = loadBank();
  return db[uid]?.balance || 0;
}

function addMoney(uid, amt) {
  const db = loadBank();
  if (!db[uid]) db[uid] = { balance: 500 };
  db[uid].balance += amt;
  saveBank(db);
}

function removeMoney(uid, amt) {
  const db = loadBank();
  if (!db[uid]) db[uid] = { balance: 500 };
  db[uid].balance -= amt;
  saveBank(db);
}

// ==============================
// CONFIG
// ==============================
module.exports.config = {
  name: "crash",
  aliases: ["plane"],
  version: "3.0",
  author: "ChatGPT",
  shortDescription: "Multiplayer crash game",
  category: "game"
};

const sessions = {};

function generateCrashPoint() {
  const r = Math.random();

  if (r < 0.40) return 1.0 + Math.random() * 1.0;
  if (r < 0.70) return 2.0 + Math.random() * 3.0;
  if (r < 0.90) return 5.0 + Math.random() * 15.0;
  if (r < 0.97) return 20 + Math.random() * 30;
  return 50 + Math.random() * 50;
}

// ==============================
// START COMMAND
// ==============================

module.exports.onStart = async function ({ api, event }) {

  const threadID = event.threadID;

  if (sessions[threadID])
    return api.sendMessage("⚠️ A crash round is already running.", threadID);

  sessions[threadID] = {
    players: {},
    crashPoint: generateCrashPoint(),
    active: false,
    multiplier: 1.00
  };

  api.sendMessage(
    "✈️ **Multiplayer Crash Started!**\n" +
    "⏳ You have **5 seconds** to join.\n" +
    "💬 Just send your **bet amount** (number only).\n\n" +
    "👉 Game will start automatically.",
    threadID
  );

  setTimeout(() => startGame(api, threadID), 5000);
};

// ==============================
// PLAYER BET JOIN
// ==============================

module.exports.onChat = async function ({ api, event }) {
  const msg = event.body.trim().toLowerCase();
  const threadID = event.threadID;
  const uid = event.senderID;

  const game = sessions[threadID];
  if (!game) return;

  if (msg === "r") return forceCrash(api, threadID);

  if (msg === "c") return handleCashout(api, event);

  if (!game.active) {
    const bet = parseInt(event.body.trim());
    if (!bet || bet <= 0) return;

    ensureUser(uid);

    if (getMoney(uid) < bet)
      return api.sendMessage("❌ Not enough balance.", threadID);

    game.players[uid] = {
      bet: bet,
      cashed: false,
      cashAmount: 0
    };

    removeMoney(uid, bet);

    return api.sendMessage(`🟢 Bet accepted: ${bet}$`, threadID);
  }
};

// ==============================
// START MULTIPLIER LOOP
// ==============================

function startGame(api, threadID) {
  const game = sessions[threadID];
  if (!game) return;

  if (Object.keys(game.players).length === 0) {
    delete sessions[threadID];
    return api.sendMessage("❌ No players joined.", threadID);
  }

  game.active = true;

  api.sendMessage(
    "🚀 **Plane is taking off!**\n" +
    "📈 Type **C** anytime to cashout.\n" +
    "💥 Type **R** to reveal crash instantly.",
    threadID
  );

  const loop = () => {
    if (!sessions[threadID]) return;

    game.multiplier += 0.10 + Math.random() * 0.10;

    api.sendMessage(`📈 ${game.multiplier.toFixed(2)}x`, threadID);

    if (game.multiplier >= game.crashPoint)
      return crashPlane(api, threadID);

    setTimeout(loop, 900);
  };

  setTimeout(loop, 900);
}

// ==============================
// CASHOUT
// ==============================

function handleCashout(api, event) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const game = sessions[threadID];
  if (!game || !game.active) return;

  const p = game.players[uid];
  if (!p) return api.sendMessage("❗ You didn't join this round.", threadID);

  if (p.cashed) return api.sendMessage("❗ Already cashed out.", threadID);

  p.cashed = true;
  p.cashAmount = Math.floor(p.bet * game.multiplier);

  addMoney(uid, p.cashAmount);

  api.sendMessage(
    `✅ CASHOUT!\n📈 ${game.multiplier.toFixed(2)}x\n💸 Won: ${p.cashAmount}$`,
    threadID
  );
}

// ==============================
// NORMAL CRASH  (NAME FIX APPLIED)
// ==============================

async function crashPlane(api, threadID) {
  const game = sessions[threadID];
  if (!game) return;

  let msg = `💥 **Plane crashed at ${game.multiplier.toFixed(2)}x!**\n\n`;
  msg += "📊 **Result Board**:\n";

  const userInfo = await api.getUserInfo(Object.keys(game.players));

  for (const uid in game.players) {
    const p = game.players[uid];
    const name = userInfo[uid]?.name || uid;

    msg += p.cashed
      ? `🟢 ${name}: Won ${p.cashAmount}$\n`
      : `🔴 ${name}: Lost ${p.bet}$\n`;
  }

  api.sendMessage(msg, threadID);

  delete sessions[threadID];
}

// ==============================
// INSTANT CRASH (R command)
// ==============================

function forceCrash(api, threadID) {
  const game = sessions[threadID];
  if (!game) return;

  api.sendMessage(
    `⚠️ Forced crash activated!\n💥 Crash point was: ${game.crashPoint.toFixed(2)}x`,
    threadID
  );

  game.multiplier = game.crashPoint;
  crashPlane(api, threadID);
}
