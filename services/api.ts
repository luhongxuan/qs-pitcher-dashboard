// services/api.ts
import { Pitcher, PredictionResponse, GameLog, PitcherStats, ScenarioFeatures, PitchType  } from '../types';
import { MOCK_TOP_PITCHERS, MOCK_PREDICTION_TEMPLATE, MOCK_RECENT_GAMES } from '../constants';
import { Pi } from 'lucide-react';

// Utilities to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// services/api.ts

// 設定後端網址 (開發時通常是 localhost:8000，上線後是 Render 網址)
// 注意：Vite 專案中，若有設定 proxy，可直接用 '/api' 或相對路徑
const API_BASE_URL = 'http://localhost:8000/api';
  
export const getPitcherPrediction = async (pitcherName: string, date?: string): Promise<PredictionResponse> => {
  try {
    // 建構 URL: http://127.0.0.1:8000/predict?pitcher=Gerrit%20Cole
    const url = new URL(`${API_BASE_URL}/prediction/${encodeURIComponent(pitcherName)}`);
    //url.searchParams.append('pitcher_name', decodeURIComponent(pitcherName)); // 解碼網址中的名字
    if (date) {
      url.searchParams.append('game_date', date);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      // 如果後端回傳 404，這裡會拋出錯誤，讓前端頁面顯示 "Pitcher Not Found"
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 轉換後端格式為前端需要的格式 (如果欄位名稱不完全一致)
    return {
      pitcher: data.pitcher,
      game_date: data.game_date,
      qs_probability: data.qs_probability, // 後端回傳的是 qs_prob
      threshold: 0.5, // 或者從後端取得
      opp_team: data.opp_team || "Unknown",
      features: data.features // 如果您的後端還沒回傳 features，先給空陣列避免報錯
    };

  } catch (error) {
    console.error("Failed to fetch prediction:", error);
    throw error;
  }
};

export const getRecentGames = async(pitcherName: string): Promise<GameLog[]> => {
  try{
    const url = new URL(`${API_BASE_URL}/get_recent_games/${encodeURIComponent(pitcherName)}`);
    
    const response = await fetch(url.toString());
    
    if(!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }catch (error) {
    console.error("Failed to fetch recent games:", error);
    throw error;
  }
};

export const getPitcherStats = async (pitcherName: string, date?: string): Promise<PitcherStats> => {
  try {
    const url = new URL(`${API_BASE_URL}/status/${encodeURIComponent(pitcherName)}`);
    if (date) {
      url.searchParams.append('game_date', date);
    }

    const response = await fetch(url.toString());

    if(!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      era_last_season: Number(data.season_era || 0),
      whip_last_season: Number(data.season_whip || 0),
      hand: data.hand,
      avg_ip_last3: Number(data.avg_ip_last3 || 0),
      avg_er_last3: Number(data.avg_er_last3 || 0),
      opp_ops: Number(data.opp_ops || 0),
      is_home: Number(data.is_home || 0),
      rest_days: data.rest_days,
      team: data.team
    }
  }catch (error) {
    console.error("Falied to fetch pitcher stats:", error);
    throw error;
  }
}

export const getTopPitchers = async (): Promise<Pitcher[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_top_predictions`);
    if(!response.ok) {
      console.warn("Failed to fetch top pitchers, using mock data.");
      return MOCK_TOP_PITCHERS;
    }

    const data = await response.json();

    return data.map((item: any, index: number) => ({
      pitcher_name: item.pitcher_name,
      team: item.team,
      opp_team: item.opp_team,
      avg_ip_last3: item.avg_ip_last3,
      avg_er_last3: item.avg_er_last3,
      qs_probability: item.qs_probability,
      image_url: item.image_url
    }));
  } catch (error) {
    console.error("Error fetching top pitchers:", error);
    return MOCK_TOP_PITCHERS;
  }
};

export const getSimulatedPrediction = async (features: ScenarioFeatures): Promise<PredictionResponse> => {
  try {
    const url = `${API_BASE_URL}/predict/simulate`;

    console.log("Sending features for simulation:", features);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(features)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      pitcher: data.pitcher,
      game_date: data.game_date,
      qs_probability: data.qs_probability, // 後端回傳的是 qs_prob
      threshold: 0.5, // 或者從後端取得
      opp_team: data.opp_team || "Unknown",
      features: data.features // 如果您的後端還沒回傳 features，先給空陣列避免報錯
    };
  } catch (error) {
    console.error("Failed to fetch simulated prediction:", error);
    throw error;
  }
};

const MOCK_PITCHES: Record<string, PitchType[]> = {
    '1': [ // Skubal
        { id: '1', name: '4-Seam Fastball', code: 'FF', avg_velocity: 96.5, movement: 'straight', weight: 0.45 },
        { id: '2', name: 'Changeup', code: 'CH', avg_velocity: 84.0, movement: 'sink', weight: 0.30 },
        { id: '3', name: 'Slider', code: 'SL', avg_velocity: 87.5, movement: 'slide', weight: 0.25 },
    ],
    '2': [ // Wheeler
        { id: '1', name: '4-Seam Fastball', code: 'FF', avg_velocity: 95.8, movement: 'straight', weight: 0.40 },
        { id: '2', name: 'Sinker', code: 'SI', avg_velocity: 95.0, movement: 'sink', weight: 0.20 },
        { id: '3', name: 'Sweeper', code: 'ST', avg_velocity: 80.5, movement: 'curve', weight: 0.25 },
        { id: '4', name: 'Curveball', code: 'CU', avg_velocity: 81.2, movement: 'curve', weight: 0.15 },
    ],
    // Default fallback
    'default': [
        { id: '1', name: 'Fastball', code: 'FF', avg_velocity: 93.0, movement: 'straight', weight: 0.5 },
        { id: '2', name: 'Slider', code: 'SL', avg_velocity: 85.0, movement: 'slide', weight: 0.3 },
        { id: '3', name: 'Curveball', code: 'CU', avg_velocity: 78.0, movement: 'curve', weight: 0.2 },
    ]
};

export const getPitches = async (pitcherId: string): Promise<PitchType[]> => {
    await delay(300);
    return MOCK_PITCHES[pitcherId] || MOCK_PITCHES['default'];
};