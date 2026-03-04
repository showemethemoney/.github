# 부동산 실거래 분석 사이트 - Next.js 프로젝트 가이드

## 프로젝트 구조

```
realmap/
├── app/
│   ├── layout.js                  # 루트 레이아웃 (AdSense 스크립트 삽입)
│   ├── page.js                    # 메인 (지역 검색)
│   ├── 지역/
│   │   └── [sigungu]/
│   │       └── page.js            # 구별 통계 페이지
│   └── 아파트/
│       └── [aptId]/
│           └── page.js            # 아파트 상세 ← SEO 핵심
├── components/
│   ├── TradeChart.jsx
│   ├── TradeTable.jsx
│   └── AdBanner.jsx
├── lib/
│   ├── supabase.js                # Supabase 클라이언트
│   └── queries.js                 # DB 쿼리 함수
├── scripts/
│   └── collect.py                 # 데이터 수집 (별도 실행)
├── next.config.js
└── .env.local
```

---

## 1. 초기 세팅

```bash
npx create-next-app@latest realmap --js --tailwind --app
cd realmap
npm install @supabase/supabase-js recharts
```

---

## 2. Supabase 테이블 생성 SQL

```sql
-- Supabase Dashboard > SQL Editor에서 실행

CREATE TABLE apt_trades (
  id              bigserial PRIMARY KEY,
  sigungu_code    varchar(10)  NOT NULL,
  apt_name        varchar(100) NOT NULL,
  dong            varchar(50),
  jibun           varchar(50),
  area            numeric(6,2) NOT NULL,
  floor           smallint,
  deal_date       date         NOT NULL,
  price           integer      NOT NULL,  -- 만원 단위
  price_per_m2    integer,
  build_year      smallint,
  created_at      timestamptz  DEFAULT now(),

  UNIQUE (sigungu_code, apt_name, area, floor, deal_date)
);

-- 인덱스 (검색 성능 핵심)
CREATE INDEX idx_apt_name    ON apt_trades (apt_name);
CREATE INDEX idx_sigungu     ON apt_trades (sigungu_code);
CREATE INDEX idx_deal_date   ON apt_trades (deal_date DESC);
CREATE INDEX idx_area        ON apt_trades (area);

-- 아파트별 집계 뷰 (상세 페이지 빠르게)
CREATE MATERIALIZED VIEW apt_summary AS
SELECT
  apt_name,
  sigungu_code,
  area,
  COUNT(*)                          AS trade_count,
  AVG(price)::int                   AS avg_price,
  MAX(price)                        AS max_price,
  MIN(price)                        AS min_price,
  MAX(deal_date)                    AS last_trade_date
FROM apt_trades
GROUP BY apt_name, sigungu_code, area;

-- 매일 새벽 뷰 갱신 (Supabase Cron or pg_cron)
SELECT cron.schedule('0 4 * * *', 'REFRESH MATERIALIZED VIEW apt_summary');
```

---

## 3. lib/supabase.js

```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

---

## 4. lib/queries.js

```js
import { supabase } from "./supabase";

// 아파트 거래 이력 조회
export async function getAptTrades(aptName, area = null) {
  let q = supabase
    .from("apt_trades")
    .select("deal_date, price, price_per_m2, floor, area")
    .eq("apt_name", aptName)
    .order("deal_date", { ascending: true })
    .limit(200);

  if (area) q = q.eq("area", area);
  const { data } = await q;
  return data ?? [];
}

// 지역별 월별 평균가
export async function getRegionMonthlyAvg(sigunguCode, area) {
  const { data } = await supabase.rpc("region_monthly_avg", {
    p_sigungu: sigunguCode,
    p_area: area,
  });
  return data ?? [];
}

// 아파트 검색 (자동완성용)
export async function searchApts(keyword) {
  const { data } = await supabase
    .from("apt_trades")
    .select("apt_name, sigungu_code, dong")
    .ilike("apt_name", `%${keyword}%`)
    .limit(10);
  return [...new Map(data?.map(d => [d.apt_name, d])).values()];
}
```

---

## 5. app/아파트/[aptId]/page.js (SEO 핵심)

```js
import { getAptTrades } from "@/lib/queries";

