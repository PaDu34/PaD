// balance.js
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const { MongoClient } = require("mongodb");

/**
 * REQUIRED:
 * Set environment variable MONGO_URI to your MongoDB connection string.
 * Example: mongodb+srv://user:pass@cluster0.mongodb.net/?retryWrites=true&w=majority
 */

const MONGO_URI = process.env.MONGO_URI || ""; // set this in Render env vars
const DB_NAME = process.env.DB_NAME || "goatbot";
const COLLECTION = process.env.COLLECTION || "balances";

if (!MONGO_URI) {
  console.error("MONGO_URI is not set. Please set environment variable MONGO_URI");
  // Do not crash — but DB ops will fail gracefully.
}

// Keep global client to reuse across hot-reloads
let mongoClient = global._mongoClient;
let db = global._mongoDb;

async function ensureDb() {
  if (db && mongoClient && mongoClient.topology && mongoClient.topology.isDestroyed !== true) return { mongoClient, db };
  if (!MONGO_URI) throw new Error("MONGO_URI not configured");

  mongoClient = new MongoClient(MONGO_URI, { maxPoolSize: 10 });
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  // save globally (helps with hot reload in some hosts)
  global._mongoClient = mongoClient;
  global._mongoDb = db;

  // ensure index on _id (user id) if not exists (mongodb creates _id by default)
  const col = db.collection(COLLECTION);
  await col.createIndex({ _id: 1 }, { unique: true });

  return { mongoClient, db };
}

// ----------------- Helpers -----------------
async function getUserDoc(userID) {
  try {
    await ensureDb();
    const col = db.collection(COLLECTION);
    const doc = await col.findOne({ _id: userID });
    if (!doc) {
      // create initial
      const initial = { _id: userID, balance: 100, lastClaim: null };
      await col.insertOne(initial);
      return initial;
    }
    return doc;
  } catch (e) {
    console.error("DB getUserDoc error:", e);
    // Fallback to in-memory default (non-persistent)
    return { _id: userID, balance: 100, lastClaim: null };
  }
}

async function setBalance(userID, newBalance) {
  try {
    await ensureDb();
    const col = db.collection(COLLECTION);
    await col.updateOne({ _id: userID }, { $set: { balance: newBalance } }, { upsert: true });
  } catch (e) {
    console.error("DB setBalance error:", e);
  }
}

async function updateLastClaim(userID, when = new Date()) {
  try {
    await ensureDb();
    const col = db.collection(COLLECTION);
    await col.updateOne({ _id: userID }, { $set: { lastClaim: when } }, { upsert: true });
  } catch (e) {
    console.error("DB updateLastClaim error:", e);
  }
}

function formatBalance(num) {
  if (num >= 1e12) return (num / 1e12).toFixed(1).replace(/\.0$/, '') + "T$";
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + "B$";
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + "M$";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + "k$";
  return num + "$";
}

