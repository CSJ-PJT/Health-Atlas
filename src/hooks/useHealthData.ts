import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkPermissions, getTodayHealthData } from "@/lib/health-connect";

/**
 * 오늘 Health Connect 데이터 가져오기
 */
export const useTodayHealth = () => {
  return useQuery({
    queryKey: ["health", "today"],
    queryFn: async () => {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        throw new Error("프로필 정보를 찾을 수 없습니다.");
      }

      const isNative = (window as any).Capacitor?.isNativePlatform();
      if (!isNative) {
        throw new Error("네이티브 환경이 필요합니다.");
      }

      // Check permissions
      const permStatus = await checkPermissions();
      if (!permStatus.hasAll) {
        throw new Error("Health Connect 권한이 필요합니다.");
      }

      // Get today's data from Health Connect
      const snapshot = await getTodayHealthData();

      // Format data
      const avgHeartRate = snapshot.heartRate.length > 0
        ? Math.round(snapshot.heartRate.reduce((sum, hr) => sum + hr.bpm, 0) / snapshot.heartRate.length)
        : 0;

      const latestWeight = snapshot.weight.length > 0 ? snapshot.weight[snapshot.weight.length - 1].weightKg : 0;
      const latestBodyFat = snapshot.bodyFat.length > 0 ? snapshot.bodyFat[snapshot.bodyFat.length - 1].percentage : 0;
      const distanceKm = (snapshot.aggregate.distanceMeter / 1000).toFixed(2);

      const exerciseData = snapshot.exerciseSessions.map(session => ({
        type: session.title || "운동",
        duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
        calories: session.caloriesKcal,
        exerciseType: session.exerciseType,
      }));

      const totalNutritionCalories = snapshot.nutrition.reduce((sum, n) => sum + n.energyKcal, 0);

      return {
        steps_data: {
          count: snapshot.aggregate.steps,
          distance: distanceKm,
          calories: Math.round(snapshot.aggregate.activeCaloriesKcal),
        },
        exercise_data: exerciseData.length > 0 ? exerciseData : [{
          type: "운동",
          duration: snapshot.aggregate.exerciseDurationMinutes,
          calories: Math.round(snapshot.aggregate.activeCaloriesKcal),
        }],
        sleep_data: {
          totalMinutes: snapshot.aggregate.sleepDurationMinutes,
          stages: snapshot.sleepStageSummary,
        },
        body_composition_data: {
          weight: latestWeight,
          bodyFat: latestBodyFat,
        },
        nutrition_data: {
          calories: Math.round(totalNutritionCalories),
          nutrition: snapshot.nutrition,
        },
        heart_rate: avgHeartRate,
        hydration: snapshot.hydration,
        vo2max: snapshot.vo2max,
      };
    },
    staleTime: 5 * 60 * 1000, // 5분
    retry: false,
  });
};

/**
 * 건강 데이터 기록 리스트 가져오기 (History 페이지용)
 */
export const useHealthHistory = (from?: Date, to?: Date) => {
  return useQuery({
    queryKey: ["health", "history", from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("health_data")
        .select("*")
        .order("synced_at", { ascending: false })
        .limit(30);

      if (from) {
        query = query.gte("synced_at", from.toISOString());
      }
      if (to) {
        query = query.lte("synced_at", to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2분
  });
};

/**
 * 비교 페이지용 통계 데이터 가져오기
 */
export const useHealthStats = (
  mode: "day" | "week" | "month" | "year",
  from?: Date,
  to?: Date
) => {
  return useQuery({
    queryKey: ["health", "stats", mode, from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("health_data")
        .select("synced_at, exercise_data, body_composition_data, nutrition_data, running_data, sleep_data, steps_data")
        .order("synced_at", { ascending: true });

      if (from && to) {
        query = query
          .gte("synced_at", from.toISOString())
          .lte("synced_at", to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2분
  });
};

/**
 * 모든 건강 데이터 쿼리 무효화
 */
export const useInvalidateHealthData = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["health", "today"] });
    queryClient.invalidateQueries({ queryKey: ["health", "history"] });
    queryClient.invalidateQueries({ queryKey: ["health", "stats"] });
  };
};
