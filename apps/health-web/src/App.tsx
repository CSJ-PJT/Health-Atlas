import { FormEvent, useEffect, useMemo, useState } from "react";

import { sampleHealthDashboardData } from "./data/sampleHealthData";
import type { HealthDashboardData, HealthDataSourceMode, HealthLoadMode, SyncStatus } from "./types";
import {
  loadHealthDashboardData,
  subscribeAuth,
} from "./services/healthDataSource";
import { getHealthWebEnv } from "./services/env";
import { signInWithEmail, signOut } from "./services/supabaseHealthRepository";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value: string) {
  if (value === "sample data") {
    return "샘플 기준";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  }).format(date);
}

function modeBadge(mode: HealthDataSourceMode, loadMode: HealthLoadMode) {
  if (loadMode === "signed_out") {
    return "로그인 필요";
  }

  if (mode === "supabase") {
    return "실제 데이터";
  }

  if (mode === "unconfigured") {
    return "환경 미설정";
  }

  if (loadMode === "backend_unavailable") {
    return "백엔드 준비";
  }

  return "동기화 상태";
}

function statusLabel(status: SyncStatus["status"]) {
  if (status === "connected") {
    return "연결됨";
  }

  if (status === "pending") {
    return "대기";
  }

  if (status === "inactive") {
    return "비활성";
  }

  return "오류";
}

function statusClass(status: SyncStatus["status"]) {
  return `status-pill ${status}`;
}

function EmptyNotice({ dataMode, loadMode, statusMessage }: { dataMode: HealthDataSourceMode; loadMode: HealthLoadMode; statusMessage: string }) {
  if (dataMode === "supabase") {
    return null;
  }

  const isSignedOut = loadMode === "signed_out";

  return (
    <section className={`notice-panel ${isSignedOut ? "error" : ""}`} aria-label="상태 안내">
      <strong>{isSignedOut ? "건강 데이터 접근이 잠긴 상태입니다." : "샘플/오류 모드입니다."}</strong>
      <p>{statusMessage}</p>
    </section>
  );
}

function LoginPanel({
  onLogin,
  isBusy,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  isBusy: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onLogin(email.trim(), password);
  };

  return (
    <section className="notice-panel" aria-label="로그인 안내">
      <strong>Health Atlas 로그인</strong>
      <form className="login-form" onSubmit={onSubmit}>
        <label>
          <span>이메일</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
          />
        </label>
        <label>
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={isBusy || !email || !password}>
          {isBusy ? "로그인 중" : "로그인"}
        </button>
      </form>
    </section>
  );
}

