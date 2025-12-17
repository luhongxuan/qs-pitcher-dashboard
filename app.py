# app.py
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import date, datetime
from pydantic import BaseModel
import os
import joblib
import psycopg
import pandas as pd
import numpy as np
import shap
from dotenv import load_dotenv

load_dotenv()

# === 設定 ===
# 確保這些欄位名稱與您訓練時完全一致
FEATURES = [
    "rest_days", "opp_ops", "is_home", "avg_ip_last3", "avg_er_last3",
    "season_era", "season_whip", "hand", "opp_team", "Team", "pitcher"
]

NUMERIC_COLS = ["rest_days", "opp_ops", "is_home", "avg_ip_last3", "avg_er_last3", "season_era", "season_whip"]
CATEG_COLS = ["hand", "opp_team", "Team", "pitcher"]

# 模型路徑
MODEL_PATH = "./artifacts_qs_xgb/qs_xgb_classifier_calibrated.joblib"
RAW_PIPE_PATH = "./artifacts_qs_xgb/qs_xgb_pipeline_raw.joblib" # SHAP 需要原始模型
THRESH_PATH = "./artifacts_qs_xgb/qs_best_threshold.json"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動：載入模型與建立 DB 連線
    print("Loading models...")
    try:
        app.state.pipe = joblib.load(MODEL_PATH)
        app.state.raw_pipe = joblib.load(RAW_PIPE_PATH)
        print("Models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}")
        # 為了避免服務起不來，這裡可以選擇報錯或設為 None，但建議修正路徑
        raise e

    # 載入閾值
    app.state.threshold = 0.5
    if os.path.exists(THRESH_PATH):
        import json
        try:
            with open(THRESH_PATH, "r") as f:
                data = json.load(f)
                app.state.threshold = data.get("best_threshold", 0.5)
        except:
            pass

    # DB 連線 (請確保環境變數 DATABASE_URL 已設定)
    # 範例: postgres://user:pass@localhost:5432/dbname
    try:
        app.state.db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))
        print("Database connected.")    
    except Exception as e:
        print(f"Warning: Database connection failed: {e}")
        app.state.db = None

    yield
    
    # 關閉資源
    if app.state.db:
        app.state.db.close()

app = FastAPI(lifespan=lifespan)

# 允許前端跨域請求 (如果是前後端分離開發)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === 核心邏輯：計算 SHAP 貢獻值 ===
def calculate_feature_contributions(raw_pipe, row_df):
    """
    計算單筆資料的特徵貢獻度 (SHAP values)
    回傳格式符合前端 FeatureContribution 介面
    """
    try:
        prep = raw_pipe.named_steps["prep"]
        xgb_model = raw_pipe.named_steps["model"]

        # 1. 前處理 (Encoding)
        X_enc = prep.transform(row_df)
        
        # 2. 計算 SHAP
        explainer = shap.TreeExplainer(xgb_model)
        shap_values = explainer.shap_values(X_enc)

        # 處理 SHAP 回傳格式 (list vs ndarray)
        if isinstance(shap_values, list):
            vals = shap_values[1][0] # 二元分類取正類別
        else:
            vals = shap_values[0]

        # 3. 對應特徵名稱
        encoded_names = prep.get_feature_names_out()
        
        # 4. 加總 One-Hot Encoding 的貢獻回到原始欄位
        contrib_dict = {f: 0.0 for f in FEATURES}
        
        for name, v in zip(encoded_names, vals):
            if "__" in name:
                _, rest = name.split("__", 1)
            else:
                rest = name
            
            # 如果是數值欄位
            if rest in NUMERIC_COLS:
                contrib_dict[rest] += float(v)
                continue
            
            # 如果是類別欄位 (例如 opp_team_NYY -> opp_team)
            for cat in CATEG_COLS:
                prefix = cat + "_"
                if rest.startswith(prefix):
                    contrib_dict[cat] += float(v)
                    break
        
        # 5. 格式化輸出
        contributions = []
        row_dict = row_df.iloc[0].to_dict()
        
        for feature_name in FEATURES:
            # 為了美觀，可以過濾掉貢獻極小的特徵 (例如 0)
            if abs(contrib_dict[feature_name]) > 0.001:
                contributions.append({
                    "name": feature_name,
                    "value": str(row_dict.get(feature_name, "")),
                    "contribution": round(contrib_dict[feature_name], 4)
                })
                
        return contributions

    except Exception as e:
        print(f"SHAP calculation error: {e}")
        return []

