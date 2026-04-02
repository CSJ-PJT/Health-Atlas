import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveProvider } from "@/providers/shared";
import { fetchHealthHistory, fetchHealthStats } from "@/providers/shared/services/healthDataRepository";
import { getMockNormalizedHealthData } from "@/providers/shared/services/mockData";
import { isMockHealthDataEnabled } from "@/providers/shared/services/mockMode";
import type { HealthViewMode } from "@/providers/shared/types/provider";

export const useTodayHealth = () => {
  return useQuery({
    queryKey: ["health", "today"],
    queryFn: async () => {
      if (isMockHealthDataEnabled()) {
        return getMockNormalizedHealthData();
      }

      try {
        return await getActiveProvider().getTodayData();
      } catch (error) {
        console.error("Falling back to mock today data:", error);
        return getMockNormalizedHealthData();
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

export const useHealthHistory = (mode: HealthViewMode, from?: Date, to?: Date) => {
  return useQuery({
    queryKey: ["health", "history", mode, from?.toISOString(), to?.toISOString()],
    queryFn: async () => fetchHealthHistory(mode, from, to),
    staleTime: 2 * 60 * 1000,
  });
};

export const useHealthStats = (mode: HealthViewMode, from?: Date, to?: Date) => {
  return useQuery({
    queryKey: ["health", "stats", mode, from?.toISOString(), to?.toISOString()],
    queryFn: async () => fetchHealthStats(mode, from, to),
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
