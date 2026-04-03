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
import { GameArena, type PlayableGameId } from "@/components/entertainment/GameArena";
import { awardBadge } from "@/services/achievementStore";
import { getFriends, type FriendEntry } from "@/services/socialStore";

type ChallengeIcon = "run" | "heart" | "sleep" | "fire" | "team";

type ChallengeEntry = {
  id: string;
  title: string;
  description: string;
  details: string;
  reward: string;
  icon: ChallengeIcon;
  progress: number;
  memberIds: string[];
  joinedUserIds: string[];
  completedUserIds: string[];
};

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "사용자";
const CHALLENGE_KEY = "game_challenges_v6";
const SCORE_KEY = "playable_game_scores_v3";

const challengeIcons: Record<ChallengeIcon, typeof Footprints> = {
  run: Footprints,
  heart: HeartPulse,
  sleep: Moon,
  fire: Flame,
  team: Users,
};

const miniGames: Array<{ id: PlayableGameId; title: string; summary: string }> = [
  { id: "tap-sprint", title: "탭 스프린트", summary: "10초 동안 최대한 빠르게 탭하세요." },
  { id: "reaction-grid", title: "리액션 그리드", summary: "켜지는 칸을 빠르게 눌러 경쟁하세요." },
  { id: "pace-memory", title: "페이스 메모리", summary: "시간 제한 안에 순서를 기억하는 게임입니다." },
  { id: "tetris", title: "테트리스", summary: "시간이 지날수록 빨라지는 퍼즐 게임입니다." },
];

const weeklyLeaderboard = [
  { name: "민서", userId: "minseo", score: 124, rank: 1 },
  { name: "서연", userId: "seoyeon", score: 117, rank: 2 },
  { name: "지우", userId: "jiwoo", score: 104, rank: 3 },
  { name: "하나", userId: "hana", score: 99, rank: 4 },
  { name: "윤호", userId: "yunho", score: 93, rank: 5 },
  { name: "가은", userId: "gaeun", score: 88, rank: 6 },
  { name: MY_USER_NAME, userId: MY_USER_ID, score: 84, rank: 7 },
];

const monthlyLeaderboard = [
  { name: "민서", userId: "minseo", score: 402, rank: 1 },
  { name: "윤호", userId: "yunho", score: 377, rank: 2 },
  { name: "서연", userId: "seoyeon", score: 366, rank: 3 },
  { name: "지우", userId: "jiwoo", score: 341, rank: 4 },
  { name: MY_USER_NAME, userId: MY_USER_ID, score: 328, rank: 5 },
  { name: "하나", userId: "hana", score: 315, rank: 6 },
];

const allTimeTop = [
  { name: "민서", score: 1860, badge: "Grand Master" },
  { name: "서연", score: 1730, badge: "Rhythm Queen" },
  { name: "지우", score: 1688, badge: "Memory Ace" },
  { name: "윤호", score: 1612, badge: "Tetris Pro" },
  { name: "가은", score: 1594, badge: "Speed Legend" },
];

const featuredBadges = [
  { id: "lavender", icon: "💜", name: "라벤더 러너", detail: "7일 이상 꾸준한 러닝 루틴을 완성했을 때 획득합니다." },
  { id: "sub4", icon: "🏁", name: "서브 체이서", detail: "공인 기록과 꾸준한 훈련이 결합된 상위 배지입니다." },
  { id: "mountain", icon: "⛰️", name: "클라임 헌터", detail: "누적 상승고도를 꾸준히 쌓아야 얻을 수 있는 어려운 배지입니다." },
  { id: "ultra", icon: "🔥", name: "울트라 스피릿", detail: "장거리·회복·수면이 모두 안정적일 때 획득 가능합니다." },
];

const communityRooms = [
  { id: "room-speed", title: "스피드 매치", description: "탭 스프린트 기록으로 실시간 경쟁합니다.", members: 12 },
  { id: "room-tetris", title: "테트리스 라운지", description: "테트리스 최고 기록을 갱신하는 방입니다.", members: 8 },
  { id: "room-memory", title: "메모리 챌린지", description: "페이스 메모리로 집중력 대결을 합니다.", members: 15 },
];

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

