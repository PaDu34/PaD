const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const gbankFile = __dirname + "/gbank_balance.json";

if (!fs.existsSync(gbankFile)) {
  fs.writeFileSync(gbankFile, JSON.stringify({}, null, 2));
}

function getBalance(userID) {
  const data = JSON.parse(fs.readFileSync(gbankFile));
  if (data[userID]?.balance != null) return data[userID].balance;
  return 500; // Starting money
}

function setBalance(userID, amount) {
  const data = JSON.parse(fs.readFileSync(gbankFile));
  data[userID] = { balance: amount };
  fs.writeFileSync(gbankFile, JSON.stringify(data, null, 2));
}

function formatMoney(num) {
  if (num >= 1e12) return (num / 1e12).toFixed(1) + "T$";
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B$";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M$";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k$";
  return num + "$";
}

module.exports.config = {
  name: "gbank",
  aliases: ["gcard","g-wallet"],
  version: "1.0",
  author: "ChatGPT + Akash",
  countDown: 5,
  role: 0,
  shortDescription: "Premium Game Bank Card",
  category: "game",
  guide: "{p}gbank"
};

module.exports.onStart = async function ({ api, event, usersData }) {
  const { threadID, senderID, messageID } = event;

  try {
    const balance = getBalance(senderID);
    const userName = await usersData.getName(senderID);
    const money = formatMoney(balance);

    // Avatar
    const avatarURL =
      `https://graph.facebook.com/${senderID}/picture?height=512&width=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    let avatarImage;
    try {
      const res = await axios({ url: avatarURL, responseType: "arraybuffer" });
      avatarImage = await loadImage(res.data);
    } catch (err) {
      avatarImage = null;
    }

    // Canvas
    const width = 900;
    const height = 550;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0b0f22");
    gradient.addColorStop(0.4, "#141a33");
    gradient.addColorStop(1, "#0d1428");

    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, width, height, 40, true);

    // Neon Border
    ctx.strokeStyle = "#00eaff";
    ctx.lineWidth = 6;
    roundRect(ctx, 4, 4, width - 8, height - 8, 35, false, true);

    // Middle Glass Layer
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    roundRect(ctx, 30, 30, width - 60, height - 60, 30, true);

    // Avatar
    if (avatarImage) {
      const size = 140;
      const x = width - size - 60;
      const y = 60;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImage, x, y, size, size);
      ctx.restore();

      // Neon Ring
      ctx.strokeStyle = "#00f2ff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bank Name
    ctx.font = 'bold 50px "Segoe UI"';
    ctx.fillStyle = "#00eaff";
    ctx.fillText("G•BANK PREMIUM", 50, 120);

    // Card Holder
    ctx.font = 'bold 32px "Segoe UI"';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(userName.toUpperCase(), 50, 220);

    // Money Section Box
    ctx.fillStyle = "rgba(0, 255, 255, 0.12)";
    roundRect(ctx, 50, 260, width - 100, 220, 25, true);

    ctx.font = 'bold 32px "Segoe UI"';
    ctx.fillStyle = "#00eaff";
    ctx.fillText("AVAILABLE BALANCE", 70, 310);

    ctx.font = 'bold 80px "Segoe UI"';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(money, 70, 400);

    // Chip Design
    drawChip(ctx, 50, 430);

    // Save File
    const buffer = canvas.toBuffer("image/png");
    const filePath = path.join(__dirname, "cache", `gbank_${senderID}.png`);

    if (!fs.existsSync(path.join(__dirname, "cache"))) {
      fs.mkdirSync(path.join(__dirname, "cache"));
    }

    fs.writeFileSync(filePath, buffer);

    await api.sendMessage({
      body: "",
      attachment: fs.createReadStream(filePath)
    }, threadID, messageID);

    setTimeout(() => fs.unlinkSync(filePath), 10000);

  } catch (err) {
    console.log(err);
    api.sendMessage("❌ Error generating GBank card!", threadID, messageID);
  }
};

// Rounded Rectangle
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

// Chip Design
function drawChip(ctx, x, y) {
  ctx.fillStyle = "#f4d03f";
  roundRect(ctx, x, y, 100, 70, 10, true);

  ctx.fillStyle = "#b7950b";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 20 + i * 25, y + 10, 15, 15);
    ctx.fillRect(x + 20 + i * 25, y + 30, 15, 15);
    ctx.fillRect(x + 20 + i * 25, y + 50, 15, 15);
  }
}
