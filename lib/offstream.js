const { v4: uuidv4 } = require("uuid");

const HELP = [
  "!checkin — check in after signup (required for offstream)",
  "!offstream @p1 @p2 — mod opens an offstream match",
  "!report 2-1 — player submits end-of-match score (yours first)",
  "!confirm — opponent locks the result",
  "!dispute — opponent rejects the report",
  "!result @p1 2 @p2 1 — mod force-records a score",
  "!cancel — mod voids the open offstream match",
].join("\n");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function parseCommand(raw) {
  const text = String(raw || "").trim();
  if (!text.startsWith("!")) return null;
  const parts = text.slice(1).split(/\s+/).filter(Boolean);
  const name = (parts.shift() || "").toLowerCase();
  if (!name) return null;
  return { name, args: parts };
}

function parseScorePair(args) {
  const joined = (args || []).join(" ");
  const m = joined.match(/(\d+)\s*[-:xto]\s*(\d+)/i) || joined.match(/^(\d+)\s+(\d+)$/);
  if (!m) return null;
  return { a: Number(m[1]), b: Number(m[2]) };
}

function isValidSeriesScore(bestOf, win, lose) {
  const firstTo = Math.ceil(Number(bestOf) / 2);
  return win >= firstTo && lose < firstTo && lose >= 0 && win > lose;
}

function findPlayer(signups, name) {
  const n = normalizeName(name);
  return (signups || []).find((s) => {
    return (
      normalizeName(s.playerTag) === n ||
      normalizeName(s.twitch) === n ||
      s.id === name
    );
  });
}

function playerOfActor(signups, actor) {
  return findPlayer(signups, actor.login) || findPlayer(signups, actor.display);
}

function ensureOffstream(db) {
  db.offstream = db.offstream || { match: null, results: [], chat: [] };
  db.offstream.results = Array.isArray(db.offstream.results) ? db.offstream.results : [];
  db.offstream.chat = Array.isArray(db.offstream.chat) ? db.offstream.chat : [];
  (db.signups || []).forEach((s) => {
    if (typeof s.checkedIn !== "boolean") s.checkedIn = false;
    if (!s.checkedInAt) s.checkedInAt = null;
    if (!s.twitch) s.twitch = normalizeName(s.playerTag);
  });
  return db.offstream;
}

function line(user, role, text) {
  return {
    id: uuidv4(),
    user,
    role,
    text,
    at: new Date().toISOString(),
  };
}

function newMatch(p1Id, p2Id, bestOf) {
  return {
    id: uuidv4(),
    p1Id,
    p2Id,
    bestOf: Number(bestOf) || 3,
    status: "awaiting_report",
    report: null,
    result: null,
    createdAt: new Date().toISOString(),
  };
}

function otherId(match, id) {
  return match.p1Id === id ? match.p2Id : match.p1Id;
}

function inMatch(match, id) {
  return match && (match.p1Id === id || match.p2Id === id);
}

function snapshot(db) {
  const off = ensureOffstream(db);
  return {
    match: off.match,
    results: off.results.slice(0, 24),
    chat: off.chat.slice(-80),
    signups: db.signups,
    bestOf: db.matchState?.bestOf || 3,
  };
}

