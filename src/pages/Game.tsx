import { useEffect, useMemo, useState } from "react";
import { Award, Crown, Footprints, Gamepad2, HeartPulse, Moon, Plus, Swords, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildSeedRankingData, buildSeedTopFiveData, featuredBadges, miniGames } from "@/components/entertainment/gameCatalog";
import { ArcadeArena } from "@/components/entertainment/ArcadeArena";
import { buildRoomScoreboard, buildSystemMessage, hasRoomScore, parseLatestStart } from "@/components/entertainment/gameRoomState";
import { getGameMode, supportsTimedRounds, type PlayableGameId } from "@/components/entertainment/playableGames";
import { SandboxArena } from "@/components/entertainment/SandboxArena";
import { reduceSandboxState } from "@/components/entertainment/sandbox/sandboxEngine";
import { StrategyArena } from "@/components/entertainment/StrategyArena";
import { createFitCraftWorld } from "@/components/entertainment/sandbox/sandboxSerializer";
import type { SandboxAction, SandboxWorldState } from "@/components/entertainment/sandbox/sandboxTypes";
import { createPulseFrontierState } from "@/components/entertainment/strategy/strategyMap";
import { reduceStrategyState } from "@/components/entertainment/strategy/strategyEngine";
import type { StrategyAction, StrategyUnitType } from "@/components/entertainment/strategy/strategyTypes";
import { awardBadge } from "@/services/achievementStore";
import {
  getStoredEntertainmentChallenges,
  getStoredEntertainmentRooms,
  getStoredEntertainmentScores,
  hydrateEntertainmentRepositoryFromServer,
  loadEntertainmentLeaderboard,
  loadEntertainmentTopFive,
  recordEntertainmentScoreEvent,
  saveStoredEntertainmentChallenges,
  saveStoredEntertainmentRooms,
  saveStoredEntertainmentScores,
  subscribeEntertainmentRepositoryChanges,
} from "@/services/repositories/entertainmentRepository";
import { getFriends, type FriendEntry } from "@/services/socialStore";
import {
  type ChallengeEntry,
  type ChallengeIcon,
  type MultiRoom,
  type RankingRange,
  type RankingRow,
} from "@/services/entertainmentTypes";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "사용자";
const challengeIcons = { run: Footprints, heart: HeartPulse, sleep: Moon, team: Users } as const;
const rankingData = buildSeedRankingData(MY_USER_ID, MY_USER_NAME);
const topFiveData = buildSeedTopFiveData(MY_USER_NAME);

const BOT_NAMES = ["코멧", "노바", "루프", "픽셀", "제로", "퀵실버"];

function buildBotParticipant(existing: MultiRoom["participants"]) {
  const index = existing.filter((participant) => participant.isBot).length;
  const name = BOT_NAMES[index % BOT_NAMES.length];
  return {
    userId: `bot-${index + 1}`,
    name: `${name} CPU`,
    isBot: true,
  };
}

function generateBotScore(gameId: PlayableGameId, durationSeconds: 30 | 60) {
  switch (gameId) {
    case "tap-sprint":
      return durationSeconds === 60 ? 95 + Math.floor(Math.random() * 35) : 48 + Math.floor(Math.random() * 25);
    case "reaction-grid":
      return durationSeconds === 60 ? 320 + Math.floor(Math.random() * 110) : 140 + Math.floor(Math.random() * 70);
    case "pace-memory":
      return durationSeconds === 60 ? 180 + Math.floor(Math.random() * 80) : 90 + Math.floor(Math.random() * 50);
    case "resource-rush":
      return 140 + Math.floor(Math.random() * 120);
    case "fitcraft-island":
      return 100 + Math.floor(Math.random() * 90);
    case "tetris":
      return 110 + Math.floor(Math.random() * 140);
    case "pulse-frontier":
      return 120 + Math.floor(Math.random() * 80);
  }
}

