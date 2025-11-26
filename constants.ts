import { Pitcher, GameLog, PredictionResponse } from './types';

export const APP_NAME = "QS Pitcher Dashboard";

// Mock Data for Top Pitchers
export const MOCK_TOP_PITCHERS: Pitcher[] = [
  {
    id: '1',
    name: 'Tarik Skubal',
    team: 'DET',
    hand: 'L',
    season_era: 2.39,
    season_whip: 0.92,
    qs_percentage: 78.5,
    next_qs_prob: 82.4,
    image_url: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: '2',
    name: 'Zack Wheeler',
    team: 'PHI',
    hand: 'R',
    season_era: 2.56,
    season_whip: 0.96,
    qs_percentage: 75.0,
    next_qs_prob: 78.1,
    image_url: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: '3',
    name: 'Corbin Burnes',
    team: 'BAL',
    hand: 'R',
    season_era: 2.92,
    season_whip: 1.08,
    qs_percentage: 68.2,
    next_qs_prob: 71.5,
    image_url: 'https://picsum.photos/100/100?random=3'
  },
  {
    id: '4',
    name: 'Paul Skenes',
    team: 'PIT',
    hand: 'R',
    season_era: 1.96,
    season_whip: 0.94,
    qs_percentage: 80.0,
    next_qs_prob: 85.2,
    image_url: 'https://picsum.photos/100/100?random=4'
  },
  {
    id: '5',
    name: 'Chris Sale',
    team: 'ATL',
    hand: 'L',
    season_era: 2.38,
    season_whip: 1.01,
    qs_percentage: 72.4,
    next_qs_prob: 69.8,
    image_url: 'https://picsum.photos/100/100?random=5'
  }
];

export const MOCK_RECENT_GAMES: GameLog[] = [
  { id: 'g1', date: '2024-09-28', opponent: 'vs CWS', result: 'W 4-0', ip: 7.0, er: 0, h: 2, bb: 1, so: 10, is_qs: true },
  { id: 'g2', date: '2024-09-22', opponent: '@ BAL', result: 'W 3-1', ip: 6.0, er: 1, h: 4, bb: 2, so: 7, is_qs: true },
  { id: 'g3', date: '2024-09-16', opponent: 'vs KC', result: 'L 2-4', ip: 5.0, er: 4, h: 8, bb: 1, so: 4, is_qs: false },
  { id: 'g4', date: '2024-09-10', opponent: 'vs COL', result: 'W 7-0', ip: 8.0, er: 0, h: 3, bb: 0, so: 12, is_qs: true },
  { id: 'g5', date: '2024-09-04', opponent: '@ SD', result: 'ND 3-4', ip: 5.2, er: 3, h: 6, bb: 3, so: 5, is_qs: false },
];

export const MOCK_PREDICTION_TEMPLATE: PredictionResponse = {
  pitcher: "Tarik Skubal",
  pitcher_id: "1",
  game_date: "2025-05-12",
  qs_probability: 0.734,
  threshold: 0.50,
  opp_team: "Tigers",
  features: [
    { name: "rest_days", value: 5, contribution: 0.23 },
    { name: "opp_ops", value: 0.720, contribution: -0.15 },
    { name: "avg_ip_last3", value: 6.1, contribution: 0.18 },
    { name: "avg_er_last3", value: 2.3, contribution: 0.12 },
    { name: "season_era", value: 2.39, contribution: 0.20 },
    { name: "season_whip", value: 0.92, contribution: 0.10 },
    { name: "hand", value: "L", contribution: 0.02 },
    { name: "opp_team_rank", value: "18th", contribution: -0.05 },
    { name: "venue_factor", value: 0.98, contribution: 0.03 }
  ]
};