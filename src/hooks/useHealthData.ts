import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveProvider } from "@/providers/shared";
import { fetchHealthHistory, fetchHealthStats } from "@/providers/shared/services/healthDataRepository";

export const useTodayHealth = () => {
  return useQuery({
    queryKey: ["health", "today"],
    queryFn: async () => {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) {
        throw new Error("프로필 정보를 찾을 수 없습니다.");
      }

      return getActiveProvider().getTodayData();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

export const useHealthHistory = (from?: Date, to?: Date) => {
  return useQuery({
    queryKey: ["health", "history", from?.toISOString(), to?.toISOString()],
    queryFn: async () => fetchHealthHistory(from, to),
    staleTime: 2 * 60 * 1000,
  });
};

export const useHealthStats = (
  mode: "day" | "week" | "month" | "year",
  from?: Date,
  to?: Date,
) => {
  return useQuery({
    queryKey: ["health", "stats", mode, from?.toISOString(), to?.toISOString()],
    queryFn: async () => fetchHealthStats(from, to),
    staleTime: 2 * 60 * 1000,
  });
};

export const useInvalidateHealthData = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["health", "today"] });
    queryClient.invalidateQueries({ queryKey: ["health", "history"] });
    queryClient.invalidateQueries({ queryKey: ["health", "stats"] });
  };
};
