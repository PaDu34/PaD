const cron = require("node-cron");

module.exports = {
  config: {
    name: "ad",
    version: "1.0.0",
    author: "Hudaik",
    countDown: 5,
    role: 2,
    shortDescription: "Auto message every 15 minutes",
    longDescription: "Send an auto message every 15 minutes in the group",
    category: "system",
    guide: {
      en: "{pn} start | stop"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;

    if (!global.adJobs) global.adJobs = {};
    if (args[0] === "start") {
      if (global.adJobs[threadID])
        return api.sendMessage("🚫 Auto message already running!", threadID);

      // প্রতি 15 মিনিটে একবার পাঠাবে
      const job = cron.schedule("*/15 * * * *", () => {
        api.sendMessage("🗑️ Delete video/pic", threadID);
      });

      global.adJobs[threadID] = job;
      api.sendMessage("✅ Auto message started! Every 15 minutes I’ll send a reminder.", threadID);
    } 
    else if (args[0] === "stop") {
      if (global.adJobs[threadID]) {
        global.adJobs[threadID].stop();
        delete global.adJobs[threadID];
        api.sendMessage("🛑 Auto message stopped.", threadID);
      } else {
        api.sendMessage("⚠️ No auto message running.", threadID);
      }
    } 
    else {
      api.sendMessage("🔹 Use: ad start / ad stop", threadID);
    }
  }
};
