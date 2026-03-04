import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

const MOCK_APT = {
  name: "래미안 대치팰리스",
  address: "서울특별시 강남구 대치동 1007",
  sigungu: "강남구",
  built_year: 2002,
  total_units: 1278,
  floors: 35,
};

const MOCK_TRADES = [
  { date: "2024-01", price: 280000, area: 84, floor: 12 },
  { date: "2024-02", price: 285000, area: 84, floor: 8 },
  { date: "2024-03", price: 275000, area: 59, floor: 15 },
  { date: "2024-04", price: 295000, area: 84, floor: 20 },
  { date: "2024-05", price: 302000, area: 84, floor: 5 },
  { date: "2024-06", price: 310000, area: 114, floor: 25 },
  { date: "2024-07", price: 298000, area: 84, floor: 10 },
  { date: "2024-08", price: 315000, area: 84, floor: 18 },
  { date: "2024-09", price: 308000, area: 59, floor: 7 },
  { date: "2024-10", price: 322000, area: 84, floor: 22 },
  { date: "2024-11", price: 318000, area: 84, floor: 14 },
  { date: "2024-12", price: 330000, area: 114, floor: 30 },
];

const AREA_FILTERS = ["전체", "59㎡", "84㎡", "114㎡"];

const formatPrice = (val) => {
  if (val >= 10000) return `${(val / 10000).toFixed(1)}억`;
  return `${val.toLocaleString()}만`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#0d1117",
        border: "1px solid #30363d",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        color: "#e6edf3"
      }}>
        <div style={{ color: "#8b949e", marginBottom: 4 }}>{label}</div>
        <div style={{ color: "#58a6ff", fontWeight: 700, fontSize: 15 }}>
          {formatPrice(payload[0].value)}
        </div>
      </div>
    );
  }
  return null;
};

