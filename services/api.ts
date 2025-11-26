import { Pitcher, PredictionResponse, GameLog, PitcherStats } from '../types';
import { MOCK_TOP_PITCHERS, MOCK_PREDICTION_TEMPLATE, MOCK_RECENT_GAMES } from '../constants';

// Utilities to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getTopPitchers = async (): Promise<Pitcher[]> => {
  await delay(600);
  return MOCK_TOP_PITCHERS;
};

export const searchPitchers = async (query: string): Promise<Pitcher[]> => {
  await delay(400);
  if (!query) return [];
  return MOCK_TOP_PITCHERS.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.team.toLowerCase().includes(query.toLowerCase())
  );
};

export const getPitcherPrediction = async (pitcherId: string, date?: string): Promise<PredictionResponse> => {
  await delay(1000); // Simulate ML inference time
  
  // Return a slightly randomized version of the mock based on ID
  const baseProb = pitcherId === '1' ? 0.82 : pitcherId === '3' ? 0.45 : 0.65;
  const randomFactor = (Math.random() * 0.2) - 0.1; // +/- 10%
  const finalProb = Math.max(0, Math.min(1, baseProb + randomFactor));

  // Clone mock
  const response = { ...MOCK_PREDICTION_TEMPLATE };
  response.qs_probability = finalProb;
  response.game_date = date || new Date().toISOString().split('T')[0];
  
  // Adjust specific features to match the probability change for realism
  if (finalProb < 0.5) {
     response.features = response.features.map(f => ({
       ...f,
       contribution: f.name === 'opp_ops' ? -0.25 : f.contribution // Make opponent stronger
     }));
  }

  const pitcher = MOCK_TOP_PITCHERS.find(p => p.id === pitcherId);
  if (pitcher) {
    response.pitcher = pitcher.name;
    response.pitcher_id = pitcher.id;
  }

  return response;
};

export const getRecentGames = async (pitcherId: string): Promise<GameLog[]> => {
  await delay(500);
  return MOCK_RECENT_GAMES;
};

export const getPitcherStats = async (pitcherId: string): Promise<PitcherStats> => {
    await delay(500);
    const pitcher = MOCK_TOP_PITCHERS.find(p => p.id === pitcherId);
    return {
        era_last_season: pitcher?.season_era || 3.50,
        whip_last_season: pitcher?.season_whip || 1.20,
        qs_count: 18,
        qs_rate: pitcher?.qs_percentage || 50,
        avg_ip_last3: 6.2,
        avg_er_last3: 1.8,
        opp_ops: 0.680,
        rest_days: 5
    }
}