# === API Endpoints ===

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/prediction/{pitcher_name}")
async def get_prediction(
    request: Request, 
    pitcher_name: str, 
    date: str = Query(None) # YYYY-MM-DD
):
    """
    取得特定投手的預測結果 (含 SHAP 解釋)
    注意：這裡假設 pitcher_id 可以對應到 DB 中的投手名稱或 ID。
    為了簡化，這裡先假設 pitcher_id 就是投手姓名 (URL encoded)
    """
    db = request.app.state.db
    db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))
    pipe = request.app.state.pipe
    raw_pipe = request.app.state.raw_pipe
    threshold = request.app.state.threshold

    if not db:
        raise HTTPException(status_code=503, detail="Database not available")

    # 處理日期
    target_date = date if date else datetime.now().strftime("%Y-%m-%d")
    
    # 如果沒有指定日期，找最近一場或未來的一場
    date_clause = "AND game_date = %s" if date else "ORDER BY game_date DESC LIMIT 1"
    params = (pitcher_name, date) if date else (pitcher_name,)

    sql = f"""
        SELECT rest_days, opp_ops, is_home, avg_ip_last3, avg_er_last3,
               season_era, season_whip, hand, opp_team, team AS "Team", pitcher, game_date
        FROM pitcher_features
        WHERE pitcher ILIKE %s {date_clause}
    """
    
    # 注意：如果 SQL 查詢欄位名稱不同，請使用 AS alias 
    
    with db.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone() # 假設回傳 tuple
        cols = [desc[0] for desc in cur.description]

    if not row:
        raise HTTPException(status_code=404, detail=f"No data found for pitcher {pitcher_name}")
    # 轉成 DataFrame
    row_dict = dict(zip(cols, row))
    
    # 確保 DataFrame 欄位與模型訓練時一致 (順序與名稱)
    # 補齊可能缺失的欄位 (這很重要，避免 pipeline 報錯)
    input_data = {f: row_dict.get(f, 0) for f in FEATURES} # 簡單補 0，建議根據實際情況調整
    df = pd.DataFrame([input_data])

    # 1. 預測機率
    try:
        prob = float(pipe.predict_proba(df)[0, 1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    # 2. 計算解釋 (Feature Importance)
    features_contrib = calculate_feature_contributions(raw_pipe, df)
    # 3. 回傳結果
    return {
        "pitcher": row_dict.get("pitcher"),
        "game_date": str(row_dict.get("game_date")),
        "qs_probability": prob,
        "threshold": threshold,
        "opp_team": row_dict.get("opp_team"),
        "features": features_contrib
    }

@app.get("/api/status/{pitcher_name}")
async def get_pitcher_status(
    request: Request,
    pitcher_name: str,
    date: str = Query(None) # YYYY-MM-DD
):
    db = request.app.state.db
    db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))

    if not db:
        raise HTTPException(status_code=503, detail="Database not available")

    date_clause = "AND game_date = %s" if date else "ORDER BY game_date DESC LIMIT 1"
    params = (pitcher_name, date) if date else (pitcher_name,)

    sql = f"""
        SELECT pitcher, game_date, season_era, season_whip, hand, opp_ops, is_home, rest_days, avg_ip_last3, avg_er_last3, team
        FROM stg_pitcher_raw_2025
        WHERE pitcher ILIKE %s {date_clause}
    """

    with db.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        cols = [desc[0] for desc in cur.description]

    if not row:
        raise HTTPException(status_code=404, detail=f"No data found for pitcher {pitcher_name}")
    
    row_dict = dict(zip(cols, row))

    return {
        "pitcher": row_dict.get("pitcher"),
        "game_date": str(row_dict.get("game_date")),
        "season_era": row_dict.get("season_era"),
        "season_whip": row_dict.get("season_whip"),
        "hand": row_dict.get("hand"),
        "opp_ops": row_dict.get("opp_ops"),
        "is_home": row_dict.get("is_home"),
        "rest_days": row_dict.get("rest_days"),
        "avg_ip_last3": row_dict.get("avg_ip_last3"),
        "avg_er_last3": row_dict.get("avg_er_last3"),
        "team": row_dict.get("team")
    }

