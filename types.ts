export interface Pitcher {
  id: string;
  name: string;
  team: string;
  hand: 'L' | 'R';
  season_era: number;
  season_whip: number;
  qs_percentage: number; // 0-100
  next_qs_prob?: number; // 0-100
  image_url?: string;
}

export interface FeatureContribution {
  name: string;
  value: string | number;
  contribution: number;
}

export interface PredictionResponse {
  pitcher: string;
  pitcher_id: string;
  game_date: string;
  qs_probability: number; // 0.0 to 1.0
  threshold: number;
  opp_team: string;
  features: FeatureContribution[];
}

export interface GameLog {
  id: string;
  date: string;
  opponent: string;
  result: string;
  ip: number;
  er: number;
  h: number;
  bb: number;
  so: number;
  is_qs: boolean;
}

export interface PitcherStats {
  era_last_season: number;
  whip_last_season: number;
  qs_count: number;
  qs_rate: number;
  avg_ip_last3: number;
  avg_er_last3: number;
  opp_ops: number;
  rest_days: number;
}
