import { FormEvent, useEffect, useMemo, useState } from "react";

import type { HealthDashboardData, HealthDataSourceMode, HealthLoadMode } from "./types";
import { loadHealthDashboardData, subscribeAuth } from "./services/healthDataSource";
import { getHealthWebEnv } from "./services/env";
import { signInWithEmail, signOut, signUpWithEmail } from "./services/supabaseHealthRepository";

type LoadingMode = "loading" | "ready";
type AuthMode = "login" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateAuthInput(mode: AuthMode, email: string, password: string, passwordConfirm: string) {
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "올바른 이메일 주소를 입력해 주세요.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.`;
  }
  if (mode === "signup" && password !== passwordConfirm) {
    return "비밀번호와 비밀번호 확인이 일치하지 않습니다.";
  }
  return "";
}

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
  onSignUp: (email: string, password: string, passwordConfirm: string) => Promise<void>;
  isBusy: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [validationError, setValidationError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextError = validateAuthInput(mode, email, password, passwordConfirm);
    setValidationError(nextError);
    if (nextError) {
      return;
    }
    if (mode === "signup") {
      await onSignUp(email.trim(), password, passwordConfirm);
      return;
    }
    await onLogin(email.trim(), password);
  };

  return (
    <section className="auth-card" aria-label="로그인 안내">
      <p className="card-label">Health Atlas</p>
      <h2>{mode === "signup" ? "계정 만들기" : "로그인"}</h2>
      <p className="auth-card-copy">{mode === "signup" ? "내 건강 기록을 안전하게 보관할 계정을 만드세요." : "Samsung Health 동기화에 사용하는 계정으로 접속하세요."}</p>
      <form className="login-form" onSubmit={onSubmit} noValidate>
        <label>
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setValidationError("");
            }}
            placeholder="you@example.com"
            autoComplete="username"
            inputMode="email"
            required
            aria-invalid={validationError.includes("이메일") || undefined}
          />
        </label>
        <label>
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setValidationError("");
            }}
            placeholder="비밀번호"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={MIN_PASSWORD_LENGTH}
            required
            aria-invalid={validationError.includes("비밀번호") || undefined}
          />
        </label>
        {mode === "signup" ? (
          <label>
            <span>비밀번호 확인</span>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                setValidationError("");
              }}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              aria-invalid={validationError.includes("비밀번호") || undefined}
            />
          </label>
        ) : null}
        {validationError ? <p className="form-error" role="alert">{validationError}</p> : null}
        <button type="submit" disabled={isBusy || !email || !password || (mode === "signup" && !passwordConfirm)}>
          {isBusy ? "처리 중..." : mode === "signup" ? "계정 만들기" : "로그인"}
        </button>
      </form>
      <button
        className="link-button"
        type="button"
        disabled={isBusy}
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setPasswordConfirm("");
          setValidationError("");
        }}
      >
        {mode === "login" ? "계정이 없나요? 계정 만들기" : "이미 계정이 있나요? 로그인"}
      </button>
      <p className="auth-privacy">건강 데이터는 로그인한 본인 계정의 기록만 표시됩니다.</p>
    </section>
  );
}

type HealthConnectPlugin = {
  requestPermissions: () => Promise<{ granted?: boolean }>;
};

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { HealthConnect?: HealthConnectPlugin };
};

function getCapacitorBridge() {
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
}

