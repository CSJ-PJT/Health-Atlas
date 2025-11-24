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

const AccountSettings = () => {
  const [userId, setUserId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [userIdChanged, setUserIdChanged] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfileData();
  }, []);

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

          <Button 
            onClick={() => navigate("/admin")} 
            variant="outline"
            className="w-full"
          >
            관리 메뉴로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
