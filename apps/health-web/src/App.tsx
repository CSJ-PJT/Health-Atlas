import { FormEvent, useEffect, useMemo, useState } from "react";

import type { HealthDashboardData, HealthDataSourceMode, HealthLoadMode } from "./types";
import { loadHealthDashboardData, subscribeAuth } from "./services/healthDataSource";
import { getHealthWebEnv } from "./services/env";
import { signInWithEmail, signOut, signUpWithEmail } from "./services/supabaseHealthRepository";

type LoadingMode = "loading" | "ready";

function formatValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDecimal(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return Number(value).toFixed(digits);
}

function formatDate(value: string) {
  if (!value) {
    return value;
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

function statusBadge(mode: HealthDataSourceMode, loadMode: HealthLoadMode) {
  if (loadMode === "signed_out") {
    return "로그인 필요";
  }
  if (loadMode === "backend_unavailable") {
    return "동기화 대기";
  }
  if (loadMode === "error") {
    return "데이터 없음";
  }
  if (mode === "supabase") {
    return "동기화됨";
  }
  if (mode === "error") {
    return "동기화 준비 중";
  }
  return "동기화 준비 중";
}

function statusLabel(status: "connected" | "pending" | "inactive" | "error") {
  if (status === "connected") return "연결";
  if (status === "pending") return "대기";
  if (status === "inactive") return "해당 없음";
  return "오류";
}

function statusClass(status: "connected" | "pending" | "inactive" | "error") {
  return `status-pill ${status}`;
}

function formatSyncTime(value: string) {
  if (!value) {
    return "없음";
  }
  return formatDate(value);
}

function LoginPanel({
  onLogin,
  onSignUp,
  isBusy,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  isBusy: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "signup") {
      await onSignUp(email.trim(), password);
      return;
    }
    await onLogin(email.trim(), password);
  };

  return (
    <section className="notice-panel" aria-label="로그인 안내">
      <p className="card-label">Health Atlas</p>
      <h2>내 건강 데이터 확인</h2>
      <p>Android Health Sync에서 사용하는 계정으로 로그인하세요.</p>
      <form className="login-form" onSubmit={onSubmit}>
        <label>
          <span>이메일</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="username" />
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
          {isBusy ? "처리 중..." : mode === "signup" ? "계정 만들기" : "로그인"}
        </button>
      </form>
      <button className="link-button" type="button" disabled={isBusy} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "계정이 없나요? 계정 만들기" : "이미 계정이 있나요? 로그인"}
      </button>
      <p className="notice">건강 데이터는 로그인한 본인 계정의 기록만 표시됩니다.</p>
    </section>
  );
}

