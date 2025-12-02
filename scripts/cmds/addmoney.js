const fs = require("fs-extra");

module.exports = {
  config: {
    name: "addmoney",
    shortDescription: "Add money"
  },

  run: async function ({ message, event, args }) {
    const amount = parseInt(args[0]);
    if (!amount) return message.reply("Amount daw!");

    if (amount > 5000) return message.reply("Max 5000 add kora jay");

    let dbPath = __dirname + "/bankDB.json";
    let db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};

    const userID = event.senderID;
    if (!db[userID]) db[userID] = { balance: 0 };
    db[userID].balance += amount;

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    message.reply(`💰 Added: ${amount} BDT\nNew Balance: ${db[userID].balance} BDT`);
  }
};