function msToHrsMins(ms) {
  if (ms <= 0) return "0h 0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ----------------- Exported Command -----------------
module.exports.config = {
  name: "balance",
  aliases: ["bal"],
  version: "3.0",
  author: "MOHAMMAD AKASH + MIGRATED",
  countDown: 5,
  role: 0,
  shortDescription: "Balance card with MongoDB persistence",
  category: "game",
  guide: {
    en: "{p}balance\n{p}balance claim\n{p}balance transfer @mention <amount>"
  }
};

module.exports.onStart = async function ({ api, event, args, usersData }) {
  const { threadID, senderID, messageID, mentions } = event;

  try {
    // --- TRANSFER ---
    if (args[0] && args[0].toLowerCase() === "transfer") {
      if (!mentions || Object.keys(mentions).length === 0) {
        return api.sendMessage("Please mention someone to transfer to.", threadID, messageID);
      }
      const targetID = Object.keys(mentions)[0];
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return api.sendMessage("Invalid amount.", threadID, messageID);

      const senderDoc = await getUserDoc(senderID);
      if ((senderDoc.balance || 0) < amount) return api.sendMessage("Not enough balance.", threadID, messageID);

      const receiverDoc = await getUserDoc(targetID);
      await setBalance(senderID, (senderDoc.balance || 0) - amount);
      await setBalance(targetID, (receiverDoc.balance || 0) + amount);

      const senderName = await usersData.getName(senderID);
      const receiverName = await usersData.getName(targetID);

      return api.sendMessage(
        `✅ Transfer Successful!\n${senderName} → ${receiverName}: ${formatBalance(amount)}\nYour balance: ${formatBalance((senderDoc.balance || 0) - amount)}`,
        threadID, messageID
      );
    }

    // --- CLAIM ---
    if (args[0] && args[0].toLowerCase() === "claim") {
      const doc = await getUserDoc(senderID);
      const last = doc.lastClaim ? new Date(doc.lastClaim) : null;
      const now = new Date();
      const DAY = 24 * 3600 * 1000;
      if (!last || (now - last) >= DAY) {
        // give 100
        const newBal = (doc.balance || 0) + 100;
        await setBalance(senderID, newBal);
        await updateLastClaim(senderID, now);
        return api.sendMessage(`🎉 You claimed 100$ daily reward.\nCurrent balance: ${formatBalance(newBal)}`, threadID, messageID);
      } else {
        const left = DAY - (now - last);
        return api.sendMessage(`⛔ Already claimed today. Next claim in ${msToHrsMins(left)}.`, threadID, messageID);
      }
    }

    // --- SHOW BALANCE CARD ---
    const doc = await getUserDoc(senderID);
    const balance = doc.balance || 0;
    const formatted = formatBalance(balance);
    const userName = await usersData.getName(senderID);

    // Attempt to fetch avatar (best-effort)
    let avatar = null;
    const picUrl = `https://graph.facebook.com/${senderID}/picture?height=500&width=500`;
    try {
      const res = await axios({ url: picUrl, responseType: "arraybuffer", timeout: 5000 });
      avatar = await loadImage(res.data);
    } catch (e) {
      // ignore if avatar fail
    }

    // Build canvas card (same idea as before)
    const width = 850, height = 540;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f0c29'); grad.addColorStop(0.5, '#302b63'); grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad; roundRect(ctx, 0, 0, width, height, 35, true);

    // Glass overlay
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(ctx, 20, 20, width - 40, height - 40, 30, true);

    // Avatar
    if (avatar) {
      const size = 130;
      const x = width - size - 60;
      const y = 50;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size/2, 0, Math.PI*2);
      ctx.clip();
      ctx.drawImage(avatar, x, y, size, size);
      ctx.restore();

      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/2 + 3, 0, Math.PI*2); ctx.stroke();
    }

    ctx.font = 'bold 40px "Segoe UI"'; ctx.fillStyle = '#00d4ff';
    ctx.fillText('GOAT BANK', 60, 100);

    ctx.font = '28px "Segoe UI"'; ctx.fillStyle = '#ffffff';
    ctx.fillText(userName.toUpperCase(), 60, 180);

    ctx.font = 'bold 56px "Segoe UI"'; ctx.fillStyle = '#ffffff';
    ctx.fillText(formatted, 60, 260);

    // Save to cache and send
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(__dirname, 'cache', `balance_${senderID}.png`);
    if (!fs.existsSync(path.join(__dirname, 'cache'))) fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    await api.sendMessage({ body: "", attachment: fs.createReadStream(filePath) }, threadID, messageID);

    // cleanup after short delay
    setTimeout(() => { try { fs.unlinkSync(filePath); } catch (e) {} }, 8 * 1000);

  } catch (err) {
    console.error("balance command error:", err);
    return api.sendMessage("Error processing balance command. Check bot logs.", event.threadID, event.messageID);
  }
};

// ---------- small helper ----------
function roundRect(ctx, x, y, w, h, r, fill = false, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
