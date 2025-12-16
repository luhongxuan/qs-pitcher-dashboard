// services/api.ts
import { Pitcher, PredictionResponse, GameLog, PitcherStats, ScenarioFeatures, PitchType, User, AuthResponse, UserPreferences  } from '../types';
import { MOCK_TOP_PITCHERS, MOCK_RECENT_GAMES } from '../constants';
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
        { id: '2', name: 'Changeup', code: 'CH', avg_velocity: 84.0, movement: 'sinker', weight: 0.30 },
        { id: '3', name: 'Slider', code: 'SL', avg_velocity: 87.5, movement: 'slider', weight: 0.25 },
    ],
    '2': [ // Wheeler
        { id: '1', name: '4-Seam Fastball', code: 'FF', avg_velocity: 95.8, movement: 'straight', weight: 0.40 },
        { id: '2', name: 'Sinker', code: 'SI', avg_velocity: 95.0, movement: 'sinker', weight: 0.20 },
        { id: '3', name: 'Sweeper', code: 'ST', avg_velocity: 80.5, movement: 'curve', weight: 0.25 },
        { id: '4', name: 'Curveball', code: 'CU', avg_velocity: 81.2, movement: 'curve', weight: 0.15 },
    ],
    // Default fallback
    'default': [
        { id: '1', name: 'Fastball', code: 'FF', avg_velocity: 93.0, movement: 'straight', weight: 0.5 },
        { id: '2', name: 'Slider', code: 'SL', avg_velocity: 85.0, movement: 'slider', weight: 0.3 },
        { id: '3', name: 'Curveball', code: 'CU', avg_velocity: 78.0, movement: 'curve', weight: 0.2 },
    ]
};

export const getPitches = async (pitcherId: string): Promise<PitchType[]> => {
    await delay(300);
    return MOCK_PITCHES[pitcherId] || MOCK_PITCHES['default'];
};

const STORAGE_KEYS = {
  USERS: 'qs_users_db',
  FAVORITES: 'qs_favorites_db',
  TOKEN: 'qs_auth_token'
};

// Helper to get local DB
const getLocalDB = () => {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
  return { users, favorites };
};

// Save local DB helper
const saveLocalDBUsers = (users: any[]) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

const DEFAULT_PREFERENCES: UserPreferences = {
  email_qs_alerts: false,
  email_marketing: false,
  measurement_unit: 'imperial',
  theme_preference: 'dark'
};

export const registerUser = async (email: string, password: string, username: string): Promise<AuthResponse> => {
  await delay(800);
  const { users } = getLocalDB();
  
  if (users.find((u: any) => u.email === email)) {
    throw new Error("Email already registered");
  }

  const newUser: User = {
    id: `user_${Date.now()}`,
    email,
    username,
    display_name: username, // Default display name
    joined_at: new Date().toISOString(),
    preferences: DEFAULT_PREFERENCES
  };

  // Persist
  saveLocalDBUsers([...users, { ...newUser, password }]);
  
  // Auto login
  const token = `fake_jwt_${newUser.id}_${Date.now()}`;
  return { user: newUser, token };
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  await delay(800);
  const { users } = getLocalDB();
  const user = users.find((u: any) => u.email === email && u.password === password);
  
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Ensure user has preferences object (migration for old data)
  if (!user.preferences) {
     user.preferences = DEFAULT_PREFERENCES;
     // Update in DB
     const updatedUsers = users.map((u:any) => u.id === user.id ? user : u);
     saveLocalDBUsers(updatedUsers);
  }

  const { password: _, ...safeUser } = user;
  const token = `fake_jwt_${safeUser.id}_${Date.now()}`;
  return { user: safeUser, token };
};

export const getCurrentUser = async (token: string): Promise<User | null> => {
  await delay(200); 
  if (!token || !token.startsWith('fake_jwt_')) return null;
  
  const parts = token.split('_');
  if (parts.length < 4) return null;
  const userId = `${parts[2]}_${parts[3]}`;
  
  const { users } = getLocalDB();
  const user = users.find((u: any) => u.id === userId);
  if (!user) return null;

  // Migration for old users without preferences
  if (!user.preferences) user.preferences = DEFAULT_PREFERENCES;

  const { password: _, ...safeUser } = user;
  return safeUser;
};

// --- New Profile API Endpoints ---

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User> => {
  await delay(600);
  const { users } = getLocalDB();
  
  const userIndex = users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) throw new Error("User not found");

  const currentUser = users[userIndex];
  
  // Merge updates (only allow specific fields)
  const updatedUser = {
    ...currentUser,
    display_name: updates.display_name ?? currentUser.display_name,
    favorite_team: updates.favorite_team ?? currentUser.favorite_team,
    avatar_url: updates.avatar_url ?? currentUser.avatar_url
  };

  users[userIndex] = updatedUser;
  saveLocalDBUsers(users);

  const { password: _, ...safeUser } = updatedUser;
  return safeUser;
};

export const updateUserPreferences = async (userId: string, preferences: UserPreferences): Promise<User> => {
  await delay(500);
  const { users } = getLocalDB();
  
  const userIndex = users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) throw new Error("User not found");

  const updatedUser = {
    ...users[userIndex],
    preferences: preferences
  };

  users[userIndex] = updatedUser;
  saveLocalDBUsers(users);

  const { password: _, ...safeUser } = updatedUser;
  return safeUser;
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
  await delay(800);
  const { users } = getLocalDB();
  
  const userIndex = users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) throw new Error("User not found");
  
  const user = users[userIndex];
  
  // Verify current password
  if (user.password !== currentPassword) {
    throw new Error("Current password is incorrect");
  }

  // Update password
  user.password = newPassword; // In production, this would be hashed
  users[userIndex] = user;
  saveLocalDBUsers(users);

  return true;
};


export const getFavorites = async (userId: string): Promise<string[]> => {
  await delay(400);
  const { favorites } = getLocalDB();
  return favorites
    .filter((f: any) => f.user_id === userId)
    .map((f: any) => f.pitcher_id);
};

export const toggleFavorite = async (userId: string, pitcherId: string): Promise<boolean> => {
  await delay(300);
  const { favorites } = getLocalDB();
  
  const existingIndex = favorites.findIndex((f: any) => f.user_id === userId && f.pitcher_id === pitcherId);
  let newFavorites;
  let isAdded = false;

  if (existingIndex >= 0) {
    // Remove
    newFavorites = favorites.filter((_: any, i: number) => i !== existingIndex);
  } else {
    // Add
    newFavorites = [...favorites, { user_id: userId, pitcher_id: pitcherId, created_at: new Date().toISOString() }];
    isAdded = true;
  }

  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
  console.log(favorites, newFavorites);
  return isAdded;
};
