import { useEffect, useMemo, useState } from "react";

import { sampleHealthDashboardData } from "./data/sampleHealthData";
import { loadHealthDashboardData } from "./services/healthDataSource";
import type { HealthDashboardData, HealthDataSourceMode, SyncStatus } from "./types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value: string) {
  if (value === "sample data" || value === "planned" || value === "planning" || value === "unconfigured") {
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

function todayLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
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
      return "publishable key read-only";
    case "unconfigured":
      return "sample mode";
    case "error":
      return "fallback preview";
    case "sample":
    default:
      return "sample data";
  }
}

function sourceMessage(mode: HealthDataSourceMode) {
  switch (mode) {
    case "supabase":
      return "Supabase health_data에서 읽은 최근 데이터를 표시합니다.";
    case "unconfigured":
      return "환경변수가 없으면 sample mode로 동작합니다.";
    case "error":
      return "Supabase 연결 실패로 sample data 기반 preview를 표시합니다.";
    case "sample":
    default:
      return "현재는 sample data 기반 preview입니다.";
  }
}

function StatusPill({ status }: { status: SyncStatus["status"] }) {
  const label =
    status === "connected" ? "연결됨" : status === "pending" ? "대기" : status === "error" ? "오류" : "비활성";
  return <span className={`status-pill ${status}`}>{label}</span>;
}

function SourceBadge({ mode }: { mode: HealthDataSourceMode }) {
  return (
    <div className={`source-badge ${mode}`} aria-label="데이터 출처">
      <span>{sourceLabel(mode)}</span>
      <small>{sourceHint(mode)}</small>
    </div>
  );
}

function MiniBars({ values, tone = "blue" }: { values: number[]; tone?: "blue" | "green" | "violet" }) {
  const max = Math.max(...values, 1);

  return (
    <div className={`mini-bars ${tone}`} aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function EmptyNotice({ mode }: { mode: HealthDataSourceMode }) {
  if (mode === "supabase") {
    return null;
  }

  return (
    <section className={`notice-panel ${mode}`} aria-label="데이터 상태 안내">
      <strong>{sourceMessage(mode)}</strong>
      <p>Android 앱에서 수집한 데이터가 Supabase에 저장되면 이 화면은 실제 데이터 기준으로 전환됩니다.</p>
    </section>
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
  const hasTrend = recentTrend.length > 0;
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

  const todayCards = [
    { label: "컨디션 점수", value: `${summary.score}`, meta: "/ 100", tone: "strong" },
    { label: "걸음 수", value: formatNumber(summary.steps), meta: "steps", tone: "default" },
    { label: "활동 칼로리", value: formatNumber(summary.activeCalories), meta: "kcal", tone: "default" },
    { label: "안정 심박", value: summary.restingHeartRate > 0 ? `${summary.restingHeartRate}` : "대기", meta: "bpm", tone: "default" },
    { label: "수면 시간", value: summary.sleepHours > 0 ? `${summary.sleepHours.toFixed(1)}` : "대기", meta: "hours", tone: "default" },
    { label: "체중", value: summary.weightKg > 0 ? `${summary.weightKg.toFixed(1)}` : "대기", meta: "kg", tone: "default" },
  ];

  return (
    <main className="app-shell">
      <header className="app-header" aria-label="Health Atlas header">
        <div>
          <p className="eyebrow">Health Atlas</p>
          <h1>일간 건강 대시보드</h1>
          <p className="subtitle">건강·운동·수면 데이터를 매일 확인하는 읽기 중심 웹 대시보드입니다.</p>
        </div>
        <div className="header-meta">
          <span>{todayLabel()}</span>
          <SourceBadge mode={dashboardData.mode} />
          <small>마지막 동기화 {formatDate(dashboardData.syncedAt)}</small>
        </div>
      </header>

      <section className="banner" aria-live="polite">
        <strong>{isLoading ? "데이터 소스 확인 중" : sourceLabel(dashboardData.mode)}</strong>
        <span>{dashboardData.statusMessage}</span>
      </section>

      <EmptyNotice mode={dashboardData.mode} />

      <section className="section-block" aria-labelledby="today-summary-title">
        <div className="section-heading">
          <div>
            <span className="card-label">Today Summary</span>
            <h2 id="today-summary-title">오늘 상태</h2>
          </div>
          <p>출처: {summary.source} · 기준 {formatDate(summary.syncedAt)}</p>
        </div>

        <div className="grid metrics-grid" aria-label="오늘 건강 요약 카드">
          {todayCards.map((card) => (
            <article className={`card ${card.tone}`} key={card.label}>
              <span className="card-label">{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.meta}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="week-summary-title">
        <div className="section-heading">
          <div>
            <span className="card-label">Last 7 Days</span>
            <h2 id="week-summary-title">최근 7일 요약</h2>
          </div>
          <p>무거운 차트 라이브러리 없이 CSS 미니 차트로 추세만 보여줍니다.</p>
        </div>

        {hasTrend ? (
          <div className="grid insight-grid">
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 걸음</span>
                <strong>{formatNumber(sevenDaySummary.averageSteps)}</strong>
                <p>최근 7일 걸음 수 평균</p>
              </div>
              <MiniBars values={recentTrend.map((point) => point.steps)} />
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 운동 시간</span>
                <strong>{sevenDaySummary.averageActivityMinutes}분</strong>
                <p>활동 시간 기준</p>
              </div>
              <MiniBars values={recentTrend.map((point) => point.activityMinutes)} tone="green" />
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 수면</span>
                <strong>{sevenDaySummary.averageSleepHours.toFixed(1)}시간</strong>
                <p>수면 기록 기준</p>
              </div>
              <MiniBars values={recentTrend.map((point) => point.sleepHours)} tone="violet" />
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">체중 변화</span>
                <strong>
                  {sevenDaySummary.weightChangeKg >= 0 ? "+" : ""}
                  {sevenDaySummary.weightChangeKg.toFixed(1)} kg
                </strong>
                <p>최근 기록 대비 변화</p>
              </div>
              <MiniBars values={recentTrend.map((point) => point.weightKg)} tone="green" />
            </article>
          </div>
        ) : (
          <div className="empty-state">
            <strong>최근 7일 데이터가 없습니다.</strong>
            <span>Supabase에 health_data가 저장되면 7일 요약이 표시됩니다.</span>
          </div>
        )}
      </section>

      <section className="section-block" aria-labelledby="sync-title">
        <div className="section-heading">
          <div>
            <span className="card-label">Sync Status</span>
            <h2 id="sync-title">동기화 상태</h2>
          </div>
          <p>Android, Supabase, Web Dashboard의 연결 상태를 분리해서 표시합니다.</p>
        </div>

        <div className="grid status-grid" aria-label="연동 상태">
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
        </div>
      </section>

      <section className="flow-section" aria-label="Health Atlas 데이터 흐름">
        <div>
          <span className="card-label">Data Flow</span>
          <h2>Android 수집 → Supabase 저장 → Web 표시</h2>
        </div>
        <ol className="flow-list">
          <li>
            <strong>Android 앱</strong>
            <span>Health Connect 권한으로 걸음, 운동, 수면, 체중 데이터를 수집합니다.</span>
          </li>
          <li>
            <strong>Supabase</strong>
            <span>브라우저는 publishable key만 사용하고, service role key는 클라이언트에서 사용하지 않습니다.</span>
          </li>
          <li>
            <strong>Web Dashboard</strong>
            <span>환경변수가 없거나 조회가 실패하면 sample mode로 유지되어 화면이 깨지지 않습니다.</span>
          </li>
        </ol>
      </section>
    </main>
  );
}

export default App;
