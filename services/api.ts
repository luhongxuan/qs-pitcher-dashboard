// services/api.ts
import { Pitcher, PredictionResponse, GameLog, PitcherStats } from '../types';
import { MOCK_TOP_PITCHERS, MOCK_RECENT_GAMES } from '../constants';

// services/api.ts

// 設定後端網址 (開發時通常是 localhost:8000，上線後是 Render 網址)
// 注意：Vite 專案中，若有設定 proxy，可直接用 '/api' 或相對路徑
const API_BASE_URL = 'https://qs-pitcher-dashboard-api.onrender.com';

export const getPitcherPrediction = async (pitcherId: string, date?: string): Promise<PredictionResponse> => {
  try {
    // 建構 URL: http://127.0.0.1:8000/predict?pitcher=Gerrit%20Cole
    const url = new URL(`${API_BASE_URL}/predict`);
    url.searchParams.append('pitcher', decodeURIComponent(pitcherId)); // 解碼網址中的名字
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
      pitcher_id: data.pitcher || pitcherId,
      game_date: data.game_date,
      qs_probability: data.qs_prob, // 後端回傳的是 qs_prob
      threshold: 0.5, // 或者從後端取得
      opp_team: data.opp_team || "Unknown",
      features: [] // 如果您的後端還沒回傳 features，先給空陣列避免報錯
    };

  } catch (error) {
    console.error("Failed to fetch prediction:", error);
    throw error;
  }
};