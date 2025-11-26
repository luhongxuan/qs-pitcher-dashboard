// services/api.ts
import { Pitcher, PredictionResponse, GameLog, PitcherStats } from '../types';
import { MOCK_TOP_PITCHERS, MOCK_RECENT_GAMES } from '../constants';

// 設定後端 API 基礎路徑 (開發時可能是 http://localhost:8000)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const getTopPitchers = async (): Promise<Pitcher[]> => {
  // 目前後端尚未實作此 API，暫時回傳 Mock
  // TODO: 實作後端 @app.get("/api/top-pitchers")
  return new Promise(resolve => setTimeout(() => resolve(MOCK_TOP_PITCHERS), 600));
};

export const searchPitchers = async (query: string): Promise<Pitcher[]> => {
  // 暫時回傳 Mock
  return new Promise(resolve => {
    setTimeout(() => {
      if (!query) resolve([]);
      resolve(MOCK_TOP_PITCHERS.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.team.toLowerCase().includes(query.toLowerCase())
      ));
    }, 400);
  });
};

export const getPitcherPrediction = async (pitcherId: string, date?: string): Promise<PredictionResponse> => {
  // === 連接真實後端 ===
  try {
    const url = new URL(`${API_BASE_URL}/prediction/${encodeURIComponent(pitcherId)}`, window.location.origin);
    if (date) {
      url.searchParams.append('date', date);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as PredictionResponse;

  } catch (error) {
    console.error("Failed to fetch prediction from backend, falling back to mock for demo.", error);
    // 如果連線失敗 (例如後端沒開)，為了展示效果，回傳一個帶有錯誤標記的 Mock 或拋出錯誤
    throw error;
  }
};

export const getRecentGames = async (pitcherId: string): Promise<GameLog[]> => {
  // TODO: 實作後端 @app.get("/api/pitcher/{id}/games")
  return new Promise(resolve => setTimeout(() => resolve(MOCK_RECENT_GAMES), 500));
};

export const getPitcherStats = async (pitcherId: string): Promise<PitcherStats> => {
    // TODO: 實作後端 @app.get("/api/pitcher/{id}/stats")
    return new Promise(resolve => {
        setTimeout(() => {
            const pitcher = MOCK_TOP_PITCHERS.find(p => p.id === pitcherId);
            resolve({
                era_last_season: pitcher?.season_era || 3.50,
                whip_last_season: pitcher?.season_whip || 1.20,
                qs_count: 18,
                qs_rate: pitcher?.qs_percentage || 50,
                avg_ip_last3: 6.2,
                avg_er_last3: 1.8,
                opp_ops: 0.680,
                rest_days: 5
            });
        }, 500);
    });
}