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

FEATURES = [
    "rest_days", "opp_ops", "is_home", "avg_ip_last3", "avg_er_last3",
    "season_era", "season_whip", "hand", "opp_team", "Team", "pitcher"
]

NUMERIC_COLS = ["rest_days", "opp_ops", "is_home", "avg_ip_last3", "avg_er_last3", "season_era", "season_whip"]
CATEG_COLS = ["hand", "opp_team", "Team", "pitcher"]

MODEL_PATH = "./artifacts_qs_xgb/qs_xgb_classifier_calibrated.joblib"
RAW_PIPE_PATH = "./artifacts_qs_xgb/qs_xgb_pipeline_raw.joblib"
THRESH_PATH = "./artifacts_qs_xgb/qs_best_threshold.json"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading models...")
    try:
        app.state.pipe = joblib.load(MODEL_PATH)
        app.state.raw_pipe = joblib.load(RAW_PIPE_PATH)
        print("Models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}")
        raise e

    app.state.threshold = 0.5
    if os.path.exists(THRESH_PATH):
        import json
        try:
            with open(THRESH_PATH, "r") as f:
                data = json.load(f)
                app.state.threshold = data.get("best_threshold", 0.5)
        except:
            pass

    try:
        app.state.db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))
        print("Database connected.")    
    except Exception as e:
        print(f"Warning: Database connection failed: {e}")
        app.state.db = None

    yield
    
    if app.state.db:
        app.state.db.close()

app = FastAPI(lifespan=lifespan)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
images_dir = os.path.join(BASE_DIR, "public", "images")
if not os.path.exists(images_dir):
    print(f"Warning: Images directory not found at {images_dir}")
else:
    print(f"Images directory found at {images_dir}")

app.mount("/images", StaticFiles(directory=images_dir), name="images")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def calculate_feature_contributions(raw_pipe, row_df):
    try:
        prep = raw_pipe.named_steps["prep"]
        xgb_model = raw_pipe.named_steps["model"]

        X_enc = prep.transform(row_df)
        
        explainer = shap.TreeExplainer(xgb_model)
        shap_values = explainer.shap_values(X_enc)

        if isinstance(shap_values, list):
            vals = shap_values[1][0]
        else:
            vals = shap_values[0]

        encoded_names = prep.get_feature_names_out()
        
        contrib_dict = {f: 0.0 for f in FEATURES}
        
        for name, v in zip(encoded_names, vals):
            if "__" in name:
                _, rest = name.split("__", 1)
            else:
                rest = name
            
            if rest in NUMERIC_COLS:
                contrib_dict[rest] += float(v)
                continue
            
            for cat in CATEG_COLS:
                prefix = cat + "_"
                if rest.startswith(prefix):
                    contrib_dict[cat] += float(v)
                    break
        
        contributions = []
        row_dict = row_df.iloc[0].to_dict()
        
        for feature_name in FEATURES:
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

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/prediction/{pitcher_name}")
async def get_prediction(
    request: Request, 
    pitcher_name: str, 
    date: str = Query(None)
):
    db = request.app.state.db
    db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))
    pipe = request.app.state.pipe
    raw_pipe = request.app.state.raw_pipe
    threshold = request.app.state.threshold

    if not db:
        raise HTTPException(status_code=503, detail="Database not available")

    target_date = date if date else datetime.now().strftime("%Y-%m-%d")
    
    date_clause = "AND game_date = %s" if date else "ORDER BY game_date DESC LIMIT 1"
    params = (pitcher_name, date) if date else (pitcher_name,)

    sql = f"""
        SELECT rest_days, opp_ops, is_home, avg_ip_last3, avg_er_last3,
               season_era, season_whip, hand, opp_team, team AS "Team", pitcher, game_date
        FROM pitcher_features
        WHERE pitcher ILIKE %s {date_clause}
    """
    
    with db.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        cols = [desc[0] for desc in cur.description]

    if not row:
        raise HTTPException(status_code=404, detail=f"No data found for pitcher {pitcher_name}")
    row_dict = dict(zip(cols, row))
    
    input_data = {f: row_dict.get(f, 0) for f in FEATURES}
    df = pd.DataFrame([input_data])

    try:
        prob = float(pipe.predict_proba(df)[0, 1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    features_contrib = calculate_feature_contributions(raw_pipe, df)
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
    date: str = Query(None)
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
    sort_by: str = Query("qs_probability")
):
    db = request.app.state.db
    db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))

    order_clause = "qs_probability DESC"
    if sort_by == "avg_ip_last3":
        order_clause = "avg_ip_last3 DESC"
    elif sort_by == "avg_er_last3":
        order_clause = "avg_er_last3 ASC"
    elif sort_by == "season_era":
        order_clause = "season_era ASC"
    elif sort_by == "season_whip":
        order_clause = "season_whip ASC"

    sql = f"""
        SELECT pitcher_name, game_date, team, opp_team, avg_ip_last3, avg_er_last3,
                qs_probability, season_era, season_whip
        FROM daily_predictions
        ORDER BY {order_clause}
        LIMIT 5
    """
    
    with db.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        if cur.description:
            cols = [desc[0] for desc in cur.description]
        else:
            cols = []

    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    resultes = []
    for row in rows:
        row_dict = dict(zip(cols, row))

        image_url_pitcher_name = row_dict.get("pitcher_name").replace(" ", "_")
        
        base_url = os.environ.get("RENDER_EXTERNAL_URL", "https://qs-pitcher-dashboard-api.onrender.com")
        
        pitcher_data = {
            "pitcher_name": row_dict.get("pitcher_name"),
            "game_date": str(row_dict.get("game_date")),
            "qs_probability": row_dict.get("qs_probability"),
            "team": row_dict.get("team"),
            "opp_team": row_dict.get("opp_team"),
            "avg_ip_last3": row_dict.get("avg_ip_last3"),
            "avg_er_last3": row_dict.get("avg_er_last3"),
            "image_url": f"{base_url}/images/pitchers/{image_url_pitcher_name}_headshot.jpg"
        }
        resultes.append(pitcher_data)
    
    return resultes

