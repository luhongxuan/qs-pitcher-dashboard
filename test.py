import psycopg
import os
from dotenv import load_dotenv
from datetime import date, datetime

load_dotenv()

pitcher_name = "Yoshinobu Yamamoto"

db = psycopg.connect(os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/mlb_stats"))


sql = f"""
    SELECT pitcher, game_date, opp_team, game_result, ip, er, r, bb, so
    FROM stg_pitcher_raw_2025
    WHERE pitcher ILIKE %s 
    ORDER BY game_date DESC LIMIT 5
"""

with db.cursor() as cur:
    cur.execute(sql, (pitcher_name,))
    row = cur.fetchall()
    cols = [desc[0] for desc in cur.description]
total_rows = []
for i, r in enumerate(row):
    dict_row = dict(zip(cols, r))
    dict_row["id"] = f"g{i + 1}"
    print(dict_row.get("ip"))
    total_rows.append(dict_row)
    print(datetime.strptime(str(dict_row.get("game_date")), "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%d"))


# print({
#     "pitcher": row_dict.get("pitcher"),
#     "game_date": str(row_dict.get("game_date")),
#     "season_era": row_dict.get("season_era"),
#     "season_whip": row_dict.get("season_whip"),
#     "opp_ops": row_dict.get("opp_ops"),
#     "rest_days": row_dict.get("rest_days"),
#     "avg_ip_last3": row_dict.get("avg_ip_last3"),
#     "avg_er_last3": row_dict.get("avg_er_last3"),
# })