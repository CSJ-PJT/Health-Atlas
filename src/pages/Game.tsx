import { useEffect, useState } from "react";
import { Award, Flame, Medal, Plus, Trophy, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getFriends, type FriendEntry } from "@/services/socialStore";

type ChallengeEntry = {
  id: string;
  title: string;
  description: string;
  progress: number;
  reward: string;
  memberIds: string[];
};

const CHALLENGE_KEY = "game_challenges";

const seedChallenges: ChallengeEntry[] = [
  {
    id: "challenge-1",
    title: "7일 러닝 스트릭",
    description: "7일 연속 3km 이상 달리기",
    progress: 71,
    reward: "러닝 배지",
    memberIds: [],
  },
  {
    id: "challenge-2",
    title: "수면 회복 챌린지",
    description: "이번 주 평균 수면 7시간 30분 달성",
    progress: 58,
    reward: "리커버리 배지",
    memberIds: [],
  },
  {
    id: "challenge-3",
    title: "주간 거리 경쟁",
    description: "친구들과 이번 주 총 거리 경쟁",
    progress: 83,
    reward: "그룹 MVP 타이틀",
    memberIds: [],
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

const leaderboard = [
  { name: "민서", score: "124 pt", rank: 1 },
  { name: "서연", score: "117 pt", rank: 2 },
  { name: "지우", score: "104 pt", rank: 3 },
  { name: "하나", score: "99 pt", rank: 4 },
];

const badges = ["Lavender Runner", "Recovery Master", "Cadence Keeper", "Night Owl Sleeper"];

const Game = () => {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    setFriends(getFriends());
    setChallenges(readChallenges());
  }, []);

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
        reward: reward.trim() || "커뮤니티 배지",
        progress: 0,
        memberIds: selectedMembers,
      },
      ...challenges,
    ];

    setChallenges(next);
    writeChallenges(next);
    setTitle("");
    setDescription("");
    setReward("");
    setSelectedMembers([]);
    setShowCreate(false);
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
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="챌린지 설명" />
              <Input value={reward} onChange={(event) => setReward(event.target.value)} placeholder="보상" />
              <div className="space-y-3">
                <div className="text-sm font-medium">함께할 친구 선택</div>
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

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-primary/25 bg-gradient-to-br from-primary/12 to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                이번 주 챌린지
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="rounded-2xl border bg-background/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{challenge.title}</div>
                      <div className="text-sm text-muted-foreground">{challenge.description}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        참여 인원 {challenge.memberIds.length > 0 ? challenge.memberIds.length : 1}명
                      </div>
                    </div>
                    <div className="text-xs text-primary">{challenge.reward}</div>
                  </div>
                  <Progress value={challenge.progress} className="mt-3" />
                  <div className="mt-2 text-xs text-muted-foreground">{challenge.progress}% 달성</div>
                </div>
              ))}
            </CardContent>
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
                  <div key={entry.name} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                      <Medal className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {entry.rank}. {entry.name}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{entry.score}</span>
                  </div>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  커뮤니티 제안
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                친구들과 주간 챌린지를 만들고, 공개 챌린지로 확장해 더 많은 사람과 함께할 수 있습니다.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
