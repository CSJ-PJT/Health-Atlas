import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpenText,
  Flame,
  Footprints,
  Gamepad2,
  HeartPulse,
  Medal,
  Moon,
  Plus,
  Shapes,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getFriends, type FriendEntry } from "@/services/socialStore";

type ChallengeIcon = "run" | "heart" | "sleep" | "fire" | "team";
type MiniGameId = "tap-sprint" | "breath-focus" | "pace-memory";

type ChallengeEntry = {
  id: string;
  title: string;
  description: string;
  details: string;
  progress: number;
  reward: string;
  icon: ChallengeIcon;
  memberIds: string[];
  joinedUserIds: string[];
  completedUserIds: string[];
};

type MiniGameEntry = {
  id: MiniGameId;
  title: string;
  description: string;
  detail: string;
  icon: typeof Gamepad2;
  scoreLabel: string;
};

const CHALLENGE_KEY = "game_challenges_v4";
const MINI_GAME_SCORE_KEY = "mini_game_scores_v1";
const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "사용자";

const challengeIcons: Array<{ key: ChallengeIcon; label: string; Icon: typeof Footprints }> = [
  { key: "run", label: "러닝", Icon: Footprints },
  { key: "heart", label: "회복", Icon: HeartPulse },
  { key: "sleep", label: "수면", Icon: Moon },
  { key: "fire", label: "집중", Icon: Flame },
  { key: "team", label: "그룹", Icon: Users },
];

const localizedBadges: Record<string, { name: string; detail: string; icon: typeof Sparkles }[]> = {
  ko: [
    { name: "라벤더 러너", detail: "7일 이상 러닝 루틴을 안정적으로 이어간 사용자에게 주어지는 대표 배지입니다.", icon: Sparkles },
    { name: "리커버리 마스터", detail: "회복, 수면, 스트레칭을 균형 있게 관리한 사용자에게 주어집니다.", icon: HeartPulse },
    { name: "케이던스 키퍼", detail: "러닝 리듬과 주법의 일관성이 좋은 기록을 남긴 배지입니다.", icon: Shapes },
    { name: "나이트 밸런서", detail: "늦은 시간대에도 수면 균형을 잘 유지한 사용자를 위한 배지입니다.", icon: Moon },
  ],
  en: [
    { name: "Lavender Runner", detail: "Awarded for maintaining a stable running routine for at least 7 days.", icon: Sparkles },
    { name: "Recovery Master", detail: "Given to users who balance recovery, sleep, and stretching consistently.", icon: HeartPulse },
    { name: "Cadence Keeper", detail: "Recognizes steady rhythm and running cadence over time.", icon: Shapes },
    { name: "Night Balancer", detail: "Marks stable sleep balance even with late-night schedules.", icon: Moon },
  ],
};

const miniGames: MiniGameEntry[] = [
  {
    id: "tap-sprint",
    title: "탭 스프린트",
    description: "10초 동안 최대한 빠르게 탭해 점수를 올립니다.",
    detail: "순간 집중력과 반응 속도를 겨루는 미니 게임입니다.",
    icon: Gamepad2,
    scoreLabel: "탭",
  },
  {
    id: "breath-focus",
    title: "브레스 포커스",
    description: "4초 들숨, 4초 날숨 리듬을 맞춰 평정 점수를 얻습니다.",
    detail: "호흡 리듬 유지가 핵심인 회복형 미니 게임입니다.",
    icon: HeartPulse,
    scoreLabel: "리듬",
  },
  {
    id: "pace-memory",
    title: "페이스 메모리",
    description: "표시된 페이스 시퀀스를 기억해서 순서대로 맞춥니다.",
    detail: "러닝 감각과 순간 기억력을 합친 패턴 게임입니다.",
    icon: Shapes,
    scoreLabel: "정답",
  },
];

function getWeekKey(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return `${date.getFullYear()}-W${week}`;
}

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getLocalizedBadges() {
  const language = (localStorage.getItem("app_language") || navigator.language || "en").toLowerCase();
  if (language.startsWith("ko")) return localizedBadges.ko;
  return localizedBadges.en;
}