function createRoomActionMessage(actorName: string, summary: string) {
  return {
    id: `action-label-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "SYSTEM",
    text: `${actorName}: ${summary}`,
    createdAt: new Date().toISOString(),
  };
}

function getChallenges(): ChallengeEntry[] {
  const data = getStoredEntertainmentChallenges();
  if (data.length > 0) return data;
  const seed: ChallengeEntry[] = [
    { id: "seed-run", title: "주간 18km 러닝", description: "이번 주 18km 이상 러닝", details: "회복 러닝, 템포 러닝, 롱런을 조합해 달성하는 기본 챌린지입니다.", reward: "라벤더 러너 배지", icon: "run", progress: 42, joinedUserIds: [], completedUserIds: [] },
    { id: "seed-sleep", title: "수면 밸런스", description: "7일 평균 수면 7시간 20분", details: "취침과 기상 시간을 일정하게 유지하는 회복 중심 챌린지입니다.", reward: "수면 밸런스 배지", icon: "sleep", progress: 68, joinedUserIds: [], completedUserIds: [] },
    { id: "seed-team", title: "그룹 30km", description: "친구와 함께 누적 30km", details: "여러 명이 참여할수록 더 빨리 달성할 수 있는 커뮤니티형 챌린지입니다.", reward: "커뮤니티 MVP 배지", icon: "team", progress: 27, joinedUserIds: [], completedUserIds: [] },
  ];
  saveStoredEntertainmentChallenges(seed);
  return seed;
}

function getScores(): Record<PlayableGameId, number> { return getStoredEntertainmentScores(); }
function getRooms(): MultiRoom[] { return getStoredEntertainmentRooms(); }
export default function Game() {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([]);
  const [scores, setScores] = useState(getScores());
  const [rooms, setRooms] = useState<MultiRoom[]>([]);
  const [openedGame, setOpenedGame] = useState<PlayableGameId | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [rankingMode, setRankingMode] = useState<RankingRange>("weekly");
  const [rankingGame, setRankingGame] = useState<PlayableGameId>("tap-sprint");
  const [liveRanking, setLiveRanking] = useState<RankingRow[]>(rankingData["tap-sprint"].weekly);
  const [liveTopFive, setLiveTopFive] = useState<Array<{ name: string; score: number; badge: string }>>(topFiveData["tap-sprint"]);
  const [rankingRefreshTick, setRankingRefreshTick] = useState(0);
  const [showTopFive, setShowTopFive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showRoomCreate, setShowRoomCreate] = useState(false);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");
  const [reward, setReward] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<ChallengeIcon>("run");
  const [roomTitle, setRoomTitle] = useState("");
  const [roomGameId, setRoomGameId] = useState<PlayableGameId>("tap-sprint");
  const [roomDuration, setRoomDuration] = useState<30 | 60>(30);
  const [teamMode, setTeamMode] = useState(false);
  const [roomChatInput, setRoomChatInput] = useState("");

  useDeviceBackNavigation({
    fallback: "/",
    isRootPage: true,
    onBackWithinPage: () => {
      if (openedGame) { setOpenedGame(null); return true; }
      if (activeRoomId) { setActiveRoomId(null); return true; }
      if (showRoomCreate) { setShowRoomCreate(false); return true; }
      if (showCreate) { setShowCreate(false); return true; }
      if (expandedBadge) { setExpandedBadge(null); return true; }
      if (expandedChallenge) { setExpandedChallenge(null); return true; }
      return false;
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function hydrateEntertainment() {
      await hydrateEntertainmentRepositoryFromServer();
      if (cancelled) return;
      setFriends(getFriends());
      setChallenges(getChallenges());
      setScores(getScores());
      setRooms(getRooms());
    }
    void hydrateEntertainment();
    const unsubscribe = subscribeEntertainmentRepositoryChanges(() => {
      if (cancelled) return;
      setChallenges(getChallenges());
      setScores(getScores());
      setRooms(getRooms());
      setFriends(getFriends());
      setRankingRefreshTick((value) => value + 1);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRankings() {
      const [rankingRows, topRows] = await Promise.all([
        loadEntertainmentLeaderboard(rankingGame, rankingMode),
        loadEntertainmentTopFive(rankingGame),
      ]);

      if (cancelled) return;

      setLiveRanking(rankingRows && rankingRows.length > 0 ? rankingRows : rankingData[rankingGame][rankingMode]);
      setLiveTopFive(
        topRows && topRows.length > 0
          ? topRows.map((row) => ({ name: row.name, score: row.score, badge: "Top Score" }))
          : topFiveData[rankingGame],
      );
    }

    void loadRankings();
    return () => {
      cancelled = true;
    };
  }, [rankingGame, rankingMode, scores, rankingRefreshTick]);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null;
  const activeRoomStart = useMemo(() => parseLatestStart(activeRoom), [activeRoom]);
  const activeRoomScores = useMemo(() => buildRoomScoreboard(activeRoom), [activeRoom]);
  const currentLeaderboard = liveRanking;
  const myRanking = currentLeaderboard.find((entry) => entry.userId === MY_USER_ID);
  const myChallenges = useMemo(() => challenges.filter((item) => item.joinedUserIds.includes(MY_USER_ID) || item.completedUserIds.includes(MY_USER_ID)), [challenges]);

  useEffect(() => {
    if (!activeRoomStart || !activeRoomId) return;
    setOpenedGame((current) => current ?? activeRoomStart.gameId);
  }, [activeRoomId, activeRoomStart]);

  useEffect(() => {
    if (!activeRoom || activeRoom.gameId !== "pulse-frontier" || activeRoom.roomStatus !== "running" || !activeRoom.gameState) return;
    const strategyState = activeRoom.gameState as ReturnType<typeof createPulseFrontierState>;
    const currentPlayer = strategyState.players.find((player) => player.userId === strategyState.currentUserTurn);
    if (!currentPlayer?.userId.startsWith("bot-")) return;

    const timer = window.setTimeout(() => {
      const botUnits = strategyState.units.filter((unit) => unit.ownerUserId === currentPlayer.userId) || [];
      const botBases = strategyState.tiles.filter((tile) => tile.baseOwnerUserId !== currentPlayer.userId && tile.type === "base") || [];
      const unit = botUnits[0];
      if (unit && botBases[0]) {
        const nextX = unit.x + Math.sign(botBases[0].x - unit.x);
        const nextY = unit.y + Math.sign(botBases[0].y - unit.y);
        const moved = reduceStrategyState(strategyState, {
          type: "move-unit",
          userId: currentPlayer.userId,
          unitId: unit.id,
          toX: nextX,
          toY: nextY,
        });
        const ended = reduceStrategyState(moved, { type: "end-turn", userId: currentPlayer.userId });
        saveRooms(
          rooms.map((room) =>
            room.id === activeRoom.id
              ? {
                  ...room,
                  roomStatus: ended.phase === "finished" ? "finished" : "running",
                  gameState: ended,
                  systemEvents: [
                    ...room.systemEvents,
                    buildSystemMessage("turn", { userId: currentPlayer.userId, turn: ended.turn }),
                  ],
                  chatMessages: [...room.chatMessages, createRoomActionMessage(currentPlayer.name, "유닛을 이동하고 턴을 종료했습니다.")],
                  updatedAt: new Date().toISOString(),
                }
              : room,
          ),
        );
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeRoom, rooms]);

  useEffect(() => {
    if (!activeRoom || activeRoom.gameId !== "pulse-frontier" || activeRoom.roomStatus !== "finished" || !activeRoom.gameState) return;
    const strategyState = activeRoom.gameState as ReturnType<typeof createPulseFrontierState>;
    if (strategyState.players.every((player) => hasRoomScore(activeRoom, player.userId))) return;

    const myResult = strategyState.players.find((player) => player.userId === MY_USER_ID);
    if (myResult) {
      const nextScores = {
        ...scores,
        "pulse-frontier": Math.max(scores["pulse-frontier"] || 0, myResult.score),
      };
      setScores(nextScores);
      saveStoredEntertainmentScores(nextScores);
      void recordEntertainmentScoreEvent("pulse-frontier", myResult.score);
    }

    const scoreEvents = strategyState.players.map((player) =>
      buildSystemMessage("score", {
        userId: player.userId,
        name: player.name,
        score: player.score,
        gameId: "pulse-frontier",
      }),
    );
    const resultMessages = strategyState.players.map((player) =>
      createRoomActionMessage(
        player.name,
        `${player.score}점으로 경기를 마쳤습니다${strategyState.winnerUserId === player.userId ? " · 승리" : ""}.`,
      ),
    );

    saveRooms(
      rooms.map((room) =>
        room.id === activeRoom.id
          ? {
              ...room,
              systemEvents: [...room.systemEvents, ...scoreEvents],
              chatMessages: [...room.chatMessages, ...resultMessages],
              updatedAt: new Date().toISOString(),
            }
          : room,
      ),
    );
  }, [activeRoom, rooms]);

  const saveChallenges = (next: ChallengeEntry[]) => {
    setChallenges(next);
    saveStoredEntertainmentChallenges(next);
  };
  const saveRooms = (next: MultiRoom[]) => {
    setRooms(next);
    saveStoredEntertainmentRooms(next);
  };

  const handleCreateChallenge = () => {
    if (!title.trim() || !description.trim()) return;
    const next = [{ id: `challenge-${Date.now()}`, title: title.trim(), description: description.trim(), details: details.trim() || "상세 설명이 아직 없습니다.", reward: reward.trim() || "커뮤니티 배지", icon: selectedIcon, progress: 0, joinedUserIds: [MY_USER_ID], completedUserIds: [] }, ...challenges];
    saveChallenges(next);
    setTitle(""); setDescription(""); setDetails(""); setReward(""); setSelectedIcon("run"); setShowCreate(false);
  };
  const handleJoinChallenge = (challengeId: string) => {
    const next = challenges.map((challenge) => {
      if (challenge.id !== challengeId) return challenge;
      const joinedUserIds = challenge.joinedUserIds.includes(MY_USER_ID) ? challenge.joinedUserIds : [...challenge.joinedUserIds, MY_USER_ID];
      const progress = Math.min(100, challenge.progress + 20);
      const completedUserIds = progress >= 100 && !challenge.completedUserIds.includes(MY_USER_ID) ? [...challenge.completedUserIds, MY_USER_ID] : challenge.completedUserIds;
      return { ...challenge, joinedUserIds, progress, completedUserIds };
    });
    saveChallenges(next);
    const completed = next.find((item) => item.id === challengeId);
    if (completed?.completedUserIds.includes(MY_USER_ID)) {
      awardBadge({ id: `challenge-${completed.id}`, name: completed.title, description: `${completed.title} 챌린지를 완수했습니다.`, icon: "🏆" });
    }
  };
  const handleCreateRoom = () => {
    if (!roomTitle.trim()) return;
    const mode = getGameMode(roomGameId);
    const nextRoom: MultiRoom = {
      id: `room-${Date.now()}`,
      title: roomTitle.trim(),
      hostId: MY_USER_ID,
      hostName: MY_USER_NAME,
      gameId: roomGameId,
      mode,
      roomStatus: "lobby",
      visibility: "public",
      editableBy: mode === "sandbox" ? "everyone" : "host",
      durationSeconds: supportsTimedRounds(roomGameId) ? roomDuration : undefined,
      teamMode,
      participants: [{ userId: MY_USER_ID, name: MY_USER_NAME, teamId: "alpha", ready: true }],
      chatMessages: [],
      systemEvents: [],
      maxPlayers: 30,
      gameState: mode === "sandbox" ? createFitCraftWorld(MY_USER_ID, roomTitle.trim()) : null,
      updatedAt: new Date().toISOString(),
    };
    saveRooms([nextRoom, ...rooms]);
    setRoomTitle(""); setRoomGameId("tap-sprint"); setRoomDuration(30); setTeamMode(false); setShowRoomCreate(false);
  };
  const handleJoinRoom = (roomId: string) => {
    const next = rooms.map((room) =>
      room.id !== roomId || room.participants.some((p) => p.userId === MY_USER_ID) || room.participants.length >= room.maxPlayers
        ? room
        : {
            ...room,
            participants: [...room.participants, { userId: MY_USER_ID, name: MY_USER_NAME, teamId: room.teamMode ? "beta" : "alpha", ready: true }],
            updatedAt: new Date().toISOString(),
          },
    );
    saveRooms(next); setActiveRoomId(roomId);
  };
  const handleAddBotToRoom = (roomId: string) => {
    const next = rooms.map((room) => {
      if (room.id !== roomId || room.participants.length >= room.maxPlayers) return room;
      return {
        ...room,
        participants: [...room.participants, { ...buildBotParticipant(room.participants), teamId: room.teamMode ? (room.participants.length % 2 === 0 ? "alpha" : "beta") : "alpha", ready: true }],
        updatedAt: new Date().toISOString(),
      };
    });
    saveRooms(next);
  };
  const handleRoomSetting = (patch: Partial<Pick<MultiRoom, "gameId" | "durationSeconds" | "teamMode">>) => {
    if (!activeRoom || activeRoom.hostId !== MY_USER_ID) return;
    saveRooms(
      rooms.map((room) =>
        room.id === activeRoom.id
          ? {
              ...room,
              ...patch,
              mode: patch.gameId ? getGameMode(patch.gameId) : room.mode,
              editableBy: patch.gameId && getGameMode(patch.gameId) === "sandbox" ? "everyone" : room.editableBy,
              durationSeconds: patch.gameId && !supportsTimedRounds(patch.gameId) ? undefined : patch.durationSeconds ?? room.durationSeconds ?? 30,
              gameState:
                patch.gameId && patch.gameId !== room.gameId
                  ? getGameMode(patch.gameId) === "sandbox"
                    ? createFitCraftWorld(room.hostId, `${room.title} 월드`)
                    : null
                  : room.gameState,
              updatedAt: new Date().toISOString(),
            }
          : room,
      ),
    );
  };
  const handleRoomChat = () => {
    if (!activeRoom || !roomChatInput.trim()) return;
    saveRooms(
      rooms.map((room) =>
        room.id === activeRoom.id
          ? {
              ...room,
              chatMessages: [
                ...room.chatMessages,
                {
                  id: `chat-${Date.now()}`,
                  name: MY_USER_NAME,
                  text: roomChatInput.trim(),
                  createdAt: new Date().toISOString(),
                },
              ],
              updatedAt: new Date().toISOString(),
            }
          : room,
      ),
    );
    setRoomChatInput("");
  };
  const commitStrategyAction = (action: StrategyAction, summary: string) => {
    if (!activeRoom || !activeRoom.gameState || activeRoom.gameId !== "pulse-frontier") return;
    const nextState = reduceStrategyState(activeRoom.gameState as ReturnType<typeof createPulseFrontierState>, action);
    saveRooms(
      rooms.map((room) =>
        room.id === activeRoom.id
          ? {
              ...room,
              roomStatus: nextState.phase === "finished" ? "finished" : "running",
              gameState: nextState,
              systemEvents: [
                ...room.systemEvents,
                buildSystemMessage(
                  action.type === "end-turn"
                    ? "turn"
                    : action.type === "move-unit"
                      ? "move"
                      : action.type === "spawn-unit"
                        ? "spawn"
                        : action.type === "capture-tile"
                          ? "capture"
                          : "resolve",
                  { ...action, turn: nextState.turn },
                ),
              ],
              chatMessages: [...room.chatMessages, createRoomActionMessage(MY_USER_NAME, summary)],
              updatedAt: new Date().toISOString(),
            }
          : room,
      ),
    );
  };
  const handleStartRoom = () => {
    if (!activeRoom || activeRoom.hostId !== MY_USER_ID) return;
    if (activeRoom.gameId === "pulse-frontier") {
      const strategyState = createPulseFrontierState(activeRoom.participants, 12);
      saveRooms(
        rooms.map((room) =>
          room.id === activeRoom.id
            ? {
                ...room,
                roomStatus: "running",
                gameState: strategyState,
                systemEvents: [
                  ...room.systemEvents,
                  buildSystemMessage("start", {
                    gameId: activeRoom.gameId,
                    mode: "strategy",
                    turn: 1,
                    startedAt: new Date().toISOString(),
                  }),
                ],
                chatMessages: [...room.chatMessages, createRoomActionMessage(activeRoom.hostName, "Pulse Frontier 경기를 시작했습니다.")],
                updatedAt: new Date().toISOString(),
              }
            : room,
        ),
      );
      setOpenedGame(activeRoom.gameId);
      return;
    }
    if (activeRoom.gameId === "fitcraft-island") {
      saveRooms(
        rooms.map((room) =>
          room.id === activeRoom.id
            ? {
                ...room,
                roomStatus: "running",
                gameState: room.gameState || createFitCraftWorld(room.hostId, room.title),
                systemEvents: [
                  ...room.systemEvents,
                  buildSystemMessage("start", {
                    gameId: activeRoom.gameId,
                    mode: "sandbox",
                    startedAt: new Date().toISOString(),
                  }),
                ],
                chatMessages: [...room.chatMessages, createRoomActionMessage(activeRoom.hostName, "FitCraft Island 월드를 열었습니다.")],
                updatedAt: new Date().toISOString(),
              }
            : room,
        ),
      );
      setOpenedGame(activeRoom.gameId);
      return;
    }
    const startedAt = new Date().toISOString();
    const gameTitle = miniGames.find((game) => game.id === activeRoom.gameId)?.title || "게임";
    const botMessages = activeRoom.participants
      .filter((participant) => participant.isBot)
      .flatMap((participant, index) => {
        const score = generateBotScore(activeRoom.gameId, activeRoom.durationSeconds || 30);
        return [
          buildSystemMessage("score", {
              userId: participant.userId,
              name: participant.name,
              score,
              gameId: activeRoom.gameId,
            }),
          createRoomActionMessage(participant.name, `점수 ${score}를 기록했습니다.`),
        ];
      });
    saveRooms(
      rooms.map((room) =>
        room.id === activeRoom.id
          ? {
              ...room,
              roomStatus: "running",
              systemEvents: [
                ...room.systemEvents,
                buildSystemMessage("start", {
                  gameId: activeRoom.gameId,
                  durationSeconds: activeRoom.durationSeconds,
                  startedAt,
                }),
                ...botMessages.filter((item) => "type" in item),
              ],
              chatMessages: [
                ...room.chatMessages,
                createRoomActionMessage(activeRoom.hostName, `${gameTitle} 게임을 시작했습니다.`),
                ...botMessages.filter((item) => !("type" in item)),
              ],
              updatedAt: new Date().toISOString(),
            }
          : room,
      ),
    );
    setOpenedGame(activeRoom.gameId);
  };
  const handleScore = (gameId: PlayableGameId, score: number) => {
    if (activeRoomId) {
      saveRooms(
        rooms.map((room) =>
          room.id === activeRoomId
            ? {
                ...room,
                systemEvents: [
                  ...room.systemEvents,
                  buildSystemMessage("score", { userId: MY_USER_ID, name: MY_USER_NAME, score, gameId }),
                ],
                chatMessages: [
                  ...room.chatMessages,
                  { id: `result-${Date.now() + 1}`, name: MY_USER_NAME, text: `${MY_USER_NAME} 점수 ${score}`, createdAt: new Date().toISOString() },
                ],
                updatedAt: new Date().toISOString(),
              }
            : room,
        ),
      );
      return;
    }
    const next = { ...scores, [gameId]: Math.max(scores[gameId] || 0, score) };
    setScores(next);
    saveStoredEntertainmentScores(next);
    void recordEntertainmentScoreEvent(gameId, score);
    if (gameId === "tetris" && next.tetris >= 180) awardBadge({ id: "badge-tetris-master", name: "블록 마스터", description: "테트리스 180점 이상을 달성했습니다.", icon: "🧱" });
    if (gameId === "resource-rush" && next["resource-rush"] >= 220) awardBadge({ id: "badge-resource-rush", name: "러시 전략가", description: "리소스 러시에서 220점 이상을 달성했습니다.", icon: "💎" });
    if (gameId === "fitcraft-island" && next["fitcraft-island"] >= 160) awardBadge({ id: "badge-fitcraft-island", name: "월드 빌더", description: "FitCraft Island에서 160점 이상을 달성했습니다.", icon: "🧩" });
  };

  const handleStrategySpawn = (unitType: StrategyUnitType) => {
    if (!activeRoom?.gameState || activeRoom.gameId !== "pulse-frontier") return;
    const strategyState = activeRoom.gameState as ReturnType<typeof createPulseFrontierState>;
    const baseTile = strategyState.tiles.find((tile) => tile.baseOwnerUserId === MY_USER_ID);
    if (!baseTile) return;
    commitStrategyAction(
      { type: "spawn-unit", userId: MY_USER_ID, unitType, x: baseTile.x, y: baseTile.y },
      `${unitType} 유닛을 생산했습니다.`,
    );
  };

  const handleStrategyMove = (unitId: string, x: number, y: number) => {
    commitStrategyAction(
      { type: "move-unit", userId: MY_USER_ID, unitId, toX: x, toY: y },
      `유닛을 (${x + 1}, ${y + 1}) 칸으로 이동했습니다.`,
    );
  };

  const handleStrategyAttack = (unitId: string, targetUnitId: string) => {
    commitStrategyAction(
      { type: "attack-unit", userId: MY_USER_ID, unitId, targetUnitId },
      "적 유닛을 공격했습니다.",
    );
  };

  const handleStrategyCapture = (unitId: string, x: number, y: number) => {
    commitStrategyAction(
      { type: "capture-tile", userId: MY_USER_ID, unitId, x, y },
      `(${x + 1}, ${y + 1}) 타일을 점령했습니다.`,
    );
  };

  const handleStrategyEndTurn = () => {
    commitStrategyAction(
      { type: "end-turn", userId: MY_USER_ID },
      "턴을 종료했습니다.",
    );
  };

  const handleSandboxAction = (action: SandboxAction) => {
    if (!activeRoom?.gameState || activeRoom.gameId !== "fitcraft-island") return;
    const world = activeRoom.gameState as SandboxWorldState;
    const nextWorld = reduceSandboxState(world, action);

    saveRooms(
      rooms.map((room) =>
        room.id === activeRoom.id
          ? {
              ...room,
              gameState: nextWorld,
              systemEvents: [
                ...room.systemEvents,
                buildSystemMessage("resolve", { action: action.type, worldVersion: nextWorld.version }),
              ],
              chatMessages: [...room.chatMessages, createRoomActionMessage(MY_USER_NAME, `월드를 수정했습니다: ${action.type}`)],
              updatedAt: new Date().toISOString(),
            }
          : room,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">엔터테인먼트</h1>
          <Button onClick={() => setShowCreate((value) => !value)} className="gap-2"><Plus className="h-4 w-4" />챌린지 만들기</Button>
        </div>
        <Tabs defaultValue="games" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="games">게임</TabsTrigger>
            <TabsTrigger value="challenge">챌린지</TabsTrigger>
            <TabsTrigger value="mine">나의 챌린지</TabsTrigger>
          </TabsList>
          <TabsContent value="games" className="space-y-4">
            <Tabs defaultValue="mini" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mini">미니게임</TabsTrigger>
                <TabsTrigger value="multi">멀티게임</TabsTrigger>
              </TabsList>
              <TabsContent value="mini" className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-primary" />미니게임</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      {miniGames.map((game) => (
                        <button key={game.id} type="button" className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30" onClick={() => {
                          if (game.id === "pulse-frontier") {
                            const practiceRoom: MultiRoom = {
                              id: `practice-${Date.now()}`,
                              title: "Pulse Frontier 연습 매치",
                              hostId: MY_USER_ID,
                              hostName: MY_USER_NAME,
                              gameId: "pulse-frontier",
                              mode: "strategy",
                              roomStatus: "running",
                              visibility: "public",
                              editableBy: "host",
                              durationSeconds: undefined,
                              teamMode: false,
                              participants: [{ userId: MY_USER_ID, name: MY_USER_NAME, teamId: "alpha", ready: true }, { ...buildBotParticipant([]), teamId: "beta", ready: true }],
                              chatMessages: [],
                              systemEvents: [],
                              maxPlayers: 2,
                              gameState: createPulseFrontierState([{ userId: MY_USER_ID, name: MY_USER_NAME }, buildBotParticipant([])], 12),
                              updatedAt: new Date().toISOString(),
                            };
                            saveRooms([practiceRoom, ...rooms]);
                            setActiveRoomId(practiceRoom.id);
                            setOpenedGame(game.id);
                            return;
                          }
                          if (game.id === "fitcraft-island") {
                            const worldRoom: MultiRoom = {
                              id: `sandbox-${Date.now()}`,
                              title: "FitCraft Island 연습 월드",
                              hostId: MY_USER_ID,
                              hostName: MY_USER_NAME,
                              gameId: "fitcraft-island",
                              mode: "sandbox",
                              roomStatus: "running",
                              visibility: "public",
                              editableBy: "everyone",
                              durationSeconds: undefined,
                              teamMode: false,
                              participants: [{ userId: MY_USER_ID, name: MY_USER_NAME, ready: true }],
                              chatMessages: [],
                              systemEvents: [],
                              maxPlayers: 8,
                              gameState: createFitCraftWorld(MY_USER_ID, "FitCraft Island 연습 월드"),
                              updatedAt: new Date().toISOString(),
                            };
                            saveRooms([worldRoom, ...rooms]);
                            setActiveRoomId(worldRoom.id);
                            setOpenedGame(game.id);
                            return;
                          }
                          setActiveRoomId(null); setOpenedGame(game.id);
                        }}>
                          <div className="font-semibold">{game.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{game.summary}</div>
                          <div className="mt-3 text-xs text-primary">최고 점수 {scores[game.id] || 0}</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />대표 배지</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      {featuredBadges.map((badge) => (
                        <button key={badge.id} type="button" onClick={() => setExpandedBadge(badge.id)} className="rounded-3xl border bg-gradient-to-br from-primary/18 via-accent/24 to-secondary/70 p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5">
                          <div className="text-4xl">{badge.icon}</div>
                          <div className="mt-4 text-lg font-semibold">{badge.name}</div>
                          <div className="mt-2 text-sm text-muted-foreground">{badge.detail}</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>게임 순위</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{miniGames.map((game) => <Button key={game.id} variant={rankingGame === game.id ? "default" : "outline"} onClick={() => setRankingGame(game.id)}>{game.title}</Button>)}</div>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Button variant={rankingMode === "weekly" ? "default" : "outline"} onClick={() => setRankingMode("weekly")}>주간 순위</Button>
                      <Button variant={rankingMode === "monthly" ? "default" : "outline"} onClick={() => setRankingMode("monthly")}>월간 순위</Button>
                      <Button variant="outline" onClick={() => setShowTopFive((value) => !value)}><Crown className="h-4 w-4" /></Button>
                    </div>
                    {showTopFive ? (
                      <div className="rounded-2xl border p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Crown className="h-4 w-4 text-primary" />역대 TOP 5</div>
                        <div className="space-y-3">{liveTopFive.map((entry, index) => <div key={`${entry.name}-${index}`} className="flex items-center justify-between rounded-xl bg-muted/40 p-3"><div><div className="font-medium">{index + 1}. {entry.name}</div><div className="text-xs text-muted-foreground">{entry.badge}</div></div><div className="text-sm font-semibold text-primary">{entry.score}</div></div>)}</div>
                      </div>
                    ) : (
                      <ScrollArea className="h-72 pr-3"><div className="space-y-3">{currentLeaderboard.map((entry) => <div key={`${entry.userId}-${entry.rank}`} className="flex items-center justify-between rounded-xl border p-4"><div><div className="font-medium">{entry.rank}위 {entry.name}</div><div className="text-xs text-muted-foreground">@{entry.userId}</div></div><div className="text-sm font-semibold text-primary">{entry.score}</div></div>)}</div></ScrollArea>
                    )}
                    {myRanking ? <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm">현재 내 순위: <span className="font-semibold">{myRanking.rank}위</span></div> : null}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="multi" className="space-y-4">
                {activeRoom ? (
                  <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <Card>
                      <CardHeader><CardTitle>{activeRoom.title}</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-2xl border bg-muted/30 p-4 text-sm">방장: <span className="font-semibold">{activeRoom.hostName}</span> · 참여 {activeRoom.participants.length}/{activeRoom.maxPlayers} · 상태 {activeRoom.roomStatus === "running" ? "진행 중" : activeRoom.roomStatus === "finished" ? "종료" : "로비"}</div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border p-3 text-sm"><div className="text-muted-foreground">게임</div><div className="font-semibold">{miniGames.find((item) => item.id === activeRoom.gameId)?.title}</div></div>
                          <div className="rounded-xl border p-3 text-sm"><div className="text-muted-foreground">시간</div><div className="font-semibold">{supportsTimedRounds(activeRoom.gameId) ? `${activeRoom.durationSeconds || 30}초` : "턴제 / 자유 편집"}</div></div>
                          <div className="rounded-xl border p-3 text-sm"><div className="text-muted-foreground">모드</div><div className="font-semibold">{activeRoom.mode === "strategy" ? "전략" : activeRoom.mode === "sandbox" ? "창조형" : activeRoom.teamMode ? "팀전" : "개인전"}</div></div>
                        </div>
                        {activeRoom.hostId === MY_USER_ID ? <div className="space-y-3 rounded-2xl border p-4"><div className="font-medium">방 설정</div><div className="grid gap-2 md:grid-cols-3">{miniGames.map((game) => <Button key={game.id} variant={activeRoom.gameId === game.id ? "default" : "outline"} onClick={() => handleRoomSetting({ gameId: game.id })}>{game.title}</Button>)}</div>{supportsTimedRounds(activeRoom.gameId) ? <div className="grid grid-cols-2 gap-2"><Button variant={activeRoom.durationSeconds === 30 ? "default" : "outline"} onClick={() => handleRoomSetting({ durationSeconds: 30 })}>30초</Button><Button variant={activeRoom.durationSeconds === 60 ? "default" : "outline"} onClick={() => handleRoomSetting({ durationSeconds: 60 })}>60초</Button></div> : <div className="rounded-xl border p-3 text-sm text-muted-foreground">{activeRoom.mode === "strategy" ? "전략 게임은 8 / 12 / 16턴 확장이 다음 단계입니다. 현재는 12턴 기준으로 진행됩니다." : "샌드박스 월드는 시간 제한 없이 자유 편집합니다."}</div>}<div className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>팀전</span><Checkbox checked={activeRoom.teamMode} onCheckedChange={(checked) => handleRoomSetting({ teamMode: checked === true })} /></div><Button variant="outline" className="w-full" onClick={() => handleAddBotToRoom(activeRoom.id)} disabled={activeRoom.participants.length >= activeRoom.maxPlayers}>CPU 참가자 추가</Button><Button className="w-full gap-2" onClick={handleStartRoom}><Swords className="h-4 w-4" />게임 시작</Button></div> : null}
                        <div className="rounded-2xl border p-4"><div className="mb-3 flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-primary" />참여자</div><div className="grid gap-2">{activeRoom.participants.map((participant) => <div key={participant.userId} className="rounded-xl bg-muted/30 px-3 py-2 text-sm">{participant.name}{participant.isBot ? " · CPU" : ""}</div>)}</div></div>
                        {activeRoomStart ? <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm">현재 진행 중: <span className="font-semibold">{miniGames.find((game) => game.id === activeRoomStart.gameId)?.title}</span>{supportsTimedRounds(activeRoomStart.gameId) ? ` · ${activeRoomStart.durationSeconds || 30}초` : activeRoom.mode === "strategy" ? " · 12턴 경기" : " · 자유 편집"}</div> : null}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>방 채팅</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {activeRoomScores.length > 0 ? <div className="rounded-2xl border p-4"><div className="mb-3 font-medium">현재 세션 점수</div><div className="space-y-2">{activeRoomScores.map((entry) => <div key={entry.userId} className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-sm"><span>{entry.rank}위 {entry.name}</span><span className="font-semibold text-primary">{entry.score}</span></div>)}</div></div> : null}
                        <ScrollArea className="h-80 rounded-2xl border p-3"><div className="space-y-3">{activeRoom.chatMessages.length === 0 ? <div className="text-sm text-muted-foreground">아직 대화가 없습니다.</div> : activeRoom.chatMessages.map((message) => <div key={message.id} className="rounded-xl bg-muted/30 p-3 text-sm"><div className="font-medium">{message.name}</div><div className="mt-1">{message.text}</div></div>)}</div></ScrollArea>
                        <div className="flex gap-2"><Input value={roomChatInput} onChange={(event) => setRoomChatInput(event.target.value)} placeholder="채팅 입력" /><Button onClick={handleRoomChat}>전송</Button></div>
                        <Button variant="outline" className="w-full" onClick={() => setActiveRoomId(null)}>세션 목록으로</Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">멀티게임</h2><Button onClick={() => setShowRoomCreate((value) => !value)} className="gap-2"><Plus className="h-4 w-4" />세션 열기</Button></div>
                    {showRoomCreate ? <Card><CardHeader><CardTitle>새 멀티게임 세션</CardTitle></CardHeader><CardContent className="space-y-4"><Input value={roomTitle} onChange={(event) => setRoomTitle(event.target.value)} placeholder="세션 이름" /><div className="grid gap-2 md:grid-cols-3">{miniGames.map((game) => <Button key={game.id} variant={roomGameId === game.id ? "default" : "outline"} onClick={() => setRoomGameId(game.id)}>{game.title}</Button>)}</div>{supportsTimedRounds(roomGameId) ? <div className="grid grid-cols-2 gap-2"><Button variant={roomDuration === 30 ? "default" : "outline"} onClick={() => setRoomDuration(30)}>30초</Button><Button variant={roomDuration === 60 ? "default" : "outline"} onClick={() => setRoomDuration(60)}>60초</Button></div> : roomGameId === "pulse-frontier" ? <div className="rounded-xl border p-3 text-sm text-muted-foreground">Pulse Frontier는 현재 12턴 제한 전략전으로 생성됩니다.</div> : <div className="rounded-xl border p-3 text-sm text-muted-foreground">FitCraft Island는 시간 제한 없이 공유 월드로 생성됩니다.</div>}<div className="flex items-center justify-between rounded-xl border p-3 text-sm"><span>팀전으로 생성</span><Checkbox checked={teamMode} onCheckedChange={(checked) => setTeamMode(checked === true)} /></div><div className="rounded-xl border p-3 text-sm text-muted-foreground">세션을 연 뒤 방장이 CPU 참가자를 추가하면 사람과 컴퓨터가 함께 플레이할 수 있습니다.</div><Button className="w-full" onClick={handleCreateRoom}>세션 생성</Button></CardContent></Card> : null}
                    <div className="space-y-3">{rooms.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">열려 있는 멀티게임 세션이 없습니다.</div> : rooms.map((room) => <Card key={room.id}><CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"><div><div className="font-semibold">{room.title}</div><div className="mt-1 text-sm text-muted-foreground">{miniGames.find((game) => game.id === room.gameId)?.title}{supportsTimedRounds(room.gameId) ? ` · ${room.durationSeconds || 30}초` : room.mode === "strategy" ? " · 12턴" : " · 공유 월드"} · {room.teamMode ? "팀전" : "개인전"} · {room.participants.length}/{room.maxPlayers}</div><div className="mt-1 text-xs text-muted-foreground">CPU {room.participants.filter((participant) => participant.isBot).length}명 포함</div></div><div className="flex gap-2"><Button variant="outline" onClick={() => handleJoinRoom(room.id)}>입장</Button>{room.hostId === MY_USER_ID ? <Button variant="outline" onClick={() => handleAddBotToRoom(room.id)} disabled={room.participants.length >= room.maxPlayers}>CPU 추가</Button> : null}</div></CardContent></Card>)}</div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="challenge" className="space-y-4">
            {showCreate ? <Card><CardHeader><CardTitle>새 챌린지</CardTitle></CardHeader><CardContent className="space-y-4"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="챌린지 제목" /><Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="짧은 설명" /><Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="상세 설명" className="min-h-24" /><Input value={reward} onChange={(event) => setReward(event.target.value)} placeholder="보상" /><div className="grid grid-cols-4 gap-2">{Object.entries(challengeIcons).map(([key, Icon]) => <Button key={key} type="button" variant={selectedIcon === key ? "default" : "outline"} onClick={() => setSelectedIcon(key as ChallengeIcon)}><Icon className="h-4 w-4" /></Button>)}</div><div className="grid gap-3 md:grid-cols-2">{friends.map((friend) => <label key={friend.id} className="flex items-center gap-3 rounded-xl border p-3"><Checkbox checked={false} /><span>{friend.name}</span></label>)}</div><Button className="w-full" onClick={handleCreateChallenge}>생성</Button></CardContent></Card> : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">{challenges.map((challenge) => { const Icon = challengeIcons[challenge.icon]; const joined = challenge.joinedUserIds.includes(MY_USER_ID); return <Card key={challenge.id}><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-2xl bg-primary/12 p-3 text-primary"><Icon className="h-5 w-5" /></div><div><div className="font-semibold">{challenge.title}</div><div className="text-sm text-muted-foreground">{challenge.description}</div></div></div><Button variant="outline" size="sm" onClick={() => setExpandedChallenge(challenge.id)}>상세</Button></div><div className="rounded-xl border p-4 text-sm text-muted-foreground">{challenge.details}</div><div className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between text-sm"><span>진행률</span><span className="font-medium">{challenge.progress}%</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${challenge.progress}%` }} /></div></div><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">보상</span><span className="font-medium text-primary">{challenge.reward}</span></div><Button className="w-full" variant={joined ? "outline" : "default"} onClick={() => handleJoinChallenge(challenge.id)}>{joined ? "참여 중" : "참여하기"}</Button></CardContent></Card>; })}</div>
          </TabsContent>
          <TabsContent value="mine"><div className="space-y-4">{myChallenges.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">참여 중인 챌린지가 없습니다.</div> : myChallenges.map((challenge) => <Card key={challenge.id}><CardContent className="space-y-3 p-5"><div className="flex items-center justify-between"><div className="font-semibold">{challenge.title}</div><div className="text-sm text-primary">{challenge.completedUserIds.includes(MY_USER_ID) ? "완료" : "진행 중"}</div></div><div className="text-sm text-muted-foreground">{challenge.description}</div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${challenge.progress}%` }} /></div></CardContent></Card>)}</div></TabsContent>
        </Tabs>
      </div>
      {openedGame ? (
        <div className="fixed inset-0 z-[90] bg-black/55 px-4 py-10">
          <div className="mx-auto max-w-6xl">
            {openedGame === "pulse-frontier" && activeRoom?.gameState ? (
              <StrategyArena
                state={activeRoom.gameState as ReturnType<typeof createPulseFrontierState>}
                myUserId={MY_USER_ID}
                onClose={() => setOpenedGame(null)}
                onSpawnUnit={handleStrategySpawn}
                onMoveUnit={handleStrategyMove}
                onAttackUnit={handleStrategyAttack}
                onCaptureTile={handleStrategyCapture}
                onEndTurn={handleStrategyEndTurn}
              />
            ) : openedGame === "fitcraft-island" && activeRoom?.gameState ? (
              <SandboxArena
                state={activeRoom.gameState as SandboxWorldState}
                canEdit
                onClose={() => setOpenedGame(null)}
                onAction={handleSandboxAction}
              />
            ) : (
              <div className="mx-auto max-w-xl">
                <ArcadeArena
                  gameId={openedGame}
                  bestScore={scores[openedGame] || 0}
                  durationSeconds={activeRoomStart?.durationSeconds || activeRoom?.durationSeconds}
                  onClose={() => setOpenedGame(null)}
                  onScore={(score) => handleScore(openedGame, score)}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
      {expandedBadge ? <div className="fixed inset-0 z-[91] bg-black/45 px-4 py-20" onClick={() => setExpandedBadge(null)}><div className="mx-auto max-w-md rounded-3xl bg-background p-6" onClick={(event) => event.stopPropagation()}>{(() => { const badge = featuredBadges.find((item) => item.id === expandedBadge); return badge ? <div className="space-y-4 text-center"><div className="text-6xl">{badge.icon}</div><div className="text-2xl font-bold">{badge.name}</div><div className="text-sm text-muted-foreground">{badge.detail}</div><Button className="w-full" onClick={() => setExpandedBadge(null)}>닫기</Button></div> : null; })()}</div></div> : null}
      {expandedChallenge ? <div className="fixed inset-0 z-[91] bg-black/45 px-4 py-20" onClick={() => setExpandedChallenge(null)}><div className="mx-auto max-w-lg rounded-3xl bg-background p-6" onClick={(event) => event.stopPropagation()}>{(() => { const challenge = challenges.find((item) => item.id === expandedChallenge); if (!challenge) return null; const Icon = challengeIcons[challenge.icon]; return <div className="space-y-4"><div className="flex items-center gap-3"><div className="rounded-2xl bg-primary/12 p-3 text-primary"><Icon className="h-5 w-5" /></div><div><div className="text-xl font-bold">{challenge.title}</div><div className="text-sm text-muted-foreground">{challenge.description}</div></div></div><div className="rounded-2xl border p-4 text-sm text-muted-foreground">{challenge.details}</div><div className="rounded-2xl border p-4 text-sm">보상: <span className="font-semibold text-primary">{challenge.reward}</span></div><Button className="w-full" onClick={() => setExpandedChallenge(null)}>닫기</Button></div>; })()}</div></div> : null}
    </div>
  );
}
