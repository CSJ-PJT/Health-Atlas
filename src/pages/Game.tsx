import { Award, Flame, Medal, Trophy, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Game = () => {
  const challenges = [
    { title: "7일 러닝 스트릭", description: "7일 연속으로 3km 이상 달리기", progress: 71, reward: "라벤더 러너 배지" },
    { title: "수면 회복 챌린지", description: "이번 주 평균 수면 7시간 30분 달성", progress: 58, reward: "리커버리 배지" },
    { title: "친구 주간 경쟁", description: "친구 그룹과 주간 총 거리 경쟁", progress: 83, reward: "그룹 MVP 포인트" },
  ];

  const leaderboard = [
    { name: "민준", score: "124 pt", rank: 1 },
    { name: "서연", score: "117 pt", rank: 2 },
    { name: "나", score: "104 pt", rank: 3 },
    { name: "유나", score: "99 pt", rank: 4 },
  ];

  const badges = ["Lavender Runner", "Recovery Master", "Cadence Keeper", "Night Owl Sleeper"];

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">게임</h1>
          <p className="text-sm text-muted-foreground">챌린지, 배지, 리더보드 중심으로 건강 데이터를 더 재미있게 소비합니다.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-primary/25 bg-gradient-to-br from-primary/12 to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                이번 주 챌린지
              </CardTitle>
              <CardDescription>개인/그룹 미션을 통해 기록과 커뮤니티 참여를 동시에 끌어올립니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {challenges.map((challenge) => (
                <div key={challenge.title} className="rounded-2xl border bg-background/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{challenge.title}</div>
                      <div className="text-sm text-muted-foreground">{challenge.description}</div>
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
                      <span className="font-medium">{entry.rank}. {entry.name}</span>
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
                친구 그룹 단위 주간 챌린지, 특정 경로 완주 배지, 러닝 기록 기반 AI 하이라이트 카드까지 이 탭에 확장할 수 있습니다.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