@app.get("/api/get_recent_games/{pitcher_name}")
async def get_pitcher_status(
    request: Request,
    pitcher_name: str,
):
    db = request.app.state.db
    db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))

    if not db:
        raise HTTPException(status_code=503, detail="Database not available")

    sql = f"""
        SELECT pitcher, game_date, opp_team, game_result, ip, er, r, bb, so, team_score, opp_score
        FROM stg_pitcher_raw_2025
        WHERE pitcher ILIKE %s
        ORDER BY game_date DESC LIMIT 5
    """

    with db.cursor() as cur:
        cur.execute(sql, (pitcher_name,))
        row = cur.fetchall()
        cols = [desc[0] for desc in cur.description]

    if not row:
        raise HTTPException(status_code=404, detail=f"No data found for pitcher {pitcher_name}")
    
    total_rows = []
    for i, r in enumerate(row):
        row_dict = dict(zip(cols, r))
        row_dict = {
            "id": f"g{i + 1}",
            "pitcher": row_dict.get("pitcher"),
            "date": datetime.strptime(str(row_dict.get("game_date")), "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%d"),
            "opponent": row_dict.get("opp_team"),
            "result": row_dict.get("game_result") + f" {row_dict.get('team_score')}-{row_dict.get('opp_score')}",
            "ip": row_dict.get("ip"),
            "er": row_dict.get("er"),
            "r": row_dict.get("r"),
            "bb": row_dict.get("bb"),
            "so": row_dict.get("so"),
            "is_qs": True if float(row_dict.get("ip")) >= 6 and float(row_dict.get("er")) <= 3 else False
        }
        total_rows.append(row_dict)
    
    return total_rows

@app.get("/api/get_top_predictions")
async def get_top_predictions(
    request: Request, 
):
    db = request.app.state.db
    db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))

    sql = f"""
        SELECT pitcher_name, game_date, team, opp_team, avg_ip_last3, avg_er_last3,
                qs_probability
        FROM daily_predictions
        ORDER BY qs_probability DESC
        LIMIT 5
    """
    
    # 注意：如果 SQL 查詢欄位名稱不同，請使用 AS alias 
    
    with db.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        if cur.description:
            cols = [desc[0] for desc in cur.description]
        else:
            cols = []

    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    # 轉成 DataFrame
    resultes = []
    for row in rows:
        row_dict = dict(zip(cols, row))

        image_url_pitcher_name = row_dict.get("pitcher_name").replace(" ", "_").lower()
        
        pitcher_data = {
            "pitcher_name": row_dict.get("pitcher_name"),
            "game_date": str(row_dict.get("game_date")),
            "qs_probability": row_dict.get("qs_probability"),
            "team": row_dict.get("team"),
            "opp_team": row_dict.get("opp_team"),
            "avg_ip_last3": row_dict.get("avg_ip_last3"),
            "avg_er_last3": row_dict.get("avg_er_last3"),
            "image_url": f"images/pitchers/{image_url_pitcher_name}_headshot.jpg"
        }
        resultes.append(pitcher_data)
    
    # 3. 回傳結果
    return resultes

class SimulationRequest(BaseModel):
    # 固定特徵 (使用者不能改，但模型需要)
    pitcher: str
    Team: str
    opp_team: str
    hand: str
    season_era: float
    season_whip: float
    
    # 可調整特徵 (使用者手動輸入的)
    rest_days: int
    opp_ops: float
    is_home: int
    avg_ip_last3: float
    avg_er_last3: float

# === 2. 新增 POST 端點 ===
@app.post("/api/predict/simulate")
async def predict_simulate(
    request: Request,
    features: SimulationRequest
):
    """
    接收前端傳來的完整特徵數據（含使用者修改過的值），
    不查資料庫，直接用模型進行即時推論。
    """
    pipe = request.app.state.pipe
    raw_pipe = request.app.state.raw_pipe
    threshold = request.app.state.threshold

    # 將 Pydantic 物件轉為 DataFrame
    data_dict = features.model_dump()
    print(data_dict)
    df = pd.DataFrame([data_dict])

    # 重要：確保欄位順序與訓練時完全一致
    try:
        # FEATURES 是您在程式碼最上方定義的全域變數
        df = df[FEATURES]
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required features: {e}")

    try:
        # 1. 執行預測 (QS 機率)
        prob = float(pipe.predict_proba(df)[0, 1])

        # 2. 計算 SHAP 解釋 (讓使用者知道調整後的影響)
        features_contrib = calculate_feature_contributions(raw_pipe, df)

        return {
            "pitcher": features.pitcher,
            "game_date": "Simulation", # 標記這是模擬
            "qs_probability": prob,
            "threshold": threshold,
            "opp_team": features.opp_team,
            "features": features_contrib
        }

    except Exception as e:
        print(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

# TODO: 實作其他端點以取代 Mock Data
# @app.get("/api/top-pitchers") ...
# @app.get("/api/pitcher/{id}/stats") ...
# @app.get("/api/pitcher/{id}/games") ...

# 如果是 Production 環境，掛載 React Build 檔案
# app.mount("/", StaticFiles(directory="dist", html=True), name="static")