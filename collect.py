"""
부동산 실거래가 수집 스크립트
공공데이터포털 API → Supabase 적재

설치:
  pip install requests supabase python-dotenv

환경변수 (.env):
  PUBLIC_DATA_API_KEY=발급받은_서비스키
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_KEY=your_anon_key
"""

import os
import time
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# ── 클라이언트 초기화 ──────────────────────────────────────────
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
API_KEY  = os.environ["PUBLIC_DATA_API_KEY"]

# ── 전국 시군구 코드 (일부 예시, 전체는 행안부 코드 파일 사용) ──
SIGUNGU_CODES = {
    "서울 강남구": "11680",
    "서울 서초구": "11650",
    "서울 송파구": "11710",
    "서울 마포구": "11440",
    "서울 용산구": "11170",
    "부산 해운대구": "26350",
    "경기 성남시 분당구": "41135",
    # ... 전국 250개 시군구 추가
}

APT_TRADE_URL = (
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade"
    "/getRTMSDataSvcAptTrade"
)


def fetch_trades(sigungu_code: str, deal_ym: str) -> list[dict]:
    """공공API에서 아파트 매매 실거래 데이터 수집"""
    trades = []
    page = 1

    while True:
        params = {
            "serviceKey": API_KEY,
            "LAWD_CD":    sigungu_code,
            "DEAL_YMD":   deal_ym,
            "pageNo":     page,
            "numOfRows":  1000,
        }
        res = requests.get(APT_TRADE_URL, params=params, timeout=15)
        root = ET.fromstring(res.content)

        result_code = root.findtext(".//resultCode")
        if result_code not in ("00", "000"):
            print(f"  API 오류: {root.findtext('.//resultMsg')}")
            break

        items = root.findall(".//item")
        if not items:
            break

        for item in items:
            price_str = (item.findtext("dealAmount") or "").replace(",", "").strip()
            area_str  = (item.findtext("excluUseAr") or "").strip()

            try:
                price = int(price_str)
                area  = float(area_str)
            except ValueError:
                continue

            year  = item.findtext("dealYear")  or ""
            month = item.findtext("dealMonth") or ""
            day   = item.findtext("dealDay")   or ""

            trade = {
                "sigungu_code": sigungu_code,
                "apt_name":     (item.findtext("aptNm") or "").strip(),
                "dong":         (item.findtext("umdNm") or "").strip(),
                "jibun":        (item.findtext("jibun") or "").strip(),
                "area":         area,
                "floor":        int(item.findtext("floor") or 0),
                "deal_date":    f"{year}-{month.zfill(2)}-{day.zfill(2)}",
                "price":        price,                     # 만원 단위
                "price_per_m2": round(price / area) if area else 0,
                "build_year":   int(item.findtext("buildYear") or 0),
                "reg_date":     item.findtext("rgstDate") or "",
            }
            trades.append(trade)

        total = int(root.findtext(".//totalCount") or 0)
        if page * 1000 >= total:
            break
        page += 1
        time.sleep(0.3)   # API 과부하 방지

    return trades


def upsert_trades(trades: list[dict]):
    if not trades:
        return

    # 중복 제거 (같은 배치 내 동일 키 제거)
    seen = set()
    unique_trades = []
    for t in trades:
        key = (t["sigungu_code"], t["apt_name"], t["area"], t["floor"], t["deal_date"])
        if key not in seen:
            seen.add(key)
            unique_trades.append(t)

    batch_size = 500
    for i in range(0, len(unique_trades), batch_size):
        batch = unique_trades[i:i + batch_size]
        supabase.table("apt_trades").upsert(
            batch,
            on_conflict="sigungu_code,apt_name,area,floor,deal_date"
        ).execute()
    print(f"  ✅ {len(unique_trades)}건 적재 완료")


def collect_month(deal_ym: str):
    """특정 월 전체 지역 수집"""
    print(f"\n{'='*50}")
    print(f"수집 대상: {deal_ym}")
    print(f"{'='*50}")

    for name, code in SIGUNGU_CODES.items():
        print(f"\n  [{name}] 수집 중...")
        trades = fetch_trades(code, deal_ym)
        print(f"  → {len(trades)}건 수집")
        upsert_trades(trades)
        time.sleep(0.5)


def collect_range(start_ym: str, end_ym: str):
    """기간 범위 수집 (예: 202001 ~ 202412)"""
    current = datetime.strptime(start_ym, "%Y%m")
    end     = datetime.strptime(end_ym,   "%Y%m")

    while current <= end:
        collect_month(current.strftime("%Y%m"))
        # 다음 달로
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 2:
        # 단일 월: python collect.py 202412
        collect_month(sys.argv[1])
    elif len(sys.argv) == 3:
        # 기간: python collect.py 202001 202412
        collect_range(sys.argv[1], sys.argv[2])
    else:
        # 기본: 전월 수집 (Cron 자동화용)
        last_month = datetime.now().replace(day=1) - timedelta(days=1)
        collect_month(last_month.strftime("%Y%m"))
