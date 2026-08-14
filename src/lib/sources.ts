export type SourceRepo = {
  id: string;
  name: string;
  org: string;
  href: string;
  role: string;
  commands: string;
};

export const SOURCE_REPOS: SourceRepo[] = [
  {
    id: "loy-tournament",
    name: "LOY-Tournament",
    org: "LambOfYasha",
    href: "https://github.com/LambOfYasha/LOY-Tournament",
    role: "Overlay kit, tournament desk, offstream scoring, scenes, ads, chat frame, emotes, welcomes.",
    commands: "!checkin !report !confirm !scene !overlay !ad !so !emotes !welcome",
  },
  {
    id: "xiao-bot",
    name: "xiao_pandamaiden-ttv_bot",
    org: "LambOfYasha",
    href: "https://github.com/LambOfYasha/xiao_pandamaiden-ttv_bot",
    role: "Twitch courtyard bot for #lambs_shadow — chat commands and overlay hooks.",
    commands: "!np !play plus the live command table once forwarded",
  },
];

export type EndingNotice = {
  enabled: boolean;
  delayMs: number;
  line: string;
};

export const DEFAULT_ENDING_NOTICE: EndingNotice = {
  enabled: true,
  delayMs: 4000,
  line: "Ending Soon is up — thank you for the courtyard. Developers, source of truth: github.com/LambOfYasha/LOY-Tournament · bot github.com/LambOfYasha/xiao_pandamaiden-ttv_bot · type !src for every repo. Pray. Train. Trust.",
};

export function reposHelp() {
  return SOURCE_REPOS.map((r) => `${r.name} ${r.href}`).join(" · ");
}

export function reposChatLine() {
  return `Source (devs) · ${reposHelp()} · Ending Soon posts a timed close when that overlay is on.`;
}
