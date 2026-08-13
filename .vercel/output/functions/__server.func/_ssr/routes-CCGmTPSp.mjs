import { o as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as ChevronDown, t as X } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CCGmTPSp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SEED_REGISTERED = [
	{
		id: "p-gamer",
		tag: "GamerTag1",
		character: "Kazuya",
		platform: "PC",
		region: "NA"
	},
	{
		id: "p-pro",
		tag: "ProFighter",
		character: "Jin",
		platform: "PS5",
		region: "EU"
	},
	{
		id: "p-shadow",
		tag: "ShadowKing",
		character: "Heihachi",
		platform: "PC",
		region: "NA"
	},
	{
		id: "p-azul",
		tag: "AzuLuna",
		character: "Xiaoyu",
		platform: "Xbox",
		region: "JP"
	},
	{
		id: "p-knee",
		tag: "Knee",
		character: "Bryan",
		platform: "PC",
		region: "KR"
	}
];
function payloadOf(s) {
	return {
		tournamentName: s.tournamentName,
		round: s.round,
		status: s.status,
		bestOf: s.bestOf,
		player1: { ...s.player1 },
		player2: { ...s.player2 },
		pushedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
var STATUS_LABEL = {
	waiting: "Waiting",
	in_progress: "In Progress",
	paused: "Paused",
	complete: "Complete"
};
var BEST_OF_OPTIONS = [
	1,
	3,
	5,
	7
];
var useTournament = create()(persist((set, get) => ({
	tournamentName: "Tekken 8 Open",
	round: "Winners Finals",
	bestOf: 3,
	status: "waiting",
	player1: {
		tag: "Player 1",
		character: "Jin / Kazuya / etc.",
		score: 0
	},
	player2: {
		tag: "Player 2",
		character: "Character",
		score: 0
	},
	registered: SEED_REGISTERED,
	lastPushed: null,
	pushTick: 0,
	hydrated: false,
	setField: (key, value) => set({ [key]: value }),
	setBestOf: (n) => set({ bestOf: n }),
	setStatus: (s) => set({ status: s }),
	setPlayer: (side, patch) => set((st) => {
		const key = side === 1 ? "player1" : "player2";
		return { [key]: {
			...st[key],
			...patch
		} };
	}),
	bumpScore: (side, delta) => set((st) => {
		const key = side === 1 ? "player1" : "player2";
		const next = Math.max(0, Math.min(99, st[key].score + delta));
		const winsNeeded = Math.ceil(st.bestOf / 2);
		const other = side === 1 ? st.player2 : st.player1;
		let status = st.status;
		if (next >= winsNeeded) status = "complete";
		else if (next > 0 || other.score > 0) {
			if (st.status === "waiting" || st.status === "complete") status = "in_progress";
		}
		return {
			[key]: {
				...st[key],
				score: next
			},
			status
		};
	}),
	resetScores: () => set((st) => ({
		player1: {
			...st.player1,
			score: 0
		},
		player2: {
			...st.player2,
			score: 0
		},
		status: "waiting"
	})),
	swapSides: () => set((st) => ({
		player1: st.player2,
		player2: st.player1
	})),
	loadSignup: (side, player) => set((st) => {
		const key = side === 1 ? "player1" : "player2";
		return { [key]: {
			...st[key],
			tag: player.tag,
			character: player.character
		} };
	}),
	addRegistered: (player) => set((st) => ({ registered: [...st.registered, {
		...player,
		id: `p-${Date.now().toString(36)}`
	}] })),
	removeRegistered: (id) => set((st) => ({ registered: st.registered.filter((p) => p.id !== id) })),
	pushMatchInfo: () => {
		const payload = payloadOf(get());
		set((st) => ({
			lastPushed: payload,
			pushTick: st.pushTick + 1
		}));
		return payload;
	},
	forcePushAll: () => {
		const payload = payloadOf(get());
		set((st) => ({
			lastPushed: payload,
			pushTick: st.pushTick + 1
		}));
		return payload;
	},
	markHydrated: () => set({ hydrated: true })
}), {
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
		lastPushed: s.lastPushed
	})
}));
function livePreviewJson(s) {
	return {
		tournamentName: s.tournamentName,
		round: s.round,
		status: s.status,
		bestOf: s.bestOf,
		player1: s.player1,
		player2: s.player2
	};
}
function useHydrateStore() {
	(0, import_react.useEffect)(() => {
		useTournament.persist.rehydrate();
		useTournament.getState().markHydrated();
	}, []);
}
function useDismiss(open, onClose) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onDoc = (e) => {
			if (!ref.current?.contains(e.target)) onClose();
		};
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open, onClose]);
	return ref;
}
function SelectMenu({ value, options, onChange, format }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const ref = useDismiss(open, () => setOpen(false));
	const label = format ? format(value) : String(value);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "field-select",
		ref,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "field-select-btn",
			"aria-haspopup": "listbox",
			"aria-expanded": open,
			onClick: () => setOpen((v) => !v),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
				size: 14,
				strokeWidth: 2.2
			})]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "menu",
			role: "listbox",
			children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				role: "option",
				className: "menu-item",
				"data-active": opt === value,
				onClick: () => {
					onChange(opt);
					setOpen(false);
				},
				children: format ? format(opt) : String(opt)
			}, String(opt)))
		}) : null]
	});
}
function LoadSignups({ side }) {
	const registered = useTournament((s) => s.registered);
	const loadSignup = useTournament((s) => s.loadSignup);
	const [open, setOpen] = (0, import_react.useState)(false);
	const ref = useDismiss(open, () => setOpen(false));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "field-select",
		ref,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "load-bar",
			"aria-haspopup": "listbox",
			"aria-expanded": open,
			onClick: () => setOpen((v) => !v),
			children: ["Load from Signups", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
				size: 14,
				strokeWidth: 2.2
			})]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "menu",
			"data-wide": "true",
			role: "listbox",
			children: registered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "menu-item",
				style: { pointerEvents: "none" },
				children: "No registered players"
			}) : registered.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "menu-item",
				onClick: () => {
					loadSignup(side, p);
					setOpen(false);
					toast(`${p.tag} loaded into Player ${side}`, { className: "toast-gothic" });
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [p.tag, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "roster-meta",
					children: [
						p.character,
						" · ",
						p.platform,
						" · ",
						p.region
					]
				})] })
			}, p.id))
		}) : null]
	});
}
function PlayerCard({ side, title }) {
	const player = useTournament((s) => side === 1 ? s.player1 : s.player2);
	const bestOf = useTournament((s) => s.bestOf);
	const setPlayer = useTournament((s) => s.setPlayer);
	const bumpScore = useTournament((s) => s.bumpScore);
	const winsNeeded = Math.ceil(bestOf / 2);
	const isWinner = player.score >= winsNeeded && player.score > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "panel",
		"aria-label": title,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "panel-title",
				children: [title, isWinner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "winner-tag",
					children: "Winner"
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "field-grid",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "field-label",
						children: "Name / Tag"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field-input",
						value: player.tag,
						onChange: (e) => setPlayer(side, { tag: e.target.value })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "field",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "field-label",
						children: "Character"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field-input",
						value: player.character,
						onChange: (e) => setPlayer(side, { character: e.target.value })
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "field",
				style: { marginTop: 8 },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "field-label",
					children: "Score"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "score-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "score-btn minus",
							"aria-label": `Decrease player ${side} score`,
							onClick: () => bumpScore(side, -1),
							children: "−"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "score-value",
							"aria-live": "polite",
							children: player.score
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "score-btn plus",
							"aria-label": `Increase player ${side} score`,
							onClick: () => bumpScore(side, 1),
							children: "+"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadSignups, { side })
		]
	});
}
function JsonPreview() {
	const tournamentName = useTournament((s) => s.tournamentName);
	const round = useTournament((s) => s.round);
	const status = useTournament((s) => s.status);
	const bestOf = useTournament((s) => s.bestOf);
	const player1 = useTournament((s) => s.player1);
	const player2 = useTournament((s) => s.player2);
	const pushTick = useTournament((s) => s.pushTick);
	const lastPushed = useTournament((s) => s.lastPushed);
	const pretty = (0, import_react.useMemo)(() => JSON.stringify(livePreviewJson({
		tournamentName,
		round,
		status,
		bestOf,
		player1,
		player2
	}), null, 2), [
		tournamentName,
		round,
		status,
		bestOf,
		player1,
		player2
	]);
	const [flash, setFlash] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!pushTick) return;
		setFlash(true);
		const t = window.setTimeout(() => setFlash(false), 700);
		return () => window.clearTimeout(t);
	}, [pushTick]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `panel preview-panel${flash ? " preview-flash" : ""}`,
		"aria-label": "Preview",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "panel-title",
				children: "Preview"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: pretty }),
			lastPushed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "pushed-note",
				children: [
					"Last push ",
					new Date(lastPushed.pushedAt ?? "").toLocaleTimeString(),
					" · overlay synced"
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pushed-note",
				children: "Live payload — push to send to the overlay"
			})
		]
	});
}
function AddSignup() {
	const addRegistered = useTournament((s) => s.addRegistered);
	const [tag, setTag] = (0, import_react.useState)("");
	const [character, setCharacter] = (0, import_react.useState)("");
	const [platform, setPlatform] = (0, import_react.useState)("PC");
	const [region, setRegion] = (0, import_react.useState)("NA");
	function submit() {
		const t = tag.trim();
		const c = character.trim();
		if (!t || !c) {
			toast("Tag and character are required", { className: "toast-gothic" });
			return;
		}
		addRegistered({
			tag: t,
			character: c,
			platform: platform.trim() || "PC",
			region: region.trim() || "NA"
		});
		setTag("");
		setCharacter("");
		toast(`${t} added to signups`, { className: "toast-gothic" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "add-row",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field-input",
				placeholder: "Tag",
				value: tag,
				onChange: (e) => setTag(e.target.value),
				onKeyDown: (e) => e.key === "Enter" && submit()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field-input",
				placeholder: "Character",
				value: character,
				onChange: (e) => setCharacter(e.target.value),
				onKeyDown: (e) => e.key === "Enter" && submit()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field-input",
				placeholder: "Platform",
				value: platform,
				onChange: (e) => setPlatform(e.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field-input",
				placeholder: "Region",
				value: region,
				onChange: (e) => setRegion(e.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "add-btn",
				onClick: submit,
				children: "Add"
			})
		]
	});
}
function TournamentPanel() {
	useHydrateStore();
	const tournamentName = useTournament((s) => s.tournamentName);
	const round = useTournament((s) => s.round);
	const bestOf = useTournament((s) => s.bestOf);
	const status = useTournament((s) => s.status);
	const registered = useTournament((s) => s.registered);
	const setField = useTournament((s) => s.setField);
	const setBestOf = useTournament((s) => s.setBestOf);
	const setStatus = useTournament((s) => s.setStatus);
	const resetScores = useTournament((s) => s.resetScores);
	const swapSides = useTournament((s) => s.swapSides);
	const pushMatchInfo = useTournament((s) => s.pushMatchInfo);
	const forcePushAll = useTournament((s) => s.forcePushAll);
	const loadSignup = useTournament((s) => s.loadSignup);
	const removeRegistered = useTournament((s) => s.removeRegistered);
	function loadInto(side, player) {
		loadSignup(side, player);
		toast(`${player.tag} → Player ${side}`, { className: "toast-gothic" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "stage-inner",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ornate-shell",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/ornaments/bow.png",
						alt: "",
						className: "ornament bow-tl"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/ornaments/bow.png",
						alt: "",
						className: "ornament bow-tr"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/ornaments/bow.png",
						alt: "",
						className: "ornament bow-bl"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/ornaments/cross.png",
						alt: "",
						className: "ornament cross-bl"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/ornaments/cross.png",
						alt: "",
						className: "ornament cross-br"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/ornaments/panda.png",
						alt: "Panda mascot",
						className: "ornament panda"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "title-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/ornaments/cross.png",
								alt: "",
								className: "title-cross top"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "title-plaque",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "title-word",
									children: "Tournament Control Panel"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/ornaments/cross.png",
								alt: "",
								className: "title-cross mid"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "panel-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "panel",
								"aria-label": "Match Info",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "panel-title",
										children: "Match Info"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "field-grid",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "field",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "field-label",
													children: "Tournament Name"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "field-input",
													value: tournamentName,
													onChange: (e) => setField("tournamentName", e.target.value)
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "field",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "field-label",
													children: "Round / Phase"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "field-input",
													value: round,
													onChange: (e) => setField("round", e.target.value)
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "field",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "field-label",
													children: "Best Of"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectMenu, {
													value: bestOf,
													options: BEST_OF_OPTIONS,
													onChange: setBestOf
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "field",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "field-label",
													children: "Status"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectMenu, {
													value: status,
													options: [
														"waiting",
														"in_progress",
														"paused",
														"complete"
													],
													onChange: (v) => setStatus(v),
													format: (v) => STATUS_LABEL[v]
												})]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "rose-bar",
										onClick: () => {
											pushMatchInfo();
											toast("Match info pushed to overlay", { className: "toast-gothic" });
										},
										children: "Push Match Info"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerCard, {
								side: 1,
								title: "Player 1 (Left)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerCard, {
								side: 2,
								title: "Player 2 (Right)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "panel",
								"aria-label": "Quick Actions",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "panel-title",
										children: "Quick Actions"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "ghost-row",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "ghost-btn",
												onClick: () => {
													resetScores();
													toast("Scores reset to 0", { className: "toast-gothic" });
												},
												children: "Reset Scores to 0"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "ghost-btn",
												onClick: () => {
													swapSides();
													toast("Sides swapped", { className: "toast-gothic" });
												},
												children: "Swap Sides"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "ghost-btn",
												onClick: () => {
													forcePushAll();
													toast("Full state force-pushed", { className: "toast-gothic" });
												},
												children: "Force Push All"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "panel-title",
										style: { marginTop: 16 },
										children: "Registered Players"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "roster",
										children: registered.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "roster-item",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "roster-name",
												children: p.tag
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "roster-meta",
												children: [
													p.character,
													" · ",
													p.platform,
													" · ",
													p.region
												]
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "roster-actions",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														className: "chip",
														onClick: () => loadInto(1, p),
														children: "P1"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														className: "chip",
														onClick: () => loadInto(2, p),
														children: "P2"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														className: "chip",
														"aria-label": `Remove ${p.tag}`,
														onClick: () => removeRegistered(p.id),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
															size: 12,
															strokeWidth: 2.4
														})
													})
												]
											})]
										}, p.id))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddSignup, {})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JsonPreview, {})
				]
			})
		})
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TournamentPanel, {});
}
//#endregion
export { Home as component };