// ✅ SSG: 빌드 시 정적 생성 → SEO 최강
export async function generateStaticParams() {
  // 전국 아파트 목록 가져와서 정적 페이지 생성
  const { data } = await supabase
    .from("apt_summary")
    .select("apt_name")
    .limit(30000);

  return data.map(d => ({
    aptId: encodeURIComponent(d.apt_name)
  }));
}

// ✅ 메타태그 자동 생성 → 구글 상위 노출 핵심
export async function generateMetadata({ params }) {
  const aptName = decodeURIComponent(params.aptId);
  return {
    title: `${aptName} 실거래가 조회 | 실거래맵`,
    description: `${aptName} 최신 실거래가, 시세 추이, 평형별 거래 이력을 확인하세요. 국토교통부 공식 데이터 기준.`,
    openGraph: {
      title: `${aptName} 실거래가`,
      description: `${aptName} 매매 실거래가 분석`,
    },
  };
}

export default async function AptPage({ params }) {
  const aptName = decodeURIComponent(params.aptId);
  const trades  = await getAptTrades(aptName);

  return <AptDetail aptName={aptName} trades={trades} />;
}
```

---

## 6. app/layout.js (AdSense 삽입)

```js
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* AdSense 승인 후 아래 코드 활성화 */}
        {/* <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
          crossOrigin="anonymous"
        /> */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 7. next.config.js (SEO 최적화)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ISR: 매일 자동 재생성
  revalidate: 86400,

  async headers() {
    return [{
      source: "/(.*)",
      headers: [{
        key: "X-Robots-Tag",
        value: "index, follow"
      }]
    }];
  },

  // sitemap은 next-sitemap 패키지 사용
  // npm install next-sitemap
};

module.exports = nextConfig;
```

---

## 8. sitemap 자동 생성 (next-sitemap.config.js)

```js
module.exports = {
  siteUrl: "https://실거래맵.kr",
  generateRobotsTxt: true,
  additionalPaths: async (config) => {
    // DB에서 전체 아파트 목록 가져와서 sitemap에 추가
    const apts = await getAllAptNames(); // lib/queries.js
    return apts.map(name => ({
      loc: `/아파트/${encodeURIComponent(name)}`,
      changefreq: "weekly",
      priority: 0.8,
    }));
  },
};
```

---

## 9. 배포 및 자동화

```bash
# Vercel 배포 (무료)
npm install -g vercel
vercel --prod

# 환경변수 설정 (Vercel Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
```

### 데이터 수집 자동화 (GitHub Actions - 무료)

```yaml
# .github/workflows/collect.yml
name: 월별 데이터 수집
on:
  schedule:
    - cron: "0 3 1 * *"   # 매월 1일 새벽 3시
  workflow_dispatch:        # 수동 실행 가능

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - run: pip install requests supabase python-dotenv
      - run: python scripts/collect.py
        env:
          PUBLIC_DATA_API_KEY: ${{ secrets.PUBLIC_DATA_API_KEY }}
          SUPABASE_URL:        ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY:        ${{ secrets.SUPABASE_KEY }}
```

---

## 10. 비용 요약 (초기 무료 운영)

| 항목 | 서비스 | 비용 |
|------|--------|------|
| 프론트 호스팅 | Vercel Free | 무료 |
| DB | Supabase Free (500MB) | 무료 |
| 데이터 수집 자동화 | GitHub Actions | 무료 |
| 도메인 | .kr 도메인 | 연 1~2만원 |
| **합계** | | **연 1~2만원** |

> 트래픽 증가 시 Supabase Pro ($25/월)로 업그레이드

---

## 다음 단계 체크리스트

- [ ] 공공데이터포털 API 키 발급
- [ ] Supabase 프로젝트 생성 + 테이블 SQL 실행
- [ ] `collect.py` 로컬 실행으로 데이터 적재 테스트
- [ ] Next.js 프로젝트 생성 + Vercel 연동
- [ ] 아파트 상세 페이지 개발
- [ ] sitemap.xml 생성 + Google Search Console 등록
- [ ] AdSense 신청 (페이지 10개 이상, 콘텐츠 충분할 때)