function runCommand(db, actor, raw) {
  const off = ensureOffstream(db);
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { reply: "", snapshot: snapshot(db), overlay: null };

  const incoming = line(actor.display || actor.login, actor.isMod ? "mod" : "player", trimmed);
  off.chat = [...off.chat, incoming].slice(-80);

  const reply = (text) => {
    off.chat = [...off.chat, line("PandaBot", "bot", text)].slice(-80);
    return { reply: text, snapshot: snapshot(db), overlay: null };
  };

  const cmd = parseCommand(trimmed);
  if (!cmd) return reply("Commands start with ! — try !help");
  if (cmd.name === "help") return reply(HELP);

  const asPlayer = playerOfActor(db.signups, actor);

  if (cmd.name === "checkin") {
    if (!asPlayer) return reply(`${actor.display} is not on the signup list. Sign up first.`);
    asPlayer.checkedIn = true;
    asPlayer.checkedInAt = new Date().toISOString();
    asPlayer.twitch = asPlayer.twitch || normalizeName(asPlayer.playerTag);
    return reply(`${asPlayer.playerTag} is checked in. Waiting for an offstream pairing.`);
  }

  if (cmd.name === "checkout") {
    if (!asPlayer) return reply("You are not signed up.");
    asPlayer.checkedIn = false;
    asPlayer.checkedInAt = null;
    return reply(`${asPlayer.playerTag} left the offstream queue.`);
  }

  if (cmd.name === "offstream") {
    if (!actor.isMod) return reply("Only mods can open an offstream match.");
    const a = findPlayer(db.signups, cmd.args[0] || "");
    const b = findPlayer(db.signups, cmd.args[1] || "");
    if (!a || !b) return reply("Usage: !offstream @player1 @player2 (both must be signed up).");
    if (a.id === b.id) return reply("Pick two different players.");
    if (!a.checkedIn || !b.checkedIn) {
      return reply(
        `Both players must !checkin first. ${a.playerTag}: ${a.checkedIn ? "in" : "not in"} · ${b.playerTag}: ${b.checkedIn ? "in" : "not in"}.`
      );
    }
    if (off.match && off.match.status !== "complete") {
      return reply("An offstream match is already open. !cancel it first.");
    }
    off.match = newMatch(a.id, b.id, db.matchState?.bestOf || 3);
    return reply(
      `Offstream set locked: ${a.playerTag} vs ${b.playerTag} (Bo${off.match.bestOf}). Play the set, then one player !report 2-1 — the other !confirm.`
    );
  }

  if (cmd.name === "cancel") {
    if (!actor.isMod) return reply("Only mods can cancel.");
    if (!off.match) return reply("No open offstream match.");
    off.match = null;
    return reply("Offstream match cancelled.");
  }

  if (cmd.name === "report") {
    if (!asPlayer) return reply("You must be a signed-up player to report.");
    const match = off.match;
    if (!match || match.status === "complete") {
      return reply("No open offstream match. A mod starts one with !offstream @p1 @p2 after both !checkin.");
    }
    if (!inMatch(match, asPlayer.id)) return reply("You are not in the current offstream set.");
    const pair = parseScorePair(cmd.args);
    if (!pair) return reply("Usage: !report 2-1  (your games first, opponent second).");
    if (!isValidSeriesScore(match.bestOf, Math.max(pair.a, pair.b), Math.min(pair.a, pair.b))) {
      return reply(`Not a valid Bo${match.bestOf} score. First to ${Math.ceil(match.bestOf / 2)} wins, no draws.`);
    }
    match.status = "awaiting_confirm";
    match.report = {
      byId: asPlayer.id,
      reporterScore: pair.a,
      opponentScore: pair.b,
      at: new Date().toISOString(),
    };
    const opp = findPlayer(db.signups, otherId(match, asPlayer.id));
    return reply(
      `${asPlayer.playerTag} reports ${pair.a}–${pair.b}. ${opp ? opp.playerTag : "Opponent"}: type !confirm to lock it, or !dispute.`
    );
  }

  if (cmd.name === "confirm") {
    if (!asPlayer) return reply("You must be a signed-up player to confirm.");
    const match = off.match;
    if (!match || !match.report || (match.status !== "awaiting_confirm" && match.status !== "disputed")) {
      return reply("Nothing to confirm. A player in the set must !report first.");
    }
    if (!inMatch(match, asPlayer.id)) return reply("You are not in this set.");
    if (match.report.byId === asPlayer.id) {
      return reply("The other player has to !confirm. You already reported.");
    }
    const p1Score = match.report.byId === match.p1Id ? match.report.reporterScore : match.report.opponentScore;
    const p2Score = match.report.byId === match.p2Id ? match.report.reporterScore : match.report.opponentScore;
    const winnerId = p1Score > p2Score ? match.p1Id : match.p2Id;
    match.status = "complete";
    match.result = {
      winnerId,
      p1Score,
      p2Score,
      confirmedBy: asPlayer.id,
      at: new Date().toISOString(),
    };
    const p1 = findPlayer(db.signups, match.p1Id);
    const p2 = findPlayer(db.signups, match.p2Id);
    const winner = findPlayer(db.signups, winnerId);
    const finished = match;
    off.results = [finished, ...off.results].slice(0, 24);
    off.match = null;
    const overlay = {
      p1: { name: p1 ? p1.playerTag : "Player 1", character: p1 ? p1.characterMain : "", score: p1Score },
      p2: { name: p2 ? p2.playerTag : "Player 2", character: p2 ? p2.characterMain : "", score: p2Score },
      status: "finished",
      round: "Offstream result",
    };
    const text = `Result locked: ${p1 ? p1.playerTag : "P1"} ${p1Score}–${p2Score} ${p2 ? p2.playerTag : "P2"}. Winner: ${winner ? winner.playerTag : "?"}. Overlay standings updated.`;
    off.chat = [...off.chat, line("PandaBot", "bot", text)].slice(-80);
    return { reply: text, snapshot: snapshot(db), overlay };
  }

  if (cmd.name === "dispute") {
    if (!asPlayer) return reply("You must be in the set to dispute.");
    const match = off.match;
    if (!match || !match.report) return reply("No pending report to dispute.");
    if (!inMatch(match, asPlayer.id)) return reply("You are not in this set.");
    if (match.report.byId === asPlayer.id) {
      return reply("You cannot dispute your own report. Wait or have a mod !cancel.");
    }
    match.status = "disputed";
    match.report = null;
    return reply("Report disputed. Re-enter with !report, or a mod can !result @p1 2 @p2 1.");
  }

  if (cmd.name === "result") {
    if (!actor.isMod) return reply("Only mods can force a result.");
    const match = off.match;
    if (!match) return reply("No open offstream match.");
    const a = findPlayer(db.signups, cmd.args[0] || "");
    const b = findPlayer(db.signups, cmd.args[2] || "");
    const pair = parseScorePair([cmd.args[1] || "", cmd.args[3] || ""]);
    if (!a || !b || !pair || !inMatch(match, a.id) || !inMatch(match, b.id)) {
      return reply("Usage: !result @playerA 2 @playerB 1");
    }
    if (!isValidSeriesScore(match.bestOf, Math.max(pair.a, pair.b), Math.min(pair.a, pair.b))) {
      return reply(`Not a valid Bo${match.bestOf} score.`);
    }
    const p1Score = a.id === match.p1Id ? pair.a : pair.b;
    const p2Score = a.id === match.p1Id ? pair.b : pair.a;
    const winnerId = p1Score > p2Score ? match.p1Id : match.p2Id;
    match.status = "complete";
    match.result = {
      winnerId,
      p1Score,
      p2Score,
      confirmedBy: "mod",
      at: new Date().toISOString(),
    };
    const p1 = findPlayer(db.signups, match.p1Id);
    const p2 = findPlayer(db.signups, match.p2Id);
    const winner = findPlayer(db.signups, winnerId);
    const finished = match;
    off.results = [finished, ...off.results].slice(0, 24);
    off.match = null;
    const overlay = {
      p1: { name: p1 ? p1.playerTag : "Player 1", character: p1 ? p1.characterMain : "", score: p1Score },
      p2: { name: p2 ? p2.playerTag : "Player 2", character: p2 ? p2.characterMain : "", score: p2Score },
      status: "finished",
      round: "Offstream result",
    };
    const text = `Mod result: ${p1 ? p1.playerTag : "P1"} ${p1Score}–${p2Score} ${p2 ? p2.playerTag : "P2"}. Winner: ${winner ? winner.playerTag : "?"}.`;
    off.chat = [...off.chat, line("PandaBot", "bot", text)].slice(-80);
    return { reply: text, snapshot: snapshot(db), overlay };
  }

  return reply("Unknown command. !help for the offstream list.");
}

module.exports = {
  HELP,
  ensureOffstream,
  snapshot,
  runCommand,
  normalizeName,
};
