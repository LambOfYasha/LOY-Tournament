import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type MatchStatus = "waiting" | "in_progress" | "paused" | "complete";

export type PlayerSlot = {
  tag: string;
  character: string;
  score: number;
};

export type RegisteredPlayer = {
  id: string;
  tag: string;
  character: string;
  platform: string;
  region: string;
};

export type OverlayPayload = {
  tournamentName: string;
  round: string;
  status: MatchStatus;
  bestOf: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
  pushedAt: string | null;
};

type TournamentState = {
  tournamentName: string;
  round: string;
  bestOf: number;
  status: MatchStatus;
  player1: PlayerSlot;
  player2: PlayerSlot;
  registered: RegisteredPlayer[];
  lastPushed: OverlayPayload | null;
  pushTick: number;
  hydrated: boolean;
  setField: <K extends "tournamentName" | "round">(key: K, value: string) => void;
  setBestOf: (n: number) => void;
  setStatus: (s: MatchStatus) => void;
  setPlayer: (side: 1 | 2, patch: Partial<PlayerSlot>) => void;
  bumpScore: (side: 1 | 2, delta: number) => void;
  resetScores: () => void;
  swapSides: () => void;
  loadSignup: (side: 1 | 2, player: RegisteredPlayer) => void;
  addRegistered: (player: Omit<RegisteredPlayer, "id">) => void;
  removeRegistered: (id: string) => void;
  pushMatchInfo: () => OverlayPayload;
  forcePushAll: () => OverlayPayload;
  markHydrated: () => void;
};

const SEED_REGISTERED: RegisteredPlayer[] = [
  { id: "p-gamer", tag: "GamerTag1", character: "Kazuya", platform: "PC", region: "NA" },
  { id: "p-pro", tag: "ProFighter", character: "Jin", platform: "PS5", region: "EU" },
  { id: "p-shadow", tag: "ShadowKing", character: "Heihachi", platform: "PC", region: "NA" },
  { id: "p-azul", tag: "AzuLuna", character: "Xiaoyu", platform: "Xbox", region: "JP" },
  { id: "p-knee", tag: "Knee", character: "Bryan", platform: "PC", region: "KR" },
];

function payloadOf(s: {
  tournamentName: string;
  round: string;
  status: MatchStatus;
  bestOf: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
}): OverlayPayload {
  return {
    tournamentName: s.tournamentName,
    round: s.round,
    status: s.status,
    bestOf: s.bestOf,
    player1: { ...s.player1 },
    player2: { ...s.player2 },
    pushedAt: new Date().toISOString(),
  };
}

export const STATUS_LABEL: Record<MatchStatus, string> = {
  waiting: "Waiting",
  in_progress: "In Progress",
  paused: "Paused",
  complete: "Complete",
};

export const BEST_OF_OPTIONS = [1, 3, 5, 7] as const;

export const useTournament = create<TournamentState>()(
  persist(
    (set, get) => ({
      tournamentName: "Tekken 8 Open",
      round: "Winners Finals",
      bestOf: 3,
      status: "waiting",
      player1: { tag: "Player 1", character: "Jin / Kazuya / etc.", score: 0 },
      player2: { tag: "Player 2", character: "Character", score: 0 },
      registered: SEED_REGISTERED,
      lastPushed: null,
      pushTick: 0,
      hydrated: false,
      setField: (key, value) => set({ [key]: value }),
      setBestOf: (n) => set({ bestOf: n }),
      setStatus: (s) => set({ status: s }),
      setPlayer: (side, patch) =>
        set((st) => {
          const key = side === 1 ? "player1" : "player2";
          return { [key]: { ...st[key], ...patch } };
        }),
      bumpScore: (side, delta) =>
        set((st) => {
          const key = side === 1 ? "player1" : "player2";
          const next = Math.max(0, Math.min(99, st[key].score + delta));
          const winsNeeded = Math.ceil(st.bestOf / 2);
          const other = side === 1 ? st.player2 : st.player1;
          let status = st.status;
          if (next >= winsNeeded) status = "complete";
          else if (next > 0 || other.score > 0) {
            if (st.status === "waiting" || st.status === "complete") status = "in_progress";
          }
          return { [key]: { ...st[key], score: next }, status };
        }),
      resetScores: () =>
        set((st) => ({
          player1: { ...st.player1, score: 0 },
          player2: { ...st.player2, score: 0 },
          status: "waiting",
        })),
      swapSides: () =>
        set((st) => ({
          player1: st.player2,
          player2: st.player1,
        })),
      loadSignup: (side, player) =>
        set((st) => {
          const key = side === 1 ? "player1" : "player2";
          return {
            [key]: {
              ...st[key],
              tag: player.tag,
              character: player.character,
            },
          };
        }),
      addRegistered: (player) =>
        set((st) => ({
          registered: [
            ...st.registered,
            { ...player, id: `p-${Date.now().toString(36)}` },
          ],
        })),
      removeRegistered: (id) =>
        set((st) => ({ registered: st.registered.filter((p) => p.id !== id) })),
      pushMatchInfo: () => {
        const payload = payloadOf(get());
        set((st) => ({ lastPushed: payload, pushTick: st.pushTick + 1 }));
        return payload;
      },
      forcePushAll: () => {
        const payload = payloadOf(get());
        set((st) => ({ lastPushed: payload, pushTick: st.pushTick + 1 }));
        return payload;
      },
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "tcp-gothic-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        tournamentName: s.tournamentName,
        round: s.round,
        bestOf: s.bestOf,
        status: s.status,
        player1: s.player1,
        player2: s.player2,
        registered: s.registered,
        lastPushed: s.lastPushed,
      }),
    },
  ),
);

export function livePreviewJson(s: {
  tournamentName: string;
  round: string;
  status: MatchStatus;
  bestOf: number;
  player1: PlayerSlot;
  player2: PlayerSlot;
}) {
  return {
    tournamentName: s.tournamentName,
    round: s.round,
    status: s.status,
    bestOf: s.bestOf,
    player1: s.player1,
    player2: s.player2,
  };
}