function App() {
  const [envError, setEnvError] = useState("");
  const [dashboard, setDashboard] = useState<HealthDashboardData>(sampleHealthDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  const env = useMemo(() => getHealthWebEnv(), []);

  const loadData = async (preferSample = false) => {
    setIsLoading(true);
    try {
      const next = await loadHealthDashboardData({ preferSample });
      setDashboard(next);
      setEnvError("");
    } catch (error) {
      setDashboard((prev) => ({
        ...prev,
        mode: "error",
        loadMode: "error",
        statusMessage: error instanceof Error ? error.message : "데이터를 로드하지 못했습니다.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let canceled = false;
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const next = await subscribeAuth(env, () => {
        if (!canceled) {
          void loadData();
        }
      });
      unsubscribe = next.unsubscribe;
    };

    void loadData();
    void init();

    return () => {
      canceled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [env]);

  const average = (values: number[]) => {
    if (values.length === 0) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const recentTrend = useMemo(() => dashboard.trend.slice(-7), [dashboard.trend]);
  const sevenDaySummary = useMemo(() => {
    const first = recentTrend[0];
    const latest = recentTrend[recentTrend.length - 1];

    return {
      averageSteps: Math.round(average(recentTrend.map((point) => point.steps))),
      averageActivityMinutes: Math.round(average(recentTrend.map((point) => point.activityMinutes))),
      averageSleepHours: Number(average(recentTrend.map((point) => point.sleepHours)).toFixed(1)),
      weightChangeKg: first && latest ? Number((latest.weightKg - first.weightKg).toFixed(1)) : 0,
      scoreText: latest?.score === null ? "—" : `${latest.score}`,
    };
  }, [recentTrend]);

  const { summary } = dashboard;

  const cards = [
    { label: "컨디션 참고 점수", value: dashboard.summary.score === null ? "—" : `${dashboard.summary.score}`, meta: "/ 100", tone: "strong" },
    { label: "걸음 수", value: formatNumber(summary.steps), meta: "steps" },
    { label: "활동량 칼로리", value: formatNumber(summary.activeCalories), meta: "kcal" },
    {
      label: "휴식 심박수",
      value: summary.restingHeartRate > 0 ? `${summary.restingHeartRate}` : "—",
      meta: "bpm",
    },
    {
      label: "수면",
      value: summary.sleepHours > 0 ? `${summary.sleepHours.toFixed(1)}` : "—",
      meta: "hours",
    },
    {
      label: "체중",
      value: summary.weightKg > 0 ? `${summary.weightKg.toFixed(1)}` : "—",
      meta: "kg",
    },
  ];

  const login = async (email: string, password: string) => {
    if (isAuthBusy) {
      return;
    }

    setIsAuthBusy(true);
    setEnvError("");
    try {
      await signInWithEmail(env, email, password);
      await loadData();
    } catch (error) {
      setEnvError(error instanceof Error ? error.message : "로그인할 수 없습니다.");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(env);
      setDashboard({
        ...sampleHealthDashboardData,
        mode: "error",
        loadMode: "signed_out",
        source: "sign-out",
        statusMessage: "로그인 후 실제 건강 데이터에 접근할 수 있습니다.",
      });
      void loadData();
    } catch {
      // 사용자에게 상세 토큰을 노출하지 않습니다.
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header" aria-label="Health Atlas 헤더">
        <div>
          <p className="eyebrow">Health Atlas</p>
          <h1>건강 데이터 대시보드</h1>
          <p className="subtitle">Android Sync로 수집된 본인 건강 데이터를 안전하게 확인할 수 있습니다.</p>
        </div>
        <div className="header-meta">
          <span>기준 시각: {formatDate(dashboard.syncedAt)}</span>
          <div className="source-badge" aria-label="데이터 모드">
            <span>{modeBadge(dashboard.mode, dashboard.loadMode)}</span>
            <small>{dashboard.source}</small>
          </div>
          <small>마지막 동기화: {formatDate(summary.syncedAt)}</small>
        </div>
      </header>

      <section className="banner" aria-live="polite">
        <strong>{isLoading ? "데이터 로딩 중..." : modeBadge(dashboard.mode, dashboard.loadMode)}</strong>
        <span>{dashboard.statusMessage}</span>
      </section>

      <section className="section-block" aria-label="상태 관리">
        <div className="section-heading">
          <div>
            <span className="card-label">상태 제어</span>
            <h2>대시보드 액션</h2>
          </div>
          <div className="action-row">
            <button onClick={() => void loadData()} disabled={isLoading}>
              다시 시도
            </button>
            <button onClick={() => void loadData(true)} disabled={isLoading || dashboard.mode === "sample"}>
              샘플 미리보기
            </button>
            {dashboard.loadMode === "signed_in" ? (
              <button onClick={() => void logout()}>
                로그아웃
              </button>
            ) : null}
          </div>
        </div>
        <p className="error-state">Android 동기화 상태 또는 웹 로그인 상태를 함께 점검하세요.</p>
      </section>

      {envError ? <div className="notice-panel error">{envError}</div> : null}
      {dashboard.loadMode === "signed_out" ? <LoginPanel onLogin={login} isBusy={isAuthBusy} /> : null}
      <EmptyNotice dataMode={dashboard.mode} loadMode={dashboard.loadMode} statusMessage={dashboard.statusMessage} />

      <section className="section-block" aria-labelledby="today-summary-title">
        <div className="section-heading">
          <div>
            <span className="card-label">Today Summary</span>
            <h2 id="today-summary-title">오늘 요약</h2>
          </div>
          <p>원본이 아닌 정제 지표를 표시합니다.</p>
        </div>

        <div className="grid metrics-grid">
          {cards.map((card) => (
            <article className={`card ${card.tone || ""}`} key={card.label}>
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
            <h2 id="week-summary-title">7일 요약</h2>
          </div>
          <p>최근 수치 추세를 기준으로 계산합니다.</p>
        </div>

        {recentTrend.length > 0 ? (
          <div className="grid insight-grid">
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 걸음 수</span>
                <strong>{formatNumber(sevenDaySummary.averageSteps)}</strong>
                <p>최근 7일 평균</p>
              </div>
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 활동 시간</span>
                <strong>{sevenDaySummary.averageActivityMinutes}</strong>
                <p>최근 7일 활동량(분)</p>
              </div>
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 수면</span>
                <strong>{sevenDaySummary.averageSleepHours.toFixed(1)}</strong>
                <p>최근 7일 수면(시간)</p>
              </div>
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">체중 변화</span>
                <strong>
                  {sevenDaySummary.weightChangeKg >= 0 ? "+" : ""}
                  {sevenDaySummary.weightChangeKg.toFixed(1)} kg
                </strong>
                <p>최근 7일 비교</p>
              </div>
            </article>
          </div>
        ) : (
          <div className="empty-state">
            <strong>최근 7일 데이터가 부족합니다.</strong>
            <span>동기화가 완료되면 요약이 자동 반영됩니다.</span>
          </div>
        )}
      </section>

      <section className="section-block" aria-labelledby="sync-title">
        <div className="section-heading">
          <div>
            <span className="card-label">Sync Status</span>
            <h2 id="sync-title">동기화 상태</h2>
          </div>
          <p>Android 수집·Supabase 저장·Web 렌더링 단계별 상태입니다.</p>
        </div>

        <div className="grid status-grid">
          {dashboard.syncStatuses.map((status) => (
            <article className="status-card" key={status.source}>
              <div className="status-heading">
                <span>{status.source}</span>
                <span className={statusClass(status.status)}>{statusLabel(status.status)}</span>
              </div>
              <p>{status.statusMessage}</p>
              <small>{formatDate(status.syncedAt)}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
