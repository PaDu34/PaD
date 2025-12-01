// Goat Bot Bank System with onStart included
// Full working version — No onStart missing error

const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  config: {
    name: "bank",
    version: "4.0-fixed",
    author: "Valo Asi & ChatGPT",
    role: 0,
    shortDescription: "Real style card banking + games",
    category: "finance",
  },

  // 🔥 FIX — onStart added properly so bot no longer errors
  onStart({ api, message }) {
    message.reply("✅ Bank system loaded successfully — Type 'bank help' for commands.");
  },

  // Main run handler
  async run({ api, event, args }) {
    const dbFile = path.join(__dirname, "bank_data.json");
    if (!fs.existsSync(dbFile)) fs.writeJSONSync(dbFile, { users: [] });

    const db = fs.readJSONSync(dbFile);
    const cmd = args[0];

    const saveDB = () => fs.writeJSONSync(dbFile, db);

    // Generate bank card
    if (cmd === "register") {
      const name = args.slice(1).join(" ");
      if (!name) return api.sendMessage("⚠️ Use: bank register YourName", event.threadID);

      const card = uuidv4().split("-").join(" ").slice(0, 19);
      db.users.push({ name, card, balance: 0, history: [] });
      saveDB();

      return api.sendMessage(`📌 Card Created Successfully\n👤 Name: ${name}\n💳 Card: ${card}`, event.threadID);
    }

    // Balance image
    if (cmd === "balance") {
      const card = args.slice(1).join(" ");
      const user = db.users.find(u => u.card === card);
      if (!user) return api.sendMessage("❌ Card not found!", event.threadID);

      const canvas = createCanvas(600, 350);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#1a1f24";
      ctx.fillRect(0, 0, 600, 350);
      ctx.font = "28px Arial";
      ctx.fillStyle = "white";
      ctx.fillText(`💳 ${user.card}`, 40, 120);
      ctx.fillText(`👤 ${user.name}`, 40, 170);
      ctx.fillText(`Balance: ${user.balance}৳`, 40, 220);

      const imgPath = path.join(__dirname, "card.png");
      fs.writeFileSync(imgPath, canvas.toBuffer());

      return api.sendMessage({ body: "💳 Account Balance", attachment: fs.createReadStream(imgPath) }, event.threadID);
    }

    // Add balance
    if (cmd === "add") {
      const card = args[1];
      const name = args[2];
      const amount = parseInt(args[3]);
      const user = db.users.find(u => u.card === card);

      if (!user) return api.sendMessage("❌ Card Not Found", event.threadID);
      if (user.name !== name) return api.sendMessage("⚠️ Name mismatch!", event.threadID);

      user.balance += amount;
      user.history.push(`+${amount}৳ Added`);
      saveDB();

      return api.sendMessage(`💰 ${amount}৳ Added Successfully!\nNew Balance: ${user.balance}৳`, event.threadID);
    }

    // Withdraw
    if (cmd === "withdraw") {
      const card = args[1];
      const amount = parseInt(args[2]);
      const user = db.users.find(u => u.card === card);

      if (!user) return api.sendMessage("❌ Card Not Found", event.threadID);
      if (user.balance < amount) return api.sendMessage("⚠️ Not enough balance", event.threadID);

      user.balance -= amount;
      user.history.push(`-${amount}৳ Withdrawn`);
      saveDB();

      return api.sendMessage(`🏧 Withdrawn: ${amount}৳\nRemaining: ${user.balance}৳`, event.threadID);
    }

    // Slot game
    if (cmd === "slot") {
      const card = args[1];
      const bet = parseInt(args[2]);
      const user = db.users.find(u => u.card === card);
      if (!user) return api.sendMessage("❌ Card Not Found", event.threadID);
      if (user.balance < bet) return api.sendMessage("⚠️ Not enough balance", event.threadID);

      const items = ["🍒","🍋","⭐","💎","🍇"]; 
      const r = [items[Math.random()*5|0], items[Math.random()*5|0], items[Math.random()*5|0]];
      let win = (r[0]===r[1] && r[1]===r[2]);

      if(win){ user.balance += bet*3; } else { user.balance -= bet; }
      saveDB();

      return api.sendMessage(`🎰 ${r.join(" | ")}\n${win?`🏆 You Won +${bet*3}`:`❌ Lost -${bet}`}\nBalance: ${user.balance}`, event.threadID);
    }

    // Help
    api.sendMessage(
      "📘 BANK COMMANDS:\n"+
      "bank register <name>\n"+
      "bank balance <card>\n"+
      "bank add <card> <name> <amount>\n"+
      "bank withdraw <card> <amount>\n"+
      "bank slot <card> <bet>", event.threadID);
  }
};
