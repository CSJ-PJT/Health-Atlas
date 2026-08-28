import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { nicknameSchema } from "@/lib/validationSchemas";
import { samsungProvider } from "@/providers/samsung";
import { saveHealthSnapshot } from "@/providers/shared/services/healthDataRepository";
import { setSamsungLastSyncAt } from "@/providers/samsung/services/samsungConnectionStore";

const EMAIL_REDIRECT_URL = "https://161.33.17.84/health/";
const MIN_PASSWORD_LENGTH = 6;
type AuthMode = "login" | "signup";

const Setup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (localStorage.getItem("setup_completed") === "true" && user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const handleAuth = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setStatusMessage("");
    try {
      if (!email.trim() || password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`이메일과 ${MIN_PASSWORD_LENGTH}자 이상의 비밀번호를 입력해 주세요.`);
      }
      if (authMode === "signup" && password !== passwordConfirm) {
        throw new Error("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      }
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: EMAIL_REDIRECT_URL },
        });
        if (error) throw error;
        if (!data.session) {
          setStatusMessage("확인 이메일을 보냈습니다. 메일 인증을 마친 뒤 이 앱으로 돌아와 로그인해 주세요.");
          setAuthMode("login");
          return;
        }
        setUser(data.user);
        setStatusMessage("가입되었습니다. 이제 Samsung Health 연결을 완료해 주세요.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setUser(data.user);
        setStatusMessage("로그인되었습니다. Samsung Health 연결을 진행해 주세요.");
      }
    } catch (error) {
      toast({
        title: authMode === "signup" ? "가입 실패" : "로그인 실패",
        description: error instanceof Error ? error.message : "인증 정보를 확인해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const ensureOwnedProfile = async (authenticatedUser: User, validatedNickname: string) => {
    const userId = authenticatedUser.id;
    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) {
      const { error } = await supabase.from("profiles").update({ nickname: validatedNickname }).eq("id", existing.id);
      if (error) throw error;
      return existing.id as string;
    }
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({ user_id: userId, nickname: validatedNickname, user_id_changed: false })
      .select("id")
      .single();
    if (error) throw error;
    return created.id as string;
  };

  const handleConnectAndComplete = async () => {
    if (!user || isBusy) return;
    setIsBusy(true);
    setStatusMessage("Samsung Health 연결 상태를 확인하고 있습니다...");
    try {
      const validatedNickname = nicknameSchema.parse(nickname);
      if (!(await samsungProvider.isAvailable())) {
        throw new Error("Samsung Health 연동은 Health Connect를 사용할 수 있는 Android 앱에서만 완료할 수 있습니다.");
      }
      const profileId = await ensureOwnedProfile(user, validatedNickname);
      setStatusMessage("Health Connect 권한을 허용해 주세요.");
      await samsungProvider.connect();
      setStatusMessage("Samsung Health의 오늘 기록을 첫 동기화 중입니다...");
      const healthData = await samsungProvider.getTodayData();
      const syncedAt = new Date().toISOString();
      const saved = await saveHealthSnapshot(healthData, "samsung", syncedAt);
      if (!saved) throw new Error("첫 건강 데이터 동기화에 실패했습니다. 잠시 후 다시 시도해 주세요.");

      setSamsungLastSyncAt(syncedAt);
      localStorage.setItem("user_id", user.id);
      localStorage.setItem("user_nickname", validatedNickname);
      localStorage.setItem("profile_id", profileId);
      localStorage.setItem("samsung_health_connected", "true");
      localStorage.setItem("setup_completed", "true");
      toast({ title: "연동 완료", description: "가입 계정에 Samsung Health 첫 데이터가 동기화되었습니다." });
      window.location.href = "/";
    } catch (error) {
      setStatusMessage("");
      toast({
        title: "Samsung Health 연결 실패",
        description: error instanceof Error ? error.message : "연결 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setUser(null);
    setStatusMessage("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-2 text-center">
          <img src="/app-icon.png" alt="RH 헬스케어 로고" className="mx-auto h-20 w-20" />
          <h1 className="text-3xl font-bold">RH 헬스케어</h1>
          <p className="text-muted-foreground">계정을 만들고 Samsung Health를 연결하세요.</p>
        </div>

        {isAuthLoading ? (
          <Card><CardContent className="pt-6 text-center">로그인 상태를 확인하고 있습니다...</CardContent></Card>
        ) : !user ? (
          <Card>
            <CardHeader>
              <CardTitle>{authMode === "signup" ? "계정 만들기" : "로그인"}</CardTitle>
              <CardDescription>건강 데이터는 로그인한 본인 계정에만 저장됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">이메일</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="password">비밀번호</Label><Input id="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
              {authMode === "signup" ? <div className="space-y-2"><Label htmlFor="password-confirm">비밀번호 확인</Label><Input id="password-confirm" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /></div> : null}
              <Button className="w-full" disabled={isBusy} onClick={() => void handleAuth()}>{isBusy ? "처리 중..." : authMode === "signup" ? "가입하고 연동 시작" : "로그인"}</Button>
              <Button variant="ghost" className="w-full" disabled={isBusy} onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "이미 계정이 있나요? 로그인" : "계정 만들기"}</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Samsung Health 연결</CardTitle><CardDescription>권한을 허용하면 오늘 기록을 읽어 본인 계정에 첫 동기화합니다.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm">로그인됨: {user.email ?? "인증 계정"}</div>
              <div className="space-y-2"><Label htmlFor="nickname">닉네임</Label><Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="사용할 닉네임" /></div>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground"><li>Samsung Health에서 최신 기록을 확인합니다.</li><li>아래 버튼을 누르고 Health Connect 읽기 권한을 허용합니다.</li><li>첫 동기화가 완료되면 대시보드로 이동합니다.</li></ol>
              <Button className="w-full" disabled={isBusy} onClick={() => void handleConnectAndComplete()}>{isBusy ? "연결 중..." : "Samsung Health 연결 및 첫 동기화"}</Button>
              <Button variant="outline" className="w-full" disabled={isBusy} onClick={() => void handleLogout()}>다른 계정으로 로그인</Button>
            </CardContent>
          </Card>
        )}

        {statusMessage ? <div className="rounded-md border bg-card p-4 text-sm" role="status" aria-live="polite">{statusMessage}</div> : null}
        <p className="text-center text-xs text-muted-foreground">Android 권한은 사용자가 직접 허용해야 하며, 허용한 Samsung Health 항목만 동기화합니다.</p>
      </div>
    </div>
  );
};

export default Setup;
