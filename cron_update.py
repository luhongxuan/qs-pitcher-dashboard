import joblib
import psycopg
import pandas as pd
import os
from dotenv import load_dotenv
import pandas as pd
import joblib
import psycopg
import os
import numpy as np
from pathlib import Path
from datetime import datetime
import statsapi

TEAM_ABBREVIATION_MAP = {
    'BAL':'BAL','BOS':'BOS','NY':'NYY','TB':'TBR','TOR':'TOR',
    'CH':'CHW','CLE':'CLE','DET':'DET','KC':'KCR','MIN':'MIN',
    'HO':'HOU','LA':'LAA','OA':'OAK','SEA':'SEA','TX':'TEX',
    'ATL':'ATL','MI':'MIA','NYM':'NYM','PHI':'PHI','WAS':'WSN',
    'CHC':'CHC','CIN':'CIN','MIL':'MIL','PIT':'PIT','STL':'STL',
    'ARI':'ARI','AZ':'ARI','COL':'COL','LAD':'LAD','SD':'SDP','SF':'SFG',
    'CHW':'CHW','LAA':'LAA','NYY':'NYY','NYM':'NYM','TBR':'TBR',
    'WSN':'WSN','WSH':'WSN','MIA':'MIA','KCR':'KCR','CWS':'CHW','TBD':'TBR'
}

def get_pitcher_current_team(pitcher_name: str) -> str | None:
    """
    回傳投手目前所屬球隊名稱（MLB），找不到就回傳 None
    """
    players = statsapi.lookup_player(pitcher_name)

    if not players:
        return "UNK"

    # 如果有同名球員，這裡先簡單取第一個，有需要可以再用出生年、位置過濾
    player = players[0]

    # lookup_player 回傳的資料中有 currentTeam -> {id: ...}
    current_team = player.get("currentTeam")
    if not current_team:
        return None

    team_id = current_team["id"]

    # 用 team_id 再查球隊資訊
    team_info_list = statsapi.lookup_team(team_id)
    if not team_info_list:
        return None

    team_info = team_info_list[0]
    team_name = TEAM_ABBREVIATION_MAP.get(team_info["teamCode"].upper(), team_info["teamCode"].upper())

    return team_name

load_dotenv()

input_xlsx = Path("All_Pitchers_2025_Consolidated_qs_pred.xlsx")

conn = os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats")

if not input_xlsx.exists():
    raise FileNotFoundError(f"Input file {input_xlsx} does not exist.")

df = pd.read_excel(input_xlsx)

if "game_date" in df.columns:
    df["game_date"] = pd.to_datetime(df["game_date"]).dt.date

df_sorted = df.sort_values(by=["pitcher", "game_date"], ascending=[True, False]) 
latest_df = df_sorted.drop_duplicates(subset=["pitcher"], keep="first").copy()

db_url = os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats")

try:
    conn = psycopg.connect(db_url)
    count = 0

    with conn.cursor() as cur:
        for _, row in latest_df.iterrows():
            pitcher = row["pitcher"]
            team = get_pitcher_current_team(pitcher)
            game_date = row["game_date"] if pd.notnull(row["game_date"]) else None
            opp_team = row["opp_team"] if "opp_team" in row and pd.notnull(row["opp_team"]) else "UNK"

            # 1. 讀取 Excel 中【已經算好】的預測值
            # (請確保 Excel 欄位名稱與這裡一致)
            prob = float(row.get("qs_prob_pred", 0))

            # 2. 讀取近況數據
            avg_ip = float(row.get("avg_ip_last3", 0))
            avg_er = float(row.get("avg_er_last3", 0))

            # --- 執行 SQL Upsert ---
            sql = """
            INSERT INTO daily_predictions
            (pitcher_name, game_date, qs_prebability, avg_ip_last3, avg_er_last3, 
                team, opp_team)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (pitcher_name) 
            DO UPDATE SET 
                pitcher_name = EXCLUDED.pitcher_name,
                game_date = EXCLUDED.game_date,
                qs_prebability = EXCLUDED.qs_prebability,
                avg_ip_last3 = EXCLUDED.avg_ip_last3,
                avg_er_last3 = EXCLUDED.avg_er_last3,
                team = EXCLUDED.team,
                opp_team = EXCLUDED.opp_team
            """
            
            cur.execute(sql, (pitcher, game_date, prob, avg_ip, avg_er, team, opp_team))
            count += 1
            print(count)
    
    conn.commit()
    conn.close()
except Exception as e:
    raise RuntimeError(f"資料庫操作失敗: {e}")