const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "help2",
    aliases: ["allcmds", "commands"],
    version: "1.0",
    author: "Si Fat",
    shortDescription: "Show all available commands",
    category: "system"
  },

  onStart: async function ({ api, event }) {
    try {
      // detect cmd folder
      const folders = ["cmds", "cmd", "commands"];
      const commandFolder = folders.find(f => fs.existsSync(path.join(__dirname, "..", f)));

      if (!commandFolder)
        return api.sendMessage("❌ Command folder পাওয়া যায়নি!", event.threadID);

      const dir = path.join(__dirname, "..", commandFolder);
      const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
      if (!files.length)
        return api.sendMessage("⚠️ কোনো command পাওয়া যায়নি!", event.threadID);

      const list = [];
      for (const file of files) {
        try {
          const cmd = require(path.join(dir, file));
          const name = cmd?.config?.name || file.replace(".js", "");
          const desc = cmd?.config?.shortDescription || "No description";
          list.push(`🔹 ${name} — ${desc}`);
        } catch {
          list.push(`⚠️ ${file} — failed to load`);
        }
      }

      const prefix = (global.GoatBot?.config?.prefix) || "/";
      const message =
        `📜 All Commands (${list.length})\n\n${list.join("\n")}\n\n💡 Use: ${prefix}help [command name]`;

      return api.sendMessage(message, event.threadID);
    } catch (err) {
      console.error("Help2 Error:", err);
      return api.sendMessage("❌ Help2 চালাতে সমস্যা হয়েছে (console চেক করো)", event.threadID);
    }
  }
};
