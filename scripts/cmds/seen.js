const fs = require("fs");
const path = require("path");

const statusFile = path.join(__dirname, "seenStatus.json");

// helper function
function getStatus() {
    if (!fs.existsSync(statusFile)) return false;
    try {
        const data = JSON.parse(fs.readFileSync(statusFile));
        return data.enabled;
    } catch {
        return false;
    }
}

function setStatus(value) {
    fs.writeFileSync(statusFile, JSON.stringify({ enabled: value }));
}

module.exports = {
    config: {
        name: "seen",
        author: "Custom",
        version: "1.0",
        cooldown: 5,
        role: 0,
        shortDescription: {
            en: "Turn auto seen on/off"
        },
        longDescription: {
            en: "Enable or disable auto seen for all incoming messages."
        },
        category: "utility",
        guide: {
            en: "{pn} on / off"
        }
    },

    onStart: async function ({ message, args }) {
        if (args[0] === "on") {
            setStatus(true);
            return message.reply("✅ Auto seen turned ON.");
        } else if (args[0] === "off") {
            setStatus(false);
            return message.reply("❌ Auto seen turned OFF.");
        } else {
            return message.reply("Usage: seen on / seen off");
        }
    },

    // এইটা event–এ run হবে
    onChat: async function ({ api, event }) {
        if (getStatus()) {
            api.markAsReadAll(() => {});
        }
    }
};
