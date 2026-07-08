import {
  activityMetric,
  bodyMetric,
  healthSummary,
  sleepMetric,
  syncStatuses,
} from "./data/sampleHealthData";

const env = {
  projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined,
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
};

const isSupabaseConfigured = Boolean(env.projectId && env.url && env.publishableKey);

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function StatusPill({ status }: { status: "connected" | "pending" | "inactive" }) {
  const label = status === "connected" ? "연결됨" : status === "pending" ? "예정" : "비활성";
  return <span className={`status-pill ${status}`}>{label}</span>;
}

function App() {
  const statuses = syncStatuses.map((item) =>
    item.source === "Supabase 연결 상태"
      ? {
          ...item,
          status: isSupabaseConfigured ? "connected" as const : "inactive" as const,
          message: isSupabaseConfigured
            ? `${env.projectId || "project"} 환경 변수가 설정됨`
            : "VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY 필요",
        }
      : item,
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Atlas / health</p>
          <h1>Health Atlas</h1>
          <p className="subtitle">건강·운동·수면 데이터를 매일 기록하고 분석하는 헬스 대시보드</p>
        </div>
        <div className="hero-score" aria-label="오늘 건강 점수">
          <span>{healthSummary.totalScore}</span>
          <small>/ 100</small>
        </div>
      </section>

      <section className="grid metrics-grid" aria-label="Health Atlas 상태 카드">
        <article className="card highlight">
          <span className="card-label">오늘 건강 요약</span>
          <strong>{formatNumber(healthSummary.steps)} 걸음</strong>
          <p>{formatNumber(healthSummary.activeCalories)} kcal 활동 · 안정 심박 {healthSummary.restingHeartRate} bpm</p>
        </article>

        <article className="card">
          <span className="card-label">{bodyMetric.label}</span>
          <strong>{bodyMetric.value}</strong>
          <p>{bodyMetric.trend}</p>
        </article>

        <article className="card">
          <span className="card-label">{activityMetric.label}</span>
          <strong>{activityMetric.durationMinutes}분</strong>
          <p>{activityMetric.distanceKm.toFixed(1)} km · 중간 강도</p>
        </article>

        <article className="card">
          <span className="card-label">{sleepMetric.label}</span>
          <strong>{sleepMetric.durationHours.toFixed(1)}시간</strong>
          <p>수면 흐름 안정 · 회복 추세 확인 예정</p>
        </article>
      </section>

      <section className="grid status-grid" aria-label="연동 상태">
        {statuses.map((status) => (
          <article className="status-card" key={status.source}>
            <div className="status-heading">
              <span>{status.source}</span>
              <StatusPill status={status.status} />
            </div>
            <p>{status.message}</p>
            <small>{status.updatedAt}</small>
          </article>
        ))}
      </section>

      <section className="notice">
        <p>Android 앱에서 수집한 데이터를 웹 대시보드에 연결할 예정입니다.</p>
        <p>현재는 sample data 기반 preview입니다.</p>
      </section>
    </main>
  );
}

export default App;