function buildWeeklySeedChallenges(): ChallengeEntry[] {
  const weekKey = getWeekKey();
  const weekSeed = Number(weekKey.replace(/\D/g, "").slice(-3)) || 1;

  return [
    {
      id: `${weekKey}-challenge-run`,
      title: "주간 러닝 스택",
      description: "이번 주 총 18km 이상 러닝 기록하기",
      details: "러닝 세션을 꾸준히 이어가며 누적 거리를 채우는 기본 챌린지입니다. 회복 러닝도 인정됩니다.",
      reward: "라벤더 러너 배지",
      progress: 30 + (weekSeed % 45),
      icon: "run",
      memberIds: [],
      joinedUserIds: [],
      completedUserIds: [],
    },
    {
      id: `${weekKey}-challenge-recovery`,
      title: "회복 밸런스",
      description: "이번 주 평균 수면 7시간 20분 유지하기",
      details: "취침과 기상 시간을 최대한 일정하게 유지하고 수면 기록을 채우는 회복형 챌린지입니다.",
      reward: "리커버리 마스터",
      progress: 25 + ((weekSeed * 2) % 55),
      icon: "sleep",
      memberIds: [],
      joinedUserIds: [],
      completedUserIds: [],
    },
    {
      id: `${weekKey}-challenge-group`,
      title: "그룹 동행 미션",
      description: "친구 2명 이상과 함께 누적 30km 채우기",
      details: "함께 참여한 친구들의 기록을 합쳐 누적 거리를 채우는 커뮤니티 챌린지입니다.",
      reward: "그룹 MVP 타이틀",
      progress: 18 + ((weekSeed * 3) % 60),
      icon: "team",
      memberIds: [],
      joinedUserIds: [],
      completedUserIds: [],
    },
  ];
}

function readChallenges() {
  const stored = readJson<{ weekKey: string; challenges: ChallengeEntry[] } | null>(CHALLENGE_KEY, null);
  const weekKey = getWeekKey();
  if (!stored || stored.weekKey !== weekKey) {
    const seeded = buildWeeklySeedChallenges();
    writeJson(CHALLENGE_KEY, { weekKey, challenges: seeded });
    return seeded;
  }
  return stored.challenges;
}

function writeChallenges(challenges: ChallengeEntry[]) {
  writeJson(CHALLENGE_KEY, { weekKey: getWeekKey(), challenges });
}

function syncCompletedChallenges(challenges: ChallengeEntry[]) {
  let changed = false;
  const next = challenges.map((challenge) => {
    if (challenge.progress >= 100 && !challenge.completedUserIds.includes(MY_USER_ID)) {
      changed = true;
      return {
        ...challenge,
        joinedUserIds: challenge.joinedUserIds.includes(MY_USER_ID)
          ? challenge.joinedUserIds
          : [...challenge.joinedUserIds, MY_USER_ID],
        completedUserIds: [...challenge.completedUserIds, MY_USER_ID],
      };
    }
    return challenge;
  });

  if (changed) {
    writeChallenges(next);
  }
  return next;
}

function getGameScores() {
  return readJson<Record<MiniGameId, number>>(MINI_GAME_SCORE_KEY, {
    "tap-sprint": 42,
    "breath-focus": 37,
    "pace-memory": 15,
  });
}

function saveGameScores(scores: Record<MiniGameId, number>) {
  writeJson(MINI_GAME_SCORE_KEY, scores);
}

const leaderboard = [
  { name: "민서", userId: "minseo", score: 124, rank: 1 },
  { name: "서연", userId: "seoyeon", score: 117, rank: 2 },
  { name: "지우", userId: "jiwoo", score: 104, rank: 3 },
  { name: "하나", userId: "hana", score: 99, rank: 4 },
  { name: "윤호", userId: "yunho", score: 93, rank: 5 },
  { name: "가은", userId: "gaeun", score: 88, rank: 6 },
  { name: MY_USER_NAME, userId: MY_USER_ID, score: 84, rank: 7 },
];

const miniGameLeaderboard = [
  { name: "민서", score: 92 },
  { name: "서연", score: 87 },
  { name: "지우", score: 80 },
  { name: MY_USER_NAME, score: 74 },
  { name: "하나", score: 69 },
  { name: "윤호", score: 61 },
];