function getSeedChallenges(): ChallengeEntry[] {
  return [
    {
      id: "seed-run",
      title: "주간 18km 러닝",
      description: "이번 주 18km 이상 러닝을 완성해 보세요.",
      details: "회복 러닝, 템포 러닝, 롱런을 합산해도 됩니다.",
      reward: "라벤더 러너 배지",
      icon: "run",
      progress: 42,
      memberIds: [],
      joinedUserIds: [],
      completedUserIds: [],
    },
    {
      id: "seed-sleep",
      title: "수면 밸런스",
      description: "7일 평균 수면 7시간 20분을 맞춰 보세요.",
      details: "취침과 기상 시간을 일정하게 유지하는 회복 챌린지입니다.",
      reward: "나이트 밸런서 배지",
      icon: "sleep",
      progress: 68,
      memberIds: [],
      joinedUserIds: [],
      completedUserIds: [],
    },
    {
      id: "seed-team",
      title: "그룹 30km",
      description: "친구들과 함께 누적 30km를 채워 보세요.",
      details: "함께 참여할수록 빠르게 달성되는 커뮤니티 챌린지입니다.",
      reward: "커뮤니티 MVP 배지",
      icon: "team",
      progress: 27,
      memberIds: [],
      joinedUserIds: [],
      completedUserIds: [],
    },
  ];
}

function getChallenges() {
  const stored = readJson<ChallengeEntry[]>(CHALLENGE_KEY, []);
  if (stored.length > 0) return stored;
  const next = getSeedChallenges();
  writeJson(CHALLENGE_KEY, next);
  return next;
}

function getScores() {
  return readJson<Record<PlayableGameId, number>>(SCORE_KEY, {
    "tap-sprint": 0,
    "reaction-grid": 0,
    "pace-memory": 0,
    tetris: 0,
  });
}

