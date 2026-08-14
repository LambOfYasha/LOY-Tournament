/**
 * Optional Twitch chat bridge.
 * Enable with TWITCH_CHANNEL + TWITCH_OAUTH (oauth:xxxx) in env.
 * Mods can run pairing / force-result. Signed-up players run !checkin / !report / !confirm.
 */
function startTwitchBot({ runChat }) {
  const channel = (process.env.TWITCH_CHANNEL || "").replace(/^#/, "").toLowerCase();
  const oauth = process.env.TWITCH_OAUTH || "";
  const username = process.env.TWITCH_BOT_NICK || "pandabot";
  if (!channel || !oauth) {
    console.log("  Twitch bot: OFF (set TWITCH_CHANNEL + TWITCH_OAUTH to enable)");
    return null;
  }

  let tmi;
  try {
    tmi = require("tmi.js");
  } catch (err) {
    console.warn("  Twitch bot: tmi.js not installed — run `npm i tmi.js`");
    return null;
  }

  const client = new tmi.Client({
    options: { debug: false },
    identity: { username, password: oauth },
    channels: [channel],
  });

  client.on("message", (chan, tags, message, self) => {
    if (self || !message.startsWith("!")) return;
    const login = String(tags.username || "").toLowerCase();
    const display = tags["display-name"] || tags.username || login;
    const isMod = Boolean(tags.mod) || tags.badges?.broadcaster === "1" || login === channel;
    const result = runChat({ login, display, isMod }, message);
    if (result && result.reply) {
      const first = String(result.reply).split("\n")[0];
      client.say(chan, first).catch(() => {});
    }
  });

  client.connect()
    .then(() => console.log(`  Twitch bot: connected as ${username} in #${channel}`))
    .catch((err) => console.error("  Twitch bot failed:", err.message));

  return client;
}

module.exports = { startTwitchBot };