@app.get("/api/get_all_predictions")
async def get_all_predictions(
    request: Request,
):
    db = request.app.state.db
    db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))

    sql = f"""
        SELECT pitcher_name, game_date, team, opp_team, avg_ip_last3, avg_er_last3,
                qs_probability
        FROM daily_predictions
    """
    
    with db.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        if cur.description:
            cols = [desc[0] for desc in cur.description]
        else:
            cols = []

    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    resultes = []
    for row in rows:
        row_dict = dict(zip(cols, row))

        image_url_pitcher_name = row_dict.get("pitcher_name").replace(" ", "_")
        
        base_url = os.environ.get("RENDER_EXTERNAL_URL", "https://qs-pitcher-dashboard-api.onrender.com")
        
        pitcher_data = {
            "pitcher_name": row_dict.get("pitcher_name"),
            "game_date": str(row_dict.get("game_date")),
            "qs_probability": row_dict.get("qs_probability"),
            "team": row_dict.get("team"),
            "opp_team": row_dict.get("opp_team"),
            "avg_ip_last3": row_dict.get("avg_ip_last3"),
            "avg_er_last3": row_dict.get("avg_er_last3"),
            "image_url": f"{base_url}/images/pitchers/{image_url_pitcher_name}_headshot.jpg"
        }
        resultes.append(pitcher_data)
    
    return resultes

class SimulationRequest(BaseModel):
    pitcher: str
    Team: str
    opp_team: str
    hand: str
    season_era: float
    season_whip: float
    
    rest_days: int
    opp_ops: float
    is_home: int
    avg_ip_last3: float
    avg_er_last3: float

@app.post("/api/predict/simulate")
async def predict_simulate(
    request: Request,
    features: SimulationRequest
):
    pipe = request.app.state.pipe
    raw_pipe = request.app.state.raw_pipe
    threshold = request.app.state.threshold

    data_dict = features.model_dump()
    print(data_dict)
    df = pd.DataFrame([data_dict])

    try:
        df = df[FEATURES]
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required features: {e}")

    try:
        prob = float(pipe.predict_proba(df)[0, 1])

        features_contrib = calculate_feature_contributions(raw_pipe, df)

        return {
            "pitcher": features.pitcher,
            "game_date": "Simulation",
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