export default function AptDetail() {
  const [selectedArea, setSelectedArea] = useState("전체");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const filtered = selectedArea === "전체"
    ? MOCK_TRADES
    : MOCK_TRADES.filter(t => `${t.area}㎡` === selectedArea);

  const latest = filtered[filtered.length - 1];
  const prev = filtered[filtered.length - 2];
  const diff = latest && prev ? latest.price - prev.price : 0;
  const avg = Math.round(filtered.reduce((s, t) => s + t.price, 0) / filtered.length);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1117",
      color: "#e6edf3",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      padding: "0 0 80px",
    }}>
      {/* 헤더 */}
      <header style={{
        borderBottom: "1px solid #21262d",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        background: "rgba(13,17,23,0.95)",
        backdropFilter: "blur(12px)",
        zIndex: 100,
      }}>
        <div style={{
          width: 28, height: 28,
          background: "linear-gradient(135deg, #1f6feb, #388bfd)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "#fff"
        }}>실</div>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>실거래맵</span>
        <div style={{ flex: 1 }} />
        <div style={{
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: 13,
          color: "#8b949e",
          display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer"
        }}>
          <span>🔍</span>
          <span>아파트 검색</span>
        </div>
      </header>

      <div style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "0 20px",
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)"
      }}>

        {/* 브레드크럼 */}
        <div style={{ padding: "20px 0 0", fontSize: 12, color: "#8b949e", display: "flex", gap: 6 }}>
          <span style={{ cursor: "pointer", color: "#58a6ff" }}>서울</span>
          <span>›</span>
          <span style={{ cursor: "pointer", color: "#58a6ff" }}>강남구</span>
          <span>›</span>
          <span>래미안 대치팰리스</span>
        </div>

        {/* 아파트 기본정보 */}
        <div style={{ paddingTop: 16, paddingBottom: 24, borderBottom: "1px solid #21262d" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
                {MOCK_APT.name}
              </h1>
              <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: 13 }}>{MOCK_APT.address}</p>
            </div>
            <div style={{
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 12,
              padding: "12px 18px",
              textAlign: "right",
              minWidth: 140
            }}>
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>최근 거래가 (84㎡)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#58a6ff" }}>
                {formatPrice(latest?.price || 0)}
              </div>
              <div style={{
                fontSize: 12,
                color: diff >= 0 ? "#3fb950" : "#f85149",
                marginTop: 2
              }}>
                {diff >= 0 ? "▲" : "▼"} {formatPrice(Math.abs(diff))} 전월比
              </div>
            </div>
          </div>

          {/* 태그 */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {[
              `${MOCK_APT.built_year}년 준공`,
              `${MOCK_APT.total_units}세대`,
              `최고 ${MOCK_APT.floors}층`,
              "재건축 관심단지"
            ].map(tag => (
              <span key={tag} style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 12,
                color: "#8b949e"
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* 요약 카드 3개 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "24px 0" }}>
          {[
            { label: "평균 거래가", value: formatPrice(avg), sub: "최근 12개월" },
            { label: "거래 건수", value: `${filtered.length}건`, sub: "최근 12개월" },
            { label: "최고가", value: formatPrice(Math.max(...filtered.map(t => t.price))), sub: "2024-12" },
          ].map(card => (
            <div key={card.label} style={{
              background: "#161b22",
              border: "1px solid #21262d",
              borderRadius: 12,
              padding: "16px",
              transition: "border-color 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#388bfd"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}
            >
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* 면적 필터 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {AREA_FILTERS.map(a => (
            <button key={a} onClick={() => setSelectedArea(a)} style={{
              background: selectedArea === a ? "#1f6feb" : "#161b22",
              border: `1px solid ${selectedArea === a ? "#388bfd" : "#30363d"}`,
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 13,
              color: selectedArea === a ? "#fff" : "#8b949e",
              cursor: "pointer",
              transition: "all 0.15s",
              fontWeight: selectedArea === a ? 600 : 400,
            }}>
              {a}
            </button>
          ))}
        </div>

        {/* 차트 */}
        <div style={{
          background: "#161b22",
          border: "1px solid #21262d",
          borderRadius: 16,
          padding: "24px 16px 12px",
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", marginBottom: 16, paddingLeft: 8 }}>
            거래가 추이
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filtered} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8b949e" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => formatPrice(v)}
                tick={{ fontSize: 11, fill: "#8b949e" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={avg} stroke="#388bfd" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#58a6ff"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#58a6ff", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#388bfd" }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "right", fontSize: 11, color: "#8b949e", marginTop: 8, paddingRight: 8 }}>
            ━ ━ 평균 {formatPrice(avg)}
          </div>
        </div>

        {/* 거래 이력 테이블 */}
        <div style={{
          background: "#161b22",
          border: "1px solid #21262d",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          <div style={{ padding: "20px 20px 12px", fontSize: 13, fontWeight: 600 }}>
            실거래 이력
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderTop: "1px solid #21262d", borderBottom: "1px solid #21262d" }}>
                {["거래월", "면적", "층", "거래가"].map(h => (
                  <th key={h} style={{
                    padding: "10px 20px",
                    textAlign: h === "거래가" ? "right" : "left",
                    color: "#8b949e",
                    fontWeight: 500,
                    fontSize: 12
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map((t, i) => (
                <tr key={i}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderBottom: "1px solid #21262d",
                    background: hoveredRow === i ? "#1c2128" : "transparent",
                    transition: "background 0.1s",
                    cursor: "default"
                  }}>
                  <td style={{ padding: "12px 20px", color: "#8b949e" }}>{t.date}</td>
                  <td style={{ padding: "12px 20px" }}>{t.area}㎡</td>
                  <td style={{ padding: "12px 20px", color: "#8b949e" }}>{t.floor}층</td>
                  <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 700, color: "#58a6ff" }}>
                    {formatPrice(t.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 광고 영역 */}
        <div style={{
          marginTop: 24,
          background: "#161b22",
          border: "1px dashed #30363d",
          borderRadius: 12,
          padding: "20px",
          textAlign: "center",
          color: "#8b949e",
          fontSize: 12
        }}>
          📢 Google AdSense 광고 영역 (728×90 or 반응형)
        </div>

        {/* SEO용 텍스트 요약 */}
        <div style={{
          marginTop: 24,
          padding: "20px",
          background: "#161b22",
          border: "1px solid #21262d",
          borderRadius: 16,
          fontSize: 13,
          lineHeight: 1.8,
          color: "#8b949e"
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e6edf3", marginTop: 0, marginBottom: 12 }}>
            래미안 대치팰리스 실거래가 분석
          </h2>
          <p style={{ margin: 0 }}>
            래미안 대치팰리스는 서울특별시 강남구 대치동에 위치한 {MOCK_APT.built_year}년 준공 아파트로,
            총 {MOCK_APT.total_units}세대 규모입니다. 최근 84㎡ 기준 거래가는{" "}
            <strong style={{ color: "#58a6ff" }}>{formatPrice(latest?.price || 0)}</strong>이며,
            지난 12개월 평균 거래가는 <strong style={{ color: "#e6edf3" }}>{formatPrice(avg)}</strong>입니다.
            국토교통부 실거래가 공개시스템 기준 데이터를 매일 업데이트합니다.
          </p>
        </div>

      </div>
    </div>
  );
}
