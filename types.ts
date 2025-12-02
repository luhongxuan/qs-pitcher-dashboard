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
  hand: 'L' | 'R';
  avg_ip_last3: number;
  avg_er_last3: number;
  opp_ops: number;
  is_home: number;
  rest_days: number;
  team: string;
}

export interface ScenarioFeatures {
  pitcher: string;
  Team: string;
  opp_team: string;
  hand: 'L' | 'R';
  season_era: number;
  season_whip: number;
  rest_days: number;
  opp_ops: number;
  avg_ip_last3: number;
  avg_er_last3: number;
  is_home: number; // 1 = home, 0 = away
}