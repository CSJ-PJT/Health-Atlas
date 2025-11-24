import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { userIdSchema, passwordSchema, nicknameSchema } from "@/lib/validationSchemas";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AccountSettings = () => {
  const [userId, setUserId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [userIdChanged, setUserIdChanged] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Health Connect 권한 상태
  const [permissions, setPermissions] = useState({
    readSteps: false,
    writeSteps: false,
    readHeartRate: false,
    writeHeartRate: false,
    readSleep: false,
    writeSleep: false,
    readExercise: false,
    writeExercise: false,
    readNutrition: false,
    writeNutrition: false,
    readBodyComposition: false,
    writeBodyComposition: false,
    readBloodPressure: false,
    writeBloodPressure: false,
    backgroundRead: false,
  });
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfileData();
    loadPermissions();
  }, []);

  const loadPermissions = () => {
    // Load saved permissions from localStorage
    const savedPermissions = localStorage.getItem('health_connect_permissions');
    if (savedPermissions) {
      setPermissions(JSON.parse(savedPermissions));
    }
  };

  const handlePermissionChange = (key: string, value: boolean) => {
    const newPermissions = { ...permissions, [key]: value };
    setPermissions(newPermissions);
    localStorage.setItem('health_connect_permissions', JSON.stringify(newPermissions));
    
    toast({
      title: "권한 설정 변경",
      description: `${getPermissionLabel(key)} 권한이 ${value ? '허용' : '거부'}되었습니다.`,
    });
  };

  const getPermissionLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      readSteps: "걸음수 읽기",
      writeSteps: "걸음수 쓰기",
      readHeartRate: "심박수 읽기",
      writeHeartRate: "심박수 쓰기",
      readSleep: "수면 읽기",
      writeSleep: "수면 쓰기",
      readExercise: "운동 읽기",
      writeExercise: "운동 쓰기",
      readNutrition: "영양 읽기",
      writeNutrition: "영양 쓰기",
      readBodyComposition: "신체 구성 읽기",
      writeBodyComposition: "신체 구성 쓰기",
      readBloodPressure: "혈압 읽기",
      writeBloodPressure: "혈압 쓰기",
      backgroundRead: "백그라운드 데이터 읽기",
    };
    return labels[key] || key;
  };

  const loadProfileData = async () => {
    try {
      const storedUserId = localStorage.getItem("user_id");
      if (!storedUserId) {
        toast({
          title: "오류",
          description: "사용자 정보를 찾을 수 없습니다.",
          variant: "destructive",
        });
        navigate("/setup");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", storedUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserId(data.user_id);
        setNickname(data.nickname);
        setUserIdChanged(data.user_id_changed);
        setProfileId(data.id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "오류",
        description: "프로필 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleUserIdChange = async () => {
    if (userIdChanged) {
      toast({
        title: "변경 불가",
        description: "ID는 한 번만 변경할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedUserId = userIdSchema.parse(newUserId);
      setIsLoading(true);

      // 중복 확인
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", validatedUserId)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "중복된 ID",
          description: "이미 사용 중인 ID입니다.",
          variant: "destructive",
        });
        return;
      }

      // ID 변경
      const { error } = await supabase
        .from("profiles")
        .update({ 
          user_id: validatedUserId, 
          user_id_changed: true 
        })
        .eq("id", profileId);

      if (error) throw error;

      localStorage.setItem("user_id", validatedUserId);
      setUserId(validatedUserId);
      setUserIdChanged(true);
      setNewUserId("");

      toast({
        title: "변경 완료",
        description: "ID가 성공적으로 변경되었습니다.",
      });
    } catch (error: any) {
      if (error.errors) {
        toast({
          title: "입력 오류",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error changing user ID:", error);
        toast({
          title: "오류",
          description: "ID 변경 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "입력 오류",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      passwordSchema.parse(password);
      setIsLoading(true);

      // 여기서는 localStorage에 암호화하여 저장 (실제로는 서버에서 처리해야 함)
      // 데모 목적으로 간단히 구현
      localStorage.setItem("user_password", btoa(password));

      setPassword("");
      setConfirmPassword("");

      toast({
        title: "변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      });
    } catch (error: any) {
      if (error.errors) {
        toast({
          title: "입력 오류",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error changing password:", error);
        toast({
          title: "오류",
          description: "비밀번호 변경 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNicknameChange = async () => {
    try {
      const validatedNickname = nicknameSchema.parse(nickname);
      setIsLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({ nickname: validatedNickname })
        .eq("id", profileId);

      if (error) throw error;

      localStorage.setItem("user_nickname", validatedNickname);

      toast({
        title: "변경 완료",
        description: "닉네임이 성공적으로 변경되었습니다.",
      });
    } catch (error: any) {
      if (error.errors) {
        toast({
          title: "입력 오류",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error changing nickname:", error);
        toast({
          title: "오류",
          description: "닉네임 변경 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollToTop />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">계정 설정</h1>

        <div className="space-y-6">
          {/* ID 변경 */}
          <Card>
            <CardHeader>
              <CardTitle>사용자 ID 변경</CardTitle>
              <CardDescription>
                현재 ID: <span className="font-semibold">{userId}</span>
                {userIdChanged && <span className="text-destructive ml-2">(변경 완료 - 더 이상 변경 불가)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-id">새 ID</Label>
                <Input
                  id="new-user-id"
                  type="text"
                  placeholder="영문, 숫자, 언더스코어(_)만 사용 (4-20자)"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  disabled={userIdChanged || isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  ID는 한 번만 변경할 수 있습니다.
                </p>
              </div>
              <Button 
                onClick={handleUserIdChange} 
                disabled={userIdChanged || !newUserId || isLoading}
                className="w-full"
              >
                ID 변경
              </Button>
            </CardContent>
          </Card>

          {/* 비밀번호 변경 */}
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>
                소문자, 숫자, 특수문자를 포함한 10자 이상
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">새 비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="소문자, 숫자, 특수문자 포함 10자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">비밀번호 확인</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button 
                onClick={handlePasswordChange} 
                disabled={!password || !confirmPassword || isLoading}
                className="w-full"
              >
                비밀번호 변경
              </Button>
            </CardContent>
          </Card>

          {/* 닉네임 변경 */}
          <Card>
            <CardHeader>
              <CardTitle>닉네임 변경</CardTitle>
              <CardDescription>
                현재 닉네임: <span className="font-semibold">{nickname}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">새 닉네임</Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="2-20자"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button 
                onClick={handleNicknameChange} 
                disabled={!nickname || isLoading}
                className="w-full"
              >
                닉네임 변경
              </Button>
            </CardContent>
          </Card>

          {/* Health Connect 권한 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>Health Connect 권한 설정</CardTitle>
              <CardDescription>
                건강 데이터 접근 권한을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="privacy-policy" className="flex-1">개인정보 처리방침</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPrivacyDialog(true)}
                  >
                    확인
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">읽기 권한</p>
                  
                  {[
                    { key: 'readSteps', label: '걸음수 읽기' },
                    { key: 'readHeartRate', label: '심박수 읽기' },
                    { key: 'readSleep', label: '수면 데이터 읽기' },
                    { key: 'readExercise', label: '운동 데이터 읽기' },
                    { key: 'readNutrition', label: '영양 데이터 읽기' },
                    { key: 'readBodyComposition', label: '신체 구성 읽기' },
                    { key: 'readBloodPressure', label: '혈압 읽기' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={key} className="flex-1">{label}</Label>
                      <Switch
                        id={key}
                        checked={permissions[key as keyof typeof permissions]}
                        onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">쓰기 권한</p>
                  
                  {[
                    { key: 'writeSteps', label: '걸음수 쓰기' },
                    { key: 'writeHeartRate', label: '심박수 쓰기' },
                    { key: 'writeSleep', label: '수면 데이터 쓰기' },
                    { key: 'writeExercise', label: '운동 데이터 쓰기' },
                    { key: 'writeNutrition', label: '영양 데이터 쓰기' },
                    { key: 'writeBodyComposition', label: '신체 구성 쓰기' },
                    { key: 'writeBloodPressure', label: '혈압 쓰기' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={key} className="flex-1">{label}</Label>
                      <Switch
                        id={key}
                        checked={permissions[key as keyof typeof permissions]}
                        onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">고급 권한</p>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="backgroundRead" className="flex-1">백그라운드 데이터 읽기</Label>
                    <Switch
                      id="backgroundRead"
                      checked={permissions.backgroundRead}
                      onCheckedChange={(checked) => handlePermissionChange('backgroundRead', checked)}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  이 권한들은 Android Health Connect를 통해 건강 데이터에 접근하기 위해 필요합니다. 
                  실제 네이티브 앱에서 권한을 요청하며, 이 설정은 사용자 선호도를 저장합니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={() => navigate("/admin")} 
            variant="outline"
            className="w-full"
          >
            관리 메뉴로 돌아가기
          </Button>
        </div>
      </div>

      {/* 개인정보처리방침 대화상자 */}
      <AlertDialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>개인정보 처리방침</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-left">
              <div>
                <h3 className="font-semibold text-foreground mb-2">1. 수집하는 개인 건강 정보</h3>
                <p>본 앱은 다음의 건강 정보를 수집합니다:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>신체 활동 데이터 (걸음수, 운동 기록, 칼로리)</li>
                  <li>수면 데이터 (수면 시간, 수면 단계)</li>
                  <li>신체 측정 데이터 (체중, 체지방률, BMI)</li>
                  <li>영양 데이터 (섭취 칼로리, 영양소)</li>
                  <li>생체 신호 (심박수, 혈압)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2. 정보 수집 방법</h3>
                <p>Health Connect를 통해 Samsung Health 및 기타 호환 앱으로부터 데이터를 수집합니다.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">3. 정보의 이용 목적</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>개인 맞춤형 건강 분석 제공</li>
                  <li>AI 기반 건강 관리 조언</li>
                  <li>건강 데이터 시각화 및 추세 분석</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">4. 정보 보안</h3>
                <p>모든 건강 데이터는 암호화되어 전송되며, 안전하게 저장됩니다. 사용자의 동의 없이 제3자에게 제공되지 않습니다.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">5. 권한 철회</h3>
                <p>언제든지 앱 설정에서 권한을 철회할 수 있으며, 철회 시 해당 데이터의 수집이 중단됩니다.</p>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  자세한 내용은{" "}
                  <a 
                    href="https://developer.android.com/health-and-fitness/guides/health-connect" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Android Health Connect 가이드
                  </a>
                  를 참조하세요.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPrivacyDialog(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountSettings;
