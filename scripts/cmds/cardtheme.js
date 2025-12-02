const fs = require("fs-extra");

module.exports = {
  config: {
    name: "cardtheme",
    version: "6.0",
    author: "ChatGPT",
    countDown: 3,
    role: 0,
    shortDescription: "Set your ATM card theme (42+ themes)"
  },

  onStart: async function ({ message, event, args }) {
    let dbPath = __dirname + "/bankDB.json";
    let db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};

    const userID = event.senderID;
    const theme = args[0];

    const themes = [
      "blue","black","gold","neon","red","green","purple","pink","silver","white",
      "carbon","rainbow","fire","ice","ocean","galaxy","sunset","lava","cyberpunk",
      "metal","diamond","royalblue","holographic","platinum","bronze","sapphire",
      "ruby","emerald","diamondwhite","crystal","thunder","storm","candy","anime",
      "dragon","tiger","volcano","frost","toxic","chrome","pearl","aurora"
    ];

    const bgMap = {
      blue: "premium blue card",
      black: "matte black luxury card",
      gold: "royal gold shiny card",
      neon: "neon cyber glow card",
      red: "ferrari red glossy card",
      green: "emerald green premium card",
      purple: "royal purple luxury card",
      pink: "soft pink pastel card",
      silver: "metallic silver card",
      white: "white minimal premium card",
      carbon: "carbon fiber black card",
      rainbow: "rainbow glossy card",
      fire: "fire flame card",
      ice: "ice crystal blue card",
      ocean: "ocean water blue card",
      galaxy: "galaxy nebula card",
      sunset: "sunset gradient card",
      lava: "lava molten card",
      cyberpunk: "cyberpunk neon card",
      metal: "industrial metal card",
      diamond: "diamond shiny card",
      royalblue: "royal deep blue card",
      holographic: "holographic rainbow card",
      platinum: "platinum metallic card",
      bronze: "bronze matte card",
      sapphire: "sapphire gemstone card",
      ruby: "ruby gemstone card",
      emerald: "emerald gemstone card",
      diamondwhite: "diamond white sparkle card",
      crystal: "crystal clear card",
      thunder: "electric thunder card",
      storm: "storm cloudy card",
      candy: "candy gradient card",
      anime: "anime pastel card",
      dragon: "dragon scale card",
      tiger: "tiger stripe card",
      volcano: "volcano magma card",
      frost: "frost snow card",
      toxic: "toxic neon green card",
      chrome: "chrome mirror card",
      pearl: "pearl white card",
      aurora: "aurora lights card"
    };

    if (!theme || !themes.includes(theme)) {
      let list = themes.map(t => "• " + t).join("\n");
      return message.reply(
`🎨 Available Themes:
${list}

Use: cardtheme neon`
      );
    }

    if (!db[userID]) db[userID] = {};

    db[userID].theme = theme;
    db[userID].themeStyle = bgMap[theme];

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    message.reply(`✔ Theme updated to *${theme.toUpperCase()}*`);
  }
};
