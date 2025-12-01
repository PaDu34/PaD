const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const dbPath = path.join(__dirname, "bankDB.json");
const cacheFile = path.join(__dirname, "lastCheck.json");

if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}), "utf8");
if (!fs.existsSync(cacheFile)) fs.writeFileSync(cacheFile, JSON.stringify({}), "utf8");

function loadDB() { return JSON.parse(fs.readFileSync(dbPath, "utf8")); }
function saveDB(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8"); }

function lastCheckLoad() { return JSON.parse(fs.readFileSync(cacheFile, "utf8")); }
function lastCheckSave(data) { fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), "utf8"); }

module.exports = {
  config: {
    name: "bank",
    version: "4.0",
    author: "Valo Asi",
    category: "finance",
    shortDescription: "Full Bank System | PIN | Withdraw | Transfer"
  },

  run: async ({ api, event, args }) => {

    const db = loadDB();
    const cid = event.senderID;
    const lastCheck = lastCheckLoad();
    const cmd = args[0];

    if (!db[cid]) {
      db[cid] = { cardName:`User-${cid}`, balance:0, pin:null };
      saveDB(db);
    }

    // ---------- Create Card ----------
    if (cmd === "create") {
      const name = args.slice(1).join(" ");
      if (!name) return api.sendMessage("📌 /bank create Your Name", event.threadID);

      db[cid].cardName = name;
      saveDB(db);
      return api.sendMessage(`✔ Card Successfully Created!\nOwner: ${name}`, event.threadID);
    }


    // ---------- Set PIN ----------
    if (cmd === "setpin") {
      if (!args[1]) return api.sendMessage("🔐 Use: /bank setpin 1234", event.threadID);
      if (args[1].length !== 4) return api.sendMessage("❗ PIN অবশ্যই ৪ সংখ্যার হবে", event.threadID);

      db[cid].pin = args[1];
      saveDB(db);
      return api.sendMessage("🔐 PIN Successfully Set ✔", event.threadID);
    }


    // ---------- Unlock PIN ----------
    if (cmd === "unlock") {
      if (!db[cid].pin) return api.sendMessage("❗ PIN সেট করা নেই", event.threadID);
      if (args[1] !== db[cid].pin) return api.sendMessage("❌ Wrong PIN!", event.threadID);

      lastCheck[cid] = "UNLOCKED";
      lastCheckSave(lastCheck);
      return api.sendMessage("🔓 Bank Unlocked! এখন withdraw & transfer করতে পারবে", event.threadID);
    }


    // ---------- CHECK OTHER BALANCE ----------
    if (cmd === "check") {
      let name = args.slice(1).join(" ");
      if (!name) return api.sendMessage("📌 /bank check CardName", event.threadID);

      let uid = Object.keys(db).find(u => db[u].cardName.toLowerCase() === name.toLowerCase());
      if (!uid) return api.sendMessage(`❌ '${name}' নামে Card পাওয়া যায়নি`, event.threadID);

      lastCheck[cid] = uid;
      lastCheckSave(lastCheck);

      return api.sendMessage(
        `💳 Card Holder: ${db[uid].cardName}\n💰 Balance: ${db[uid].balance}৳\n\n➡ এখন শুধু বলো:\nadd 300\nতাহলেই 300৳ add হবে 🔥`,
        event.threadID
      );
    }


    // ---------- ADD MONEY (Auto after Check) ----------
    if (cmd === "add" || (!isNaN(args[0]) && lastCheck[cid])) {

      const amount = cmd==="add" ? parseInt(args[1]) : parseInt(args[0]);
      const targetID = lastCheck[cid];

      if (!targetID) return api.sendMessage("⚠ আগে /bank check দিতে হবে", event.threadID);
      if (isNaN(amount)) return api.sendMessage("❗ Amount number হওয়া লাগবে", event.threadID);

      db[targetID].balance += amount;
      saveDB(db);
      return api.sendMessage(`💰 ${amount}৳ Added to ${db[targetID].cardName} ✔`, event.threadID);
    }


    // ============ WITHDRAW SYSTEM ============
    if (cmd === "withdraw") {
      if (!lastCheck[cid] || lastCheck[cid] !== "UNLOCKED")
        return api.sendMessage("🔐 আগে /bank unlock PIN দাও", event.threadID);

      let amount = parseInt(args[1]);
      if (isNaN(amount)) return api.sendMessage("❗ Number দিতে হবে", event.threadID);
      if (db[cid].balance < amount) return api.sendMessage("❌ Balance কম", event.threadID);

      db[cid].balance -= amount;
      saveDB(db);

      return api.sendMessage(`🟡 Withdraw Successful\nAmount: ${amount}৳`, event.threadID);
    }


    // ============ TRANSFER SYSTEM ============
    if (cmd === "transfer") {

      if (!lastCheck[cid] || lastCheck[cid] !== "UNLOCKED")
        return api.sendMessage("🔐 আগে PIN unlock করো", event.threadID);

      let target = args[1];
      let amount = parseInt(args[2]);

      if (!target) return api.sendMessage("📌 use: /bank transfer CardName 500", event.threadID);
      if (isNaN(amount)) return api.sendMessage("❗ Number দিতে হবে", event.threadID);
      if (db[cid].balance < amount) return api.sendMessage("❌ Insufficient balance", event.threadID);

      let uid = Object.keys(db).find(u => db[u].cardName.toLowerCase() === target.toLowerCase());
      if (!uid) return api.sendMessage(`❌ '${target}' নামে Card নেই`, event.threadID);

      db[cid].balance -= amount;
      db[uid].balance += amount;
      saveDB(db);

      return api.sendMessage(`🔁 ${amount}৳ sent to ${db[uid].cardName} ✔`, event.threadID);
    }


    // ---------- CARD IMAGE BALANCE ----------
    if (cmd === "balance") {

      const card = db[cid];
      const width=900, height=520;
      const canvas=createCanvas(width,height);
      const c=canvas.getContext("2d");

      c.fillStyle="#001432"; c.fillRect(0,0,width,height);

      c.fillStyle="#fff"; c.font="bold 45px Sans";
      c.fillText("Messenger Bank Card",50,100);

      c.font="32px Sans";
      c.fillText(`Holder: ${card.cardName}`,50,200);

      c.font="60px Sans";
      c.fillText(`Balance: ${card.balance}৳`,50,330);

      const buffer=canvas.toBuffer("image/png");
      const img=`bank_${cid}.png`;
      fs.writeFileSync(img,buffer);
      return api.sendMessage({body:"💳 Your Bank Card",attachment:fs.createReadStream(img)},event.threadID);
    }


    api.sendMessage(
`📌  Main Commands

/bank create Name  
/bank balance  
/bank check Name  
add amount  
/bank setpin 1234  
/bank unlock pin  
/bank withdraw 200  
/bank transfer Name 300  

Now your Bank = Fully Real 🔥`,
event.threadID);
  }
};