function App() {
  const [dashboard, setDashboard] = useState<HealthDashboardData | null>(null);
  const [pageState, setPageState] = useState<LoadingMode>("loading");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [envError, setEnvError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const env = useMemo(() => getHealthWebEnv(), []);

  const loadData = async () => {
    setPageState("loading");
    setEnvError("");
    try {
      const next = await loadHealthDashboardData({});
      setDashboard(next);
    } catch (error) {
      setEnvError("건강 데이터 조회에 실패했습니다.");
    } finally {
      setPageState("ready");
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
      unsubscribe?.();
    };
  }, [env]);

  const average = (values: Array<number | null>) => {
    const fixed = values.filter((value): value is number => value !== null && Number.isFinite(value));
    if (fixed.length === 0) {
      return null;
    }
    return fixed.reduce((sum, value) => sum + value, 0) / fixed.length;
  };

  const recentTrend = useMemo(() => (dashboard?.trend ?? []).slice(-7), [dashboard?.trend]);
  const hasTrend = recentTrend.length > 0;
  const sixDayFirst = recentTrend[0];
  const latest = recentTrend[recentTrend.length - 1];

  const sevenDaySummary = useMemo(() => {
    if (!hasTrend) {
      return null;
    }

    const weightChange =
      sixDayFirst && latest && sixDayFirst.weightKg !== null && latest.weightKg !== null
        ? Number((latest.weightKg - sixDayFirst.weightKg).toFixed(1))
        : null;

    return {
      averageSteps: average(recentTrend.map((point) => point.steps)),
      averageActivityMinutes: average(recentTrend.map((point) => point.activityMinutes)),
      averageSleepHours: average(recentTrend.map((point) => point.sleepHours)),
      weightChangeKg: weightChange,
    };
  }, [hasTrend, recentTrend, latest, sixDayFirst]);

  const summary = dashboard?.summary;

  const cards = summary
    ? [
        { label: "컨디션 참고 점수", value: summary.score === null ? "—" : formatValue(summary.score), meta: "/ 100" },
        { label: "걸음 수", value: formatValue(summary.steps), meta: "steps" },
        { label: "활동량 칼로리", value: formatValue(summary.activeCalories), meta: "kcal" },
        { label: "휴식 심박수", value: formatValue(summary.restingHeartRate), meta: "bpm" },
        {
          label: "수면",
          value: summary.sleepHours === null ? "—" : `${formatDecimal(summary.sleepHours)} h`,
          meta: "",
        },
        { label: "체중", value: summary.weightKg === null ? "—" : `${formatDecimal(summary.weightKg)} kg`, meta: "" },
      ]
    : [];

  const login = async (email: string, password: string) => {
    if (isAuthBusy) {
      return;
    }
    setIsAuthBusy(true);
    setEnvError("");
    setAuthNotice("");
    try {
      await signInWithEmail(env, email, password);
      await loadData();
    } catch (error) {
      setEnvError("로그인 정보를 확인해 주세요.");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const signup = async (email: string, password: string) => {
    if (isAuthBusy) {
      return;
    }
    setIsAuthBusy(true);
    setEnvError("");
    setAuthNotice("");
    try {
      const result = await signUpWithEmail(env, email, password);
      if (result.needsEmailConfirmation) {
        setAuthNotice("확인 이메일을 보냈습니다. 이메일 확인 후 로그인하세요.");
      } else {
        setAuthNotice("계정이 생성되었습니다.");
      }
      await loadData();
    } catch {
      setEnvError("계정 생성 정보를 확인해 주세요.");
    } finally {
      setIsAuthBusy(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(env);
      await loadData();
    } catch {
      // ignore
    }
  };

  if (!dashboard || pageState === "loading") {
    return (
      <main className="app-shell">
        <header className="app-header">
          <p className="eyebrow">Health Atlas</p>
          <h1>Health Atlas</h1>
          <p className="subtitle">건강 데이터 대시보드</p>
        </header>
        <p>로딩 중입니다...</p>
      </main>
    );
  }

  const loadMode = dashboard.loadMode;
  const mode = dashboard.mode;

  return (
    <main className="app-shell">
      <header className="app-header" aria-label="Health Atlas 헤더">
        <div>
          <p className="eyebrow">Health Atlas</p>
          <h1>Health Atlas</h1>
          <p className="subtitle">건강 데이터 대시보드</p>
        </div>
        <div className="header-meta">
          <span>마지막 동기화: {summary ? formatSyncTime(summary.syncedAt) : "없음"}</span>
          <div className="source-badge" aria-label="동기화 상태">
          <span>{statusBadge(mode, loadMode)}</span>
            <small>Health Sync</small>
          </div>
        </div>
      </header>

      <section className="banner" aria-live="polite">
        <strong>{statusBadge(mode, loadMode)}</strong>
        <span>{loadMode === "error" ? "실제 건강 데이터가 없습니다." : dashboard.statusMessage}</span>
      </section>

      <section className="section-block" aria-label="상태 제어">
        <div className="section-heading">
          <div>
            <span className="card-label">Health Sync</span>
            <h2>현재 상태</h2>
          </div>
          <div className="action-row">
            <button onClick={() => void loadData()}>다시 확인</button>
            {loadMode === "signed_in" ? (
              <button className="danger" onClick={() => void logout()}>
                로그아웃
              </button>
            ) : null}
          </div>
        </div>
        <p className="error-state">
          {loadMode === "signed_out" ? "로그인 후 Android 앱에서 건강 데이터를 동기화할 수 있습니다." : "Android 앱에서 건강 데이터를 동기화하면 최근 기록이 자동으로 반영됩니다."}
        </p>
      </section>

      {envError ? <div className="notice-panel error">{envError}</div> : null}
      {authNotice ? <div className="notice-panel">{authNotice}</div> : null}
      {loadMode === "signed_out" ? <LoginPanel onLogin={login} onSignUp={signup} isBusy={isAuthBusy} /> : null}

      <section className="section-block" aria-labelledby="today-summary-title">
        <div className="section-heading">
          <div>
            <span className="card-label">Today Summary</span>
            <h2 id="today-summary-title">금일 요약</h2>
          </div>
        </div>
        <div className="grid metrics-grid">
          {cards.map((card) => (
            <article className="card" key={card.label}>
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
        </div>

        {hasTrend ? (
          <div className="grid insight-grid">
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 걸음</span>
                <strong>
                  {sevenDaySummary && sevenDaySummary.averageSteps !== null ? formatValue(Math.round(sevenDaySummary.averageSteps)) : "—"}
                </strong>
                <p>최근 7일</p>
              </div>
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 활동분</span>
                <strong>
                  {sevenDaySummary && sevenDaySummary.averageActivityMinutes !== null
                    ? formatValue(Math.round(sevenDaySummary.averageActivityMinutes))
                    : "—"}
                </strong>
                <p>최근 7일</p>
              </div>
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">평균 수면</span>
                <strong>
                  {sevenDaySummary && sevenDaySummary.averageSleepHours !== null
                    ? `${formatDecimal(sevenDaySummary.averageSleepHours)} h`
                    : "—"}
                </strong>
                <p>최근 7일</p>
              </div>
            </article>
            <article className="insight-panel">
              <div>
                <span className="card-label">체중 변화</span>
                <strong>{sevenDaySummary && sevenDaySummary.weightChangeKg !== null ? `${sevenDaySummary.weightChangeKg >= 0 ? "+" : ""}${sevenDaySummary.weightChangeKg} kg` : "—"}</strong>
                <p>최근 7일</p>
              </div>
            </article>
          </div>
        ) : (
          <div className="empty-state">
            <strong>데이터 없음</strong>
            <span>건강 데이터가 쌓이면 최근 7일 추세를 확인할 수 있습니다.</span>
          </div>
        )}
      </section>

      <section className="section-block" aria-labelledby="sync-title">
        <div className="section-heading">
          <div>
            <span className="card-label">Sync Status</span>
            <h2 id="sync-title">동기화 상태</h2>
            <small>Health Sync</small>
          </div>
          <p>실시간 동기화 채널 상태를 표시합니다.</p>
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