export default function Game() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([]);
  const [scores, setScores] = useState(getScores());
  const [showCreate, setShowCreate] = useState(false);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [openedGame, setOpenedGame] = useState<PlayableGameId | null>(null);
  const [rankingMode, setRankingMode] = useState<"weekly" | "monthly">("weekly");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");
  const [reward, setReward] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<ChallengeIcon>("run");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useDeviceBackNavigation({
    fallback: "/",
    isRootPage: true,
    onBackWithinPage: () => {
      if (openedGame) {
        setOpenedGame(null);
        return true;
      }
      if (showCreate) {
        setShowCreate(false);
        return true;
      }
      if (expandedChallenge) {
        setExpandedChallenge(null);
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
    setChallenges(getChallenges());
  }, []);

  const currentLeaderboard = rankingMode === "weekly" ? weeklyLeaderboard : monthlyLeaderboard;
  const myChallenges = useMemo(
    () => challenges.filter((item) => item.joinedUserIds.includes(MY_USER_ID) || item.completedUserIds.includes(MY_USER_ID)),
    [challenges],
  );

  const handleJoinChallenge = (challengeId: string) => {
    const next = challenges.map((challenge) => {
      if (challenge.id !== challengeId) return challenge;
      const joinedUserIds = challenge.joinedUserIds.includes(MY_USER_ID)
        ? challenge.joinedUserIds
        : [...challenge.joinedUserIds, MY_USER_ID];
      const progress = Math.min(100, challenge.progress + 20);
      const completedUserIds =
        progress >= 100 && !challenge.completedUserIds.includes(MY_USER_ID)
          ? [...challenge.completedUserIds, MY_USER_ID]
          : challenge.completedUserIds;
      return { ...challenge, joinedUserIds, progress, completedUserIds };
    });
    setChallenges(next);
    writeJson(CHALLENGE_KEY, next);
    const completed = next.find((item) => item.id === challengeId);
    if (completed?.completedUserIds.includes(MY_USER_ID)) {
      awardBadge({
        id: `challenge-${completed.id}`,
        name: completed.title,
        description: `${completed.title} 챌린지를 달성했습니다.`,
        icon: "🏅",
      });
    }
  };

  const handleCreateChallenge = () => {
    if (!title.trim() || !description.trim()) return;
    const next = [
      {
        id: `challenge-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        details: details.trim() || "상세 설명이 아직 없습니다.",
        reward: reward.trim() || "커뮤니티 배지",
        icon: selectedIcon,
        progress: 0,
        memberIds: selectedMembers,
        joinedUserIds: [MY_USER_ID],
        completedUserIds: [],
      },
      ...challenges,
    ];
    setChallenges(next);
    writeJson(CHALLENGE_KEY, next);
    setTitle("");
    setDescription("");
    setDetails("");
    setReward("");
    setSelectedMembers([]);
    setSelectedIcon("run");
    setShowCreate(false);
  };

  const handleScore = (gameId: PlayableGameId, score: number) => {
    const next = { ...scores, [gameId]: Math.max(scores[gameId] || 0, score) };
    setScores(next);
    writeJson(SCORE_KEY, next);
    if (gameId === "tetris" && next.tetris >= 180) {
      awardBadge({
        id: "badge-tetris-master",
        name: "블록 마스터",
        description: "테트리스에서 180점 이상을 달성했습니다.",
        icon: "🧩",
      });
    }
    if (gameId === "tap-sprint" && next["tap-sprint"] >= 60) {
      awardBadge({
        id: "badge-reaction-elite",
        name: "스피드 엘리트",
        description: "탭 스프린트에서 60회 이상을 달성했습니다.",
        icon: "⚡",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav />
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
              <Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="상세 설명" className="min-h-24" />
              <Input value={reward} onChange={(event) => setReward(event.target.value)} placeholder="보상" />
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(challengeIcons).map(([key, Icon]) => (
                  <Button key={key} type="button" variant={selectedIcon === key ? "default" : "outline"} onClick={() => setSelectedIcon(key as ChallengeIcon)}>
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {friends.map((friend) => (
                  <label key={friend.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <Checkbox
                      checked={selectedMembers.includes(friend.id)}
                      onCheckedChange={() =>
                        setSelectedMembers((current) =>
                          current.includes(friend.id) ? current.filter((item) => item !== friend.id) : [...current, friend.id],
                        )
                      }
                    />
                    <span>{friend.name}</span>
                  </label>
                ))}
              </div>
              <Button className="w-full" onClick={handleCreateChallenge}>
                생성
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="games" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="games">게임</TabsTrigger>
            <TabsTrigger value="challenge">챌린지</TabsTrigger>
            <TabsTrigger value="mine">나의 챌린지</TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-primary" />
                    미니게임
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {miniGames.map((game) => (
                    <button key={game.id} type="button" className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30" onClick={() => setOpenedGame(game.id)}>
                      <div className="font-semibold">{game.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{game.summary}</div>
                      <div className="mt-3 text-xs text-primary">최고 점수 {scores[game.id] || 0}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    같이 즐기기
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {communityRooms.map((room) => (
                    <div key={room.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{room.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{room.description}</div>
                        </div>
                        <Button variant="outline" size="sm">입장</Button>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">참여 중 {room.members}명</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>게임 순위</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={rankingMode === "weekly" ? "default" : "outline"} onClick={() => setRankingMode("weekly")}>
                      주간 순위
                    </Button>
                    <Button variant={rankingMode === "monthly" ? "default" : "outline"} onClick={() => setRankingMode("monthly")}>
                      월간 순위
                    </Button>
                  </div>
                  <ScrollArea className="h-60 pr-3">
                    <div className="space-y-3">
                      {currentLeaderboard.map((entry) => (
                        <div key={`${rankingMode}-${entry.userId}`} className="flex items-center justify-between rounded-xl border p-3">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-primary" />
                            <span className="font-medium">{entry.rank}. {entry.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{entry.score} pt</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>역대 TOP 5</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allTimeTop.map((entry, index) => (
                    <div key={`${entry.name}-${index}`} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{index + 1}. {entry.name}</div>
                          <div className="text-xs text-muted-foreground">{entry.badge}</div>
                        </div>
                        <div className="text-sm text-primary">{entry.score} pt</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="challenge" className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-primary/25 bg-gradient-to-br from-primary/12 to-primary/5">
              <CardHeader>
                <CardTitle>이번 주 챌린지</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {challenges.map((challenge) => {
                  const Icon = challengeIcons[challenge.icon];
                  const expanded = expandedChallenge === challenge.id;
                  const joined = challenge.joinedUserIds.includes(MY_USER_ID);
                  const completed = challenge.completedUserIds.includes(MY_USER_ID);
                  return (
                    <div key={challenge.id} className="rounded-2xl border bg-background/80 p-4">
                      <button type="button" className="w-full text-left" onClick={() => setExpandedChallenge((current) => (current === challenge.id ? null : challenge.id))}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 font-semibold">
                              <Icon className="h-4 w-4 text-primary" />
                              {challenge.title}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{challenge.description}</div>
                          </div>
                          <div className="text-xs text-primary">{challenge.reward}</div>
                        </div>
                      </button>
                      <Progress value={challenge.progress} className="mt-3" />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">{challenge.progress}% · {completed ? "완료" : "진행 중"}</div>
                        {!joined && !completed ? (
                          <Button size="sm" variant="outline" onClick={() => handleJoinChallenge(challenge.id)}>
                            참여
                          </Button>
                        ) : null}
                      </div>
                      {expanded ? (
                        <div className="mt-4 rounded-xl border bg-muted/20 p-4">
                          <div className="flex items-center gap-2 font-medium">
                            <BookOpenText className="h-4 w-4 text-primary" />
                            상세 설명
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">{challenge.details}</div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>주간 리더보드</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScrollArea className="h-72 pr-3">
                    <div className="space-y-3">
                      {weeklyLeaderboard.map((entry) => (
                        <button
                          key={entry.userId}
                          type="button"
                          onClick={() => navigate(`/profile/${encodeURIComponent(entry.userId)}`, { state: { from: "/game", profile: { name: entry.name, userId: entry.userId, rank: entry.rank, score: `${entry.score} pt`, subtitle: "주간 리더보드" } } })}
                          className="flex w-full items-center justify-between rounded-xl border p-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Medal className="h-4 w-4 text-primary" />
                            <span className="font-medium">{entry.rank}. {entry.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{entry.score} pt</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">현재 순위: <span className="font-semibold">7위</span> / 84 pt</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>대표 배지</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {featuredBadges.map((badge) => (
                    <button key={badge.id} type="button" className="rounded-3xl border p-4 text-left transition-colors hover:bg-muted/20" onClick={() => setExpandedBadge((current) => current === badge.id ? null : badge.id)}>
                      <div className="flex flex-col items-start gap-3">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-primary/25 via-primary/10 to-accent/50 text-5xl shadow-inner">
                          {badge.icon}
                        </div>
                        <div className="font-semibold">{badge.name}</div>
                      </div>
                      {expandedBadge === badge.id ? <div className="mt-3 text-xs leading-5 text-muted-foreground">{badge.detail}</div> : null}
                    </button>
                  ))}
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
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">아직 참여 중이거나 완료한 챌린지가 없습니다.</div>
                ) : (
                  myChallenges.map((challenge) => (
                    <div key={challenge.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{challenge.title}</div>
                          <div className="text-sm text-muted-foreground">{challenge.description}</div>
                        </div>
                        <div className="text-xs text-primary">{challenge.completedUserIds.includes(MY_USER_ID) ? "완료" : "진행 중"}</div>
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

      {openedGame ? (
        <div className="fixed inset-0 z-50 bg-background/95 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl">
            <GameArena
              gameId={openedGame}
              bestScore={scores[openedGame] || 0}
              onClose={() => setOpenedGame(null)}
              onScore={(score) => handleScore(openedGame, score)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