function getDeviceOnboardingMessage() {
  const platform = navigator.userAgent.toLowerCase();
  const bridge = getCapacitorBridge();
  const isNativeAndroid = Boolean(bridge?.isNativePlatform?.()) && bridge?.getPlatform?.() === "android";
  const isAndroidWeb = /android/.test(platform) && !isNativeAndroid;
  const isIos = /iphone|ipad|ipod/.test(platform);

  if (isNativeAndroid) {
    return {
      title: "Samsung Health 연결",
      body: "Samsung Health 확인, Health Connect 권한 허용, 첫 동기화 순서로 진행하세요.",
      cta: "Health Connect 권한 허용",
      nativePermission: true,
    };
  }
  if (isAndroidWeb) {
    return {
      title: "Android 앱에서 Samsung Health 연결",
      body: "가입 후 RH Healthcare Android 앱에서 같은 계정으로 로그인하면 Samsung Health 연결과 첫 동기화가 바로 이어집니다.",
      cta: "연결 단계 보기",
      nativePermission: false,
    };
  }
  if (isIos) {
    return {
      title: "Samsung Health Android 필요",
      body: "현재 Health Atlas 건강 데이터 연동은 Samsung Health와 Android Health Connect만 지원합니다. Apple Health로 대체하지 않습니다.",
      cta: "Android 연결 단계 보기",
      nativePermission: false,
    };
  }
  return {
    title: "Android에서 Samsung Health 연결",
    body: "가입 후 Android 앱에서 같은 계정으로 로그인해 Samsung Health 권한과 첫 동기화를 완료하세요. Web/Desktop에서는 동기화된 내 기록을 조회합니다.",
    cta: "Android 앱에서 동기화 단계 보기",
    nativePermission: false,
  };
}

