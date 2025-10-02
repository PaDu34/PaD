const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "ownerinfo",
    author: "Tokodori",
    role: 0,
    shortDescription: "Show bot owner info",
    longDescription: "Display short & styled info about the bot owner",
    category: "admin",
    guide: "{pn}"
  },

  onStart: async function ({ api, event }) {
    try {
      const ownerInfo = {
        name: ' 𝐋𝐈𝐊𝐇𝐎𝐍 𝐗 𝐎𝐘𝐎𝐍',
        age: ' 𝟏𝟗 ',
        nick: '𝐍𝐀𝐑𝐔𝐓𝐎',
        gender: '🚹 𝐌𝐀𝐋𝐄',
        tag: '⌛ 𝐌𝐈𝐒𝐒𝐈𝐍𝐆 𝐃𝐄𝐀𝐑 🫠🎀'
      };

      const videoURL = 'https://files.catbox.moe/pxt38g';
      const tempPath = path.join(__dirname, 'tmp');
      if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath);

      const videoData = await axios.get(videoURL, { responseType: 'arraybuffer' });
      const videoPath = path.join(tempPath, 'owner.mp4');
      fs.writeFileSync(videoPath, Buffer.from(videoData.data, 'binary'));

      const msg = `
╭─────────────⭑
│ 🧸 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢
├─────────────
│ 🪪 𝗡𝗮𝗺𝗲   : ${ownerInfo.name}
│ 🎂 𝗔𝗴𝗲    : ${ownerInfo.age}
│ 🧿 𝗡𝗶𝗰𝗸   : ${ownerInfo.nick}
│ ⚧️ 𝗚𝗲𝗻𝗱𝗲𝗿 : ${ownerInfo.gender}
│ 🌀 𝗧𝗮𝗴    : ${ownerInfo.tag}
╰─────────────⭑

🌸 𝗠𝘆 𝗕𝗼𝘁, 𝗬𝗼𝘂𝗿 𝗖𝗼𝗺𝗳𝗼𝗿𝘁 💖
`;

      await api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(videoPath)
      }, event.threadID, event.messageID);

    } catch (e) {
      console.error("OWNER CMD ERR:", e);
      return api.sendMessage("⚠️ Something went wrong while fetching owner info.", event.threadID);
    }
  },
};
