import { useEffect, useMemo, useState } from "react";
import { Award, BookOpenText, Flame, Footprints, HeartPulse, Medal, Moon, Plus, Trophy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getFriends, type FriendEntry } from "@/services/socialStore";

type ChallengeIcon = "run" | "heart" | "sleep" | "fire" | "team";

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

const CHALLENGE_KEY = "game_challenges_v3";
const MY_USER_ID = localStorage.getItem("user_id") || "me";

const challengeIcons: Array<{
  key: ChallengeIcon;
  label: string;
  Icon: typeof Footprints;
}> = [
  { key: "run", label: "러닝", Icon: Footprints },
  { key: "heart", label: "회복", Icon: HeartPulse },
  { key: "sleep", label: "수면", Icon: Moon },
  { key: "fire", label: "집중", Icon: Flame },
  { key: "team", label: "그룹", Icon: Users },
];

const localizedBadges: Record<string, string[]> = {
  ko: ["라벤더 러너", "리커버리 마스터", "케이던스 키퍼", "나이트 올 슬리퍼"],
  en: ["Lavender Runner", "Recovery Master", "Cadence Keeper", "Night Owl Sleeper"],
  ja: ["ラベンダーランナー", "リカバリーマスター", "ケイデンスキーパー", "ナイトオウルスリーパー"],
  zh: ["薰衣草跑者", "恢复大师", "步频守护者", "夜猫睡眠家"],
};

const seedChallenges: ChallengeEntry[] = [
  {
    id: "challenge-1",
    title: "7일 러닝 스트릭",
    description: "7일 연속 3km 이상 달리기",
    details: "매일 최소 3km 이상 기록하고, 회복 스트레칭도 함께 수행합니다.",
    reward: "러닝 배지",
    progress: 71,
    icon: "run",
    memberIds: [],
    joinedUserIds: [],
    completedUserIds: [],
  },
  {
    id: "challenge-2",
    title: "수면 회복 챌린지",
    description: "이번 주 평균 수면 7시간 30분 달성",
    details: "취침 시간을 일정하게 유지하고 기상 시간을 기록해 수면 품질을 높입니다.",
    reward: "리커버리 배지",
    progress: 58,
    icon: "sleep",
    memberIds: [],
    joinedUserIds: [],
    completedUserIds: [],
  },
  {
    id: "challenge-3",
    title: "주간 거리 경쟁",
    description: "친구와 이번 주 총 거리 기록 경쟁",
    details: "친구와 함께 주간 누적 거리를 비교하고 회복 상태도 함께 체크합니다.",
    reward: "그룹 MVP 타이틀",
    progress: 83,
    icon: "team",
    memberIds: [],
    joinedUserIds: [],
    completedUserIds: [],
  },
];

function readChallenges() {
  const stored = localStorage.getItem(CHALLENGE_KEY);
  if (!stored) {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(seedChallenges));
    return seedChallenges;
  }
  try {
    return JSON.parse(stored) as ChallengeEntry[];
  } catch {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(seedChallenges));
    return seedChallenges;
  }
}

function writeChallenges(challenges: ChallengeEntry[]) {
  localStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenges));
}

function getLocalizedBadges() {
  const language = (localStorage.getItem("app_language") || navigator.language || "en").toLowerCase();
  if (language.startsWith("ko")) return localizedBadges.ko;
  if (language.startsWith("ja")) return localizedBadges.ja;
  if (language.startsWith("zh")) return localizedBadges.zh;
  return localizedBadges.en;
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

const leaderboard = [
  { name: "민서", score: "124 pt", rank: 1 },
  { name: "서연", score: "117 pt", rank: 2 },
  { name: "지우", score: "104 pt", rank: 3 },
  { name: "하나", score: "99 pt", rank: 4 },
];

const Game = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(null);
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
      if (showCreate) {
        setShowCreate(false);
        return true;
      }
      if (expandedChallengeId) {
        setExpandedChallengeId(null);
        return true;
      }
      return false;
    },
  });

  useEffect(() => {
    setFriends(getFriends());
    setChallenges(syncCompletedChallenges(readChallenges()));
  }, []);

  const badges = useMemo(() => getLocalizedBadges(), []);
  const myChallenges = useMemo(
    () =>
      challenges.filter(
        (challenge) =>
          challenge.joinedUserIds.includes(MY_USER_ID) || challenge.completedUserIds.includes(MY_USER_ID),
      ),
    [challenges],
  );

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const handleCreateChallenge = () => {
    if (!title.trim() || !description.trim()) {
      return;
    }

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
              joinedUserIds: challenge.joinedUserIds.includes(MY_USER_ID)
                ? challenge.joinedUserIds
                : [...challenge.joinedUserIds, MY_USER_ID],
              progress: Math.min(100, challenge.progress + 20),
            }
          : challenge,
      ),
    );
    setChallenges(next);
    writeChallenges(next);
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
            <div className="text-xs text-muted-foreground">
              참여 인원 {challenge.memberIds.length > 0 ? challenge.memberIds.length : 1}명
            </div>
          </div>
          <div className="text-xs text-primary">{challenge.reward}</div>
        </div>
        <Progress value={challenge.progress} className="mt-3" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {challenge.progress}% 달성 {completed ? "· 완료됨" : "· 진행 중"}
          </div>
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
          <h1 className="text-3xl font-bold">게임</h1>
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

        <Tabs defaultValue="community" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="community">커뮤니티 챌린지</TabsTrigger>
            <TabsTrigger value="mine">나의 챌린지</TabsTrigger>
          </TabsList>

          <TabsContent value="community" className="space-y-4">
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
                    {leaderboard.map((entry) => (
                      <button
                        key={entry.name}
                        type="button"
                        onClick={() =>
                          navigate(`/profile/${encodeURIComponent(entry.name)}`, {
                            state: {
                              from: "/game",
                              profile: {
                                name: entry.name,
                                score: entry.score,
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
                        <span className="text-sm text-muted-foreground">{entry.score}</span>
                      </button>
                    ))}
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
                    {badges.map((badge) => (
                      <div key={badge} className="rounded-xl border p-3 text-sm">
                        {badge}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mine">
            <Card>
              <CardHeader>
                <CardTitle>나의 챌린지</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myChallenges.length > 0 ? (
                  myChallenges.map(renderChallengeCard)
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    아직 참여하거나 완료한 챌린지가 없습니다.
                  </div>
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
