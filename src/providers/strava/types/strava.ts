export interface StravaProviderConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  athleteId: string;
}

export interface StravaTokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  calories?: number;
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
}

export interface StravaAthleteStats {
  recent_run_totals?: {
    distance?: number;
    moving_time?: number;
    elevation_gain?: number;
  };
  all_run_totals?: {
    distance?: number;
    moving_time?: number;
    elevation_gain?: number;
  };
}

export interface StravaAthleteProfile {
  weight?: number;
}

export interface StravaDailyPayload {
  summary?: {
    steps?: number;
    distanceMeters?: number;
    activeCalories?: number;
    averageHeartRate?: number;
    restingHeartRate?: number;
    weightKg?: number;
    vo2Max?: number;
    elevationGain?: number;
  };
  activities?: StravaActivity[];
  athlete?: StravaAthleteProfile | null;
  stats?: StravaAthleteStats | null;
}