function OnboardingPanel() {
  const message = getDeviceOnboardingMessage();
  const [guideOpen, setGuideOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState("");

  const handleOnboardingAction = async () => {
    setGuideOpen(true);
    if (!message.nativePermission) {
      setActionStatus("아래 연결 단계를 Android 기기에서 순서대로 완료해 주세요.");
      return;
    }

    const plugin = getCapacitorBridge()?.Plugins?.HealthConnect;
    if (!plugin?.requestPermissions) {
      setActionStatus("이 실행 환경에서는 권한 창을 열 수 없습니다. 아래 단계에 따라 Health Connect 설정을 확인해 주세요.");
      return;
    }

    setActionStatus("Health Connect 권한 요청 중입니다...");
    try {
      const result = await plugin.requestPermissions();
      setActionStatus(
        result.granted
          ? "Health Connect 권한이 허용되었습니다. 첫 동기화를 실행한 뒤 Web Dashboard에서 다시 확인해 주세요."
          : "Health Connect 권한이 허용되지 않았습니다. Android 설정에서 권한을 확인해 주세요.",
      );
    } catch {
      setActionStatus("권한 요청을 완료하지 못했습니다. Android 설정에서 Health Connect 권한을 확인해 주세요.");
    }
  };

  return (
    <section className="notice-panel" aria-label="Samsung Health 온보딩">
      <p className="card-label">Samsung Health</p>
      <h2>{message.title}</h2>
      <p>{message.body}</p>
      <button
        type="button"
        aria-expanded={guideOpen}
        aria-controls="health-connect-onboarding-steps"
        onClick={() => void handleOnboardingAction()}
      >
        {message.cta}
      </button>
      {guideOpen ? (
        <div id="health-connect-onboarding-steps" className="onboarding-details">
          <ol className="onboarding-list">
            <li>Android 기기에서 Samsung Health를 열고 최신 기록을 확인합니다.</li>
            <li>Health Connect 사용 가능 여부를 확인합니다.</li>
            <li>Samsung Health에서 Health Connect 공유를 허용합니다.</li>
            <li>RH Healthcare Android 앱에서 가입한 계정으로 로그인합니다.</li>
            <li>앱의 “Samsung Health 연결 및 첫 동기화”를 눌러 Health Connect 읽기 권한을 허용합니다.</li>
            <li>완료 후 이 Web Dashboard에서 다시 확인을 누릅니다.</li>
          </ol>
          {actionStatus ? <p className="action-status" role="status" aria-live="polite">{actionStatus}</p> : null}
        </div>
      ) : null}
      <p className="notice">Samsung Health에서 Health Connect로 공유된 건강 기록 중 사용자가 허용한 항목만 읽고, 로그인한 본인 계정에만 저장합니다. 의료 진단 용도가 아닙니다.</p>
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

  const signup = async (email: string, password: string, passwordConfirm: string) => {
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
        setAuthNotice("계정이 생성되었습니다. Samsung Health 연결을 진행해 주세요.");
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
  const isAnonymousSample = dashboard.authState === "ANONYMOUS_SAMPLE";
  const needsOnboarding = dashboard.authState === "SIGNED_IN_NO_DATA" || dashboard.authState === "ONBOARDING_REQUIRED";

  if (loadMode === "signed_out") {
    return (
      <main className="auth-shell">
        <header className="auth-brand" aria-label="Health Atlas 로그인 헤더">
          <span className="auth-mark" aria-hidden="true">H</span>
          <div>
            <strong>Health Atlas</strong>
            <span>Samsung Health 데이터 대시보드</span>
          </div>
        </header>

        {envError ? <div className="notice-panel error" role="alert">{envError}</div> : null}
        {authNotice ? <div className="notice-panel" role="status" aria-live="polite">{authNotice}</div> : null}

        <div className="auth-layout">
          <section className="auth-intro" aria-labelledby="auth-intro-title">
            <p className="auth-kicker">Samsung Health, 한 화면에서</p>
            <h1 id="auth-intro-title">오늘의 건강 흐름을<br />간결하게 확인하세요.</h1>
            <p>Android 앱에서 동기화한 기록을 Web/Desktop에서 안전하게 조회합니다.</p>
            <ul className="auth-trust-list">
              <li><strong>본인 데이터만</strong><span>로그인한 계정의 기록만 표시</span></li>
              <li><strong>읽기 쉬운 요약</strong><span>오늘과 최근 7일 변화 중심</span></li>
              <li><strong>Samsung Health 연동</strong><span>Health Connect를 통한 선택적 동기화</span></li>
            </ul>
          </section>
          <LoginPanel onLogin={login} onSignUp={signup} isBusy={isAuthBusy} />
        </div>

        <p className="auth-footnote">Health Atlas는 의료 진단 서비스가 아닙니다.</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header" aria-label="Health Atlas 헤더">
        <div>
          <p className="eyebrow">Health Atlas</p>
          <h1>Health Atlas</h1>
          <p className="subtitle">건강 데이터 대시보드</p>
        </div>
        <div className="header-meta">
          <span>{isAnonymousSample ? "샘플 기준" : `마지막 동기화: ${summary ? formatSyncTime(summary.syncedAt) : "없음"}`}</span>
          <div className="source-badge" aria-label="동기화 상태">
          <span>{statusBadge(mode, loadMode)}</span>
            <small>Samsung Health → Health Connect → Health Atlas</small>
          </div>
        </div>
      </header>

      <section className="banner" aria-live="polite">
        <strong>{statusBadge(mode, loadMode)}</strong>
        <span>{isAnonymousSample ? "로그인하면 Samsung Health에서 동기화된 내 건강 데이터를 확인할 수 있습니다." : loadMode === "error" ? "실제 건강 데이터가 없습니다." : dashboard.statusMessage}</span>
      </section>

      <section className="section-block" aria-label="상태 제어">
        <div className="section-heading">
          <div>
            <span className="card-label">Samsung Health</span>
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
          Samsung Health에서 동기화한 기록이 자동으로 반영됩니다.
        </p>
      </section>

      {envError ? <div className="notice-panel error" role="alert">{envError}</div> : null}
      {authNotice ? <div className="notice-panel" role="status" aria-live="polite">{authNotice}</div> : null}
      {needsOnboarding ? <OnboardingPanel /> : null}

      <section className="section-block" aria-labelledby="today-summary-title">
        <div className="section-heading">
          <div>
            <span className="card-label">{isAnonymousSample ? "샘플 기준" : "Today Summary"}</span>
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
            <small>Samsung Health → Health Connect → Health Atlas</small>
          </div>
          <p>{isAnonymousSample ? "로그인 후 Samsung Health 데이터를 연결할 수 있습니다." : "Samsung Health 동기화 상태를 표시합니다."}</p>
        </div>

        <div className="grid status-grid">
          {dashboard.syncStatuses.map((status) => (
            <article className="status-card" key={status.source}>
              <div className="status-heading">
                <span>{status.source}</span>
                <span className={statusClass(status.status)}>{isAnonymousSample ? "샘플" : statusLabel(status.status)}</span>
              </div>
              <p>{status.statusMessage}</p>
              <small>{isAnonymousSample ? "샘플 데이터" : formatDate(status.syncedAt)}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
