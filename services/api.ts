// services/api.ts
import { Pitcher, PredictionResponse, GameLog, PitcherStats } from '../types';
import { MOCK_TOP_PITCHERS, MOCK_PREDICTION_TEMPLATE, MOCK_RECENT_GAMES } from '../constants';
import { Pi } from 'lucide-react';

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