const Game = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([]);
  const [gameScores, setGameScores] = useState<Record<MiniGameId, number>>(getGameScores());
  const [showCreate, setShowCreate] = useState(false);
  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(null);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");
  const [reward, setReward] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<ChallengeIcon>("run");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameId>("tap-sprint");

  useDeviceBackNavigation({
    fallback: "/",
    isRootPage: true,
    onBackWithinPage: () => {
      if (showCreate) {
        setShowCreate(false);
        return true;
      }
      if (expandedChallengeId) {
        setExpandedChallengeId(null);
        return true;
      }
      if (expandedBadge) {
        setExpandedBadge(null);
        return true;
      }
      return false;
    },
  });

  useEffect(() => {
    setFriends(getFriends());
    setChallenges(syncCompletedChallenges(readChallenges()));
    setGameScores(getGameScores());
  }, []);

  const badges = useMemo(() => getLocalizedBadges(), []);
  const myChallenges = useMemo(
    () => challenges.filter((challenge) => challenge.joinedUserIds.includes(MY_USER_ID) || challenge.completedUserIds.includes(MY_USER_ID)),
    [challenges],
  );
  const myLeaderboardEntry = leaderboard.find((entry) => entry.userId === MY_USER_ID) || { name: MY_USER_NAME, score: 84, rank: 7 };

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const handleCreateChallenge = () => {
    if (!title.trim() || !description.trim()) return;

    const next: ChallengeEntry[] = [
      {
        id: `challenge-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        details: details.trim() || "상세 설명이 아직 입력되지 않았습니다.",
        reward: reward.trim() || "커뮤니티 배지",
        progress: 0,
        icon: selectedIcon,
        memberIds: selectedMembers,
        joinedUserIds: [MY_USER_ID],
        completedUserIds: [],
      },
      ...challenges,
    ];

    setChallenges(next);
    writeChallenges(next);
    setTitle("");
    setDescription("");
    setDetails("");
    setReward("");
    setSelectedIcon("run");
    setSelectedMembers([]);
    setShowCreate(false);
  };

  const handleJoinChallenge = (challengeId: string) => {
    const next = syncCompletedChallenges(
      challenges.map((challenge) =>
        challenge.id === challengeId
          ? {
              ...challenge,
              joinedUserIds: challenge.joinedUserIds.includes(MY_USER_ID) ? challenge.joinedUserIds : [...challenge.joinedUserIds, MY_USER_ID],
              progress: Math.min(100, challenge.progress + 20),
            }
          : challenge,
      ),
    );
    setChallenges(next);
    writeChallenges(next);
  };

  const playMiniGame = (gameId: MiniGameId) => {
    const increment = gameId === "tap-sprint" ? 8 : gameId === "breath-focus" ? 6 : 4;
    const next = {
      ...gameScores,
      [gameId]: gameScores[gameId] + increment,
    };
    setGameScores(next);
    saveGameScores(next);
  };

  const renderChallengeCard = (challenge: ChallengeEntry) => {
    const iconMeta = challengeIcons.find((item) => item.key === challenge.icon) || challengeIcons[0];
    const Icon = iconMeta.Icon;
    const joined = challenge.joinedUserIds.includes(MY_USER_ID);
    const completed = challenge.completedUserIds.includes(MY_USER_ID);
    const expanded = expandedChallengeId === challenge.id;

    return (
      <button
        key={challenge.id}
        type="button"
        onClick={() => setExpandedChallengeId((current) => (current === challenge.id ? null : challenge.id))}
        className="w-full rounded-2xl border bg-background/80 p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Icon className="h-4 w-4 text-primary" />
              {challenge.title}
            </div>
            <div className="text-sm text-muted-foreground">{challenge.description}</div>
            <div className="text-xs text-muted-foreground">참여 인원 {challenge.memberIds.length > 0 ? challenge.memberIds.length : 1}명</div>
          </div>
          <div className="text-xs text-primary">{challenge.reward}</div>
        </div>
        <Progress value={challenge.progress} className="mt-3" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{challenge.progress}% 달성 {completed ? "완료" : "진행 중"}</div>
          {!joined && !completed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                handleJoinChallenge(challenge.id);
              }}
            >
              참여하기
            </Button>
          ) : null}
        </div>
        {expanded ? (
          <div className="mt-4 space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BookOpenText className="h-4 w-4 text-primary" />
              상세 설명
            </div>
            <div className="text-sm leading-6 text-muted-foreground">{challenge.details}</div>
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">엔터테인먼트</h1>
          <Button onClick={() => setShowCreate((value) => !value)} className="gap-2">
            <Plus className="h-4 w-4" />
            챌린지 만들기
          </Button>
        </div>

        {showCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>새 챌린지</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="챌린지 제목" />
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="짧은 설명" />
              <Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="상세 설명" className="min-h-28" />
              <Input value={reward} onChange={(event) => setReward(event.target.value)} placeholder="보상" />

              <div className="space-y-3">
                <div className="text-sm font-medium">챌린지 아이콘</div>
                <div className="grid grid-cols-5 gap-2">
                  {challengeIcons.map(({ key, label, Icon }) => (
                    <Button
                      key={key}
                      type="button"
                      variant={selectedIcon === key ? "default" : "outline"}
                      className="flex h-auto flex-col gap-2 py-3"
                      onClick={() => setSelectedIcon(key)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">같이할 친구 선택</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {friends.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">추가된 친구가 없습니다.</div>
                  ) : (
                    friends.map((friend) => (
                      <label key={friend.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <Checkbox checked={selectedMembers.includes(friend.id)} onCheckedChange={() => handleToggleMember(friend.id)} />
                        <div className="min-w-0">
                          <div className="font-medium">{friend.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{friend.phone}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <Button onClick={handleCreateChallenge} className="w-full">
                생성하기
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="challenge" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="challenge">챌린지</TabsTrigger>
            <TabsTrigger value="games">게임</TabsTrigger>
            <TabsTrigger value="mine">나의 챌린지</TabsTrigger>
          </TabsList>

          <TabsContent value="challenge" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-primary/25 bg-gradient-to-br from-primary/12 to-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    이번 주 챌린지
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">{challenges.map(renderChallengeCard)}</CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      주간 리더보드
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ScrollArea className={leaderboard.length > 5 ? "h-72 pr-3" : ""}>
                      <div className="space-y-3">
                        {leaderboard.map((entry) => (
                          <button
                            key={entry.userId}
                            type="button"
                            onClick={() =>
                              navigate(`/profile/${encodeURIComponent(entry.userId)}`, {
                                state: {
                                  from: "/game",
                                  profile: {
                                    name: entry.name,
                                    userId: entry.userId,
                                    score: `${entry.score} pt`,
                                    rank: entry.rank,
                                    subtitle: "주간 리더보드",
                                  },
                                },
                              })
                            }
                            className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/40"
                          >
                            <div className="flex items-center gap-3">
                              <Medal className="h-4 w-4 text-primary" />
                              <span className="font-medium">
                                {entry.rank}. {entry.name}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">{entry.score} pt</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                      현재 순위: <span className="font-semibold">{myLeaderboardEntry.rank}위</span> / {myLeaderboardEntry.score} pt
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      대표 배지
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    {badges.map((badge) => {
                      const Icon = badge.icon;
                      const expanded = expandedBadge === badge.name;
                      return (
                        <button
                          key={badge.name}
                          type="button"
                          onClick={() => setExpandedBadge((current) => (current === badge.name ? null : badge.name))}
                          className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30"
                        >
                          <div className="flex flex-col items-start gap-3">
                            <div className="rounded-2xl bg-primary/12 p-4 text-primary">
                              <Icon className="h-8 w-8" />
                            </div>
                            <div className="font-semibold">{badge.name}</div>
                          </div>
                          {expanded ? <div className="mt-3 text-xs leading-5 text-muted-foreground">{badge.detail}</div> : null}
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <Card>
                <CardHeader>
                  <CardTitle>미니 게임</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {miniGames.map((game) => {
                      const Icon = game.icon;
                      return (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => setActiveMiniGame(game.id)}
                          className={`rounded-2xl border p-4 text-left ${activeMiniGame === game.id ? "border-primary bg-primary/8" : "hover:bg-muted/30"}`}
                        >
                          <Icon className="mb-3 h-5 w-5 text-primary" />
                          <div className="font-semibold">{game.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{game.description}</div>
                        </button>
                      );
                    })}
                  </div>

                  {miniGames
                    .filter((game) => game.id === activeMiniGame)
                    .map((game) => {
                      const Icon = game.icon;
                      return (
                        <div key={game.id} className="rounded-2xl border bg-muted/20 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 text-lg font-semibold">
                                <Icon className="h-5 w-5 text-primary" />
                                {game.title}
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">{game.detail}</div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="text-muted-foreground">내 최고 점수</div>
                              <div className="text-lg font-semibold">{gameScores[game.id]} {game.scoreLabel}</div>
                            </div>
                          </div>
                          <Button onClick={() => playMiniGame(game.id)} className="mt-4">
                            플레이하기
                          </Button>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>게임 순위</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScrollArea className={miniGameLeaderboard.length > 5 ? "h-72 pr-3" : ""}>
                    <div className="space-y-3">
                      {miniGameLeaderboard.map((entry, index) => (
                        <div key={`${entry.name}-${index}`} className="flex items-center justify-between rounded-xl border p-3">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {index + 1}. {entry.name}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">{entry.score} pt</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                    현재 순위: <span className="font-semibold">4위</span> / 74 pt
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mine">
            <Card>
              <CardHeader>
                <CardTitle>나의 챌린지</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myChallenges.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">참여 중이거나 완료한 챌린지가 없습니다.</div>
                ) : (
                  myChallenges.map((challenge) => (
                    <div key={challenge.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{challenge.title}</div>
                          <div className="text-sm text-muted-foreground">{challenge.description}</div>
                        </div>
                        <div className="text-xs text-primary">{challenge.completedUserIds.includes(MY_USER_ID) ? "완료됨" : "진행 중"}</div>
                      </div>
                      <Progress value={challenge.progress} className="mt-3" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Game;
