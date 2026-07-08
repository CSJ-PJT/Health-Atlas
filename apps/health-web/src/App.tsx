import { useEffect, useMemo, useState } from "react";

import { sampleHealthDashboardData } from "./data/sampleHealthData";
import { loadHealthDashboardData } from "./services/healthDataSource";
import type { HealthDashboardData, HealthDataSourceMode, SyncStatus } from "./types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value: string) {
  if (value === "sample data" || value === "planned" || value === "unconfigured") {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  }).format(date);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sourceLabel(mode: HealthDataSourceMode) {
  switch (mode) {
    case "supabase":
      return "Supabase Connected";
    case "unconfigured":
      return "Supabase Unconfigured";
    case "error":
      return "Sync Error";
    case "sample":
    default:
      return "Sample Preview";
  }
}

function sourceHint(mode: HealthDataSourceMode) {
  switch (mode) {
    case "supabase":
      return "health_data read-only";
    case "unconfigured":
      return "env required";
    case "error":
      return "fallback preview";
    case "sample":
    default:
      return "sample data";
  }
}

function StatusPill({ status }: { status: SyncStatus["status"] }) {
  const label =
    status === "connected" ? "연결됨" : status === "pending" ? "대기" : status === "error" ? "오류" : "비활성";
  return <span className={`status-pill ${status}`}>{label}</span>;
}

function SourceBadge({ mode }: { mode: HealthDataSourceMode }) {
  return (
    <div className={`source-badge ${mode}`} aria-label="데이터 소스">
      <span>{sourceLabel(mode)}</span>
      <small>{sourceHint(mode)}</small>
    </div>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="mini-bars" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function App() {
  const [dashboardData, setDashboardData] = useState<HealthDashboardData>(sampleHealthDashboardData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadHealthDashboardData()
      .then((data) => {
        if (isMounted) {
          setDashboardData(data);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const recentTrend = dashboardData.trend.slice(-7);
  const sevenDaySummary = useMemo(() => {
    const first = recentTrend[0];
    const latest = recentTrend[recentTrend.length - 1];

    return {
      averageSteps: Math.round(average(recentTrend.map((point) => point.steps))),
      averageActivityMinutes: Math.round(average(recentTrend.map((point) => point.activityMinutes))),
      averageSleepHours: Number(average(recentTrend.map((point) => point.sleepHours)).toFixed(1)),
      weightChangeKg: first && latest ? Number((latest.weightKg - first.weightKg).toFixed(1)) : 0,
    };
  }, [recentTrend]);

  const { summary } = dashboardData;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Atlas / health</p>
          <h1>Health Atlas</h1>
          <p className="subtitle">Android Health Connect에서 수집한 건강 데이터를 Supabase를 거쳐 웹에서 읽는 경량 대시보드</p>
        </div>
        <div className="hero-side">
          <SourceBadge mode={dashboardData.mode} />
          <div className="hero-score" aria-label="오늘 건강 점수">
            <span>{summary.score}</span>
            <small>/ 100</small>
          </div>
        </div>
      </section>

      <section className="banner" aria-live="polite">
        <strong>{isLoading ? "데이터 소스 확인 중" : sourceLabel(dashboardData.mode)}</strong>
        <span>{dashboardData.statusMessage}</span>
      </section>

      <section className="grid metrics-grid" aria-label="Health Atlas 상태 카드">
        <article className="card highlight">
          <span className="card-label">오늘 건강 요약</span>
          <strong>{formatNumber(summary.steps)} 걸음</strong>
          <p>{formatNumber(summary.activeCalories)} kcal 활동 · 안정 심박 {summary.restingHeartRate || "-"} bpm</p>
        </article>

        <article className="card">
          <span className="card-label">체중</span>
          <strong>{summary.weightKg > 0 ? `${summary.weightKg.toFixed(1)} kg` : "대기"}</strong>
          <p>최근 7일 변화 {sevenDaySummary.weightChangeKg >= 0 ? "+" : ""}{sevenDaySummary.weightChangeKg.toFixed(1)} kg</p>
        </article>

        <article className="card">
          <span className="card-label">운동</span>
          <strong>{summary.activityMinutes}분</strong>
          <p>7일 평균 {sevenDaySummary.averageActivityMinutes}분 · {formatNumber(summary.activeCalories)} kcal</p>
        </article>

        <article className="card">
          <span className="card-label">수면</span>
          <strong>{summary.sleepHours > 0 ? `${summary.sleepHours.toFixed(1)}시간` : "대기"}</strong>
          <p>최근 7일 평균 {sevenDaySummary.averageSleepHours.toFixed(1)}시간</p>
        </article>
      </section>

      <section className="grid insight-grid" aria-label="최근 7일 요약">
        <article className="insight-panel">
          <div>
            <span className="card-label">최근 7일 요약</span>
            <strong>{formatNumber(sevenDaySummary.averageSteps)} 걸음</strong>
            <p>평균 걸음 · 평균 운동 {sevenDaySummary.averageActivityMinutes}분 · 평균 수면 {sevenDaySummary.averageSleepHours.toFixed(1)}시간</p>
          </div>
          <MiniBars values={recentTrend.map((point) => point.steps)} />
        </article>

        <article className="insight-panel">
          <div>
            <span className="card-label">스코어 추세</span>
            <strong>{summary.score}점</strong>
            <p>{formatDate(summary.syncedAt)} 기준 · {summary.source}</p>
          </div>
          <MiniBars values={recentTrend.map((point) => point.score)} />
        </article>
      </section>

      <section className="grid status-grid" aria-label="연동 상태">
        {dashboardData.syncStatuses.map((status) => (
          <article className="status-card" key={status.source}>
            <div className="status-heading">
              <span>{status.source}</span>
              <StatusPill status={status.status} />
            </div>
            <p>{status.statusMessage}</p>
            <small>{formatDate(status.syncedAt)}</small>
          </article>
        ))}
      </section>

      <section className="flow-section" aria-label="Health Atlas 데이터 흐름">
        <div>
          <span className="card-label">데이터 흐름</span>
          <h2>Android 앱에서 수집 → Supabase 저장 → Web 대시보드 표시</h2>
        </div>
        <ol className="flow-list">
          <li>
            <strong>Android Health Connect</strong>
            <span>걸음, 운동, 수면, 체중 권한을 받아 로컬에서 정규화합니다.</span>
          </li>
          <li>
            <strong>Supabase</strong>
            <span>사용자별 RLS가 적용된 health_data에 저장하고 Web은 read-only로 조회합니다.</span>
          </li>
          <li>
            <strong>Health Web</strong>
            <span>최근 요약과 추세를 표시하고 실패 시 샘플 미리보기로 유지됩니다.</span>
          </li>
        </ol>
      </section>
    </main>
  );
}

export default App;
