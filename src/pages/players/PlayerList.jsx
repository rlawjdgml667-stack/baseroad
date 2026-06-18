import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import PlayerCard from "../../components/player/PlayerCard";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search, Trophy } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";

const REGIONS = ["전체","서울","경기","인천","대전","세종","충남","충북","광주","전남","전북","대구","경북","부산","경남","울산","강원","제주"];
const POSITIONS = ["전체","투수","포수","내야수","외야수"];
const GRADES = [
  { label:"전체", value:"전체" },
  { label:"리틀", value:"little" },
  { label:"초등", value:"elementary" },
  { label:"중학", value:"middle" },
  { label:"고등", value:"high" },
  { label:"대학", value:"college" },
];
const LEVEL_LABEL = { little:"리틀", elementary:"초등", middle:"중학", high:"고등", college:"대학" };

const RANKING_CONFIGS = {
  "투수": [
    { key:"era", label:"방어율", asc:true },
    { key:"wins", label:"승", asc:false },
    { key:"k_count", label:"탈삼진", asc:false },
    { key:"whip", label:"WHIP", asc:true },
  ],
  "타자": [
    { key:"avg", label:"타율", asc:false },
    { key:"hr", label:"홈런", asc:false },
    { key:"rbi", label:"타점", asc:false },
    { key:"ops", label:"OPS", asc:false },
  ],
};

const CUR_YEAR = new Date().getFullYear();

function getSeasonPhase() {
  const now = new Date();
  const mid = new Date(now.getFullYear() + "-06-01");
  const late = new Date(now.getFullYear() + "-08-01");
  if (now < mid) return "early";
  if (now < late) return "mid";
  return "late";
}

function getMinRequirements() {
  const phase = getSeasonPhase();
  if (phase === "early") return { innings: 0, atBats: 0 };
  if (phase === "mid")   return { innings: 15, atBats: 30 };
  return { innings: 25, atBats: 40 };
}

const PHASE_BANNER = {
  early: "📊 시즌 초반 기록입니다. 경기 수가 적어 기록이 유동적일 수 있습니다.",
  mid:   "📊 30타석 / 15이닝 이상 선수만 표시됩니다. (시즌 중반 기준 적용 중)",
  late:  "📊 40타석 / 25이닝 이상 선수만 표시됩니다. (시즌 후반 기준 적용 중)",
};

export default function PlayerList() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("전체");
  const [position, setPosition] = useState("전체");
  const [grade, setGrade] = useState("전체");
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "ranking" ? "ranking" : "list");
  const [rankPos, setRankPos] = useState("투수");
  const [rankStat, setRankStat] = useState("era");
  const [rankGrade, setRankGrade] = useState("전체");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [rankSeason, setRankSeason] = useState(new Date().getFullYear());
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [allStatsData, setAllStatsData] = useState([]);

  useEffect(() => {
    async function load() {
      // 선수 + 학교 + 최신 시즌 기록 함께 조회
      const { data: playersData } = await supabase
        .from("players")
        .select("*, schools(name, region, level)")
        .eq("status", "active")
        .eq("is_public", true);

      if (!playersData || playersData.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      // 각 선수의 전체 시즌 기록 조회
      const playerIds = playersData.map(p => p.id);
      const { data: statsData } = await supabase
        .from("player_season_stats")
        .select("player_id, season, computed_stats, raw_stats, stats_verified")
        .in("player_id", playerIds)
        .order("season", { ascending: false });

      setAllStatsData(statsData || []);

      // 사용 가능한 시즌 목록
      const seasons = [...new Set((statsData || []).map(s => s.season))].sort((a,b) => b - a);
      setAvailableSeasons(seasons);
      if (seasons.length > 0) setRankSeason(seasons[0]);

      // 각 선수별 최신 기록 매핑 (인증된 것 우선)
      const statsMap = {};
      (statsData || []).forEach(s => {
        if (!statsMap[s.player_id]) {
          statsMap[s.player_id] = s;
        } else if (s.stats_verified && !statsMap[s.player_id].stats_verified) {
          statsMap[s.player_id] = s;
        }
      });

      const merged = playersData.map(p => ({
        ...p,
        latestStats: statsMap[p.id] || null,
      }));

      setPlayers(merged);
      setLoading(false);
    }
    load();
  }, []);

  // 목록 필터
  const filtered = players.filter(p => {
    const sr = p.schools?.region || "";
    const sl = p.schools?.level || "";
    if (region !== "전체" && !sr.includes(region)) return false;
    if (position !== "전체" && p.position !== position) return false;
    if (grade !== "전체" && sl !== grade) return false;
    if (search && !p.name.includes(search) && !(p.schools?.name||"").includes(search)) return false;
    return true;
  });

  // 랭킹 필터
  const rankConfig = rankPos === "투수" ? RANKING_CONFIGS["투수"] : RANKING_CONFIGS["타자"];
  const currentRankStat = rankConfig.find(r => r.key === rankStat) || rankConfig[0];

  // 선택 시즌 기록 맵
  const seasonStatsMap = {};
  allStatsData.filter(s => s.season === rankSeason).forEach(s => {
    if (!seasonStatsMap[s.player_id]) seasonStatsMap[s.player_id] = s;
    else if (s.stats_verified && !seasonStatsMap[s.player_id].stats_verified) seasonStatsMap[s.player_id] = s;
  });

  const getStat = (p, key) => seasonStatsMap[p.id]?.computed_stats?.[key];
  const getSeasonStats = (p) => seasonStatsMap[p.id];

  const { innings: minInnings, atBats: minAtBats } = getMinRequirements();
  const seasonPhase = getSeasonPhase();

  const meetsMinimum = (p) => {
    if (minInnings === 0 && minAtBats === 0) return true;
    const raw = getSeasonStats(p)?.raw_stats;
    if (rankPos === "투수") {
      if (!raw?.ip) return false;
      const parts = String(raw.ip).split(".");
      const ip = (parseInt(parts[0])||0) + (parseInt(parts[1]||0))/3;
      return ip >= minInnings;
    } else {
      return Number(raw?.ab || 0) >= minAtBats;
    }
  };

  const rankPlayers = players.filter(p => {
    const isRightPos = rankPos === "투수" ? p.position === "투수" : ["포수","내야수","외야수"].includes(p.position);
    if (!isRightPos) return false;
    if (rankGrade !== "전체" && p.schools?.level !== rankGrade) return false;
    return true;
  });

  const ranked = [...rankPlayers]
    .filter(p => getStat(p, currentRankStat.key) != null && meetsMinimum(p) && (!verifiedOnly || getSeasonStats(p)?.stats_verified))
    .sort((a, b) => currentRankStat.asc
      ? (Number(getStat(a, currentRankStat.key))||999) - (Number(getStat(b, currentRankStat.key))||999)
      : (Number(getStat(b, currentRankStat.key))||0) - (Number(getStat(a, currentRankStat.key))||0))
    .slice(0, 20);

  const medalColor = ["text-yellow-500","text-gray-400","text-orange-400"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">선수 목록</h1>
        <Link to="/players/compare" className="text-xs text-navy font-bold border border-navy rounded-full px-3 py-1.5 hover:bg-navy hover:text-white transition">
          선수 비교 ⚖️
        </Link>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {[["list","목록"],["ranking","랭킹 🏆"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-4 py-2 rounded-full text-sm font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
            {l}
          </button>
        ))}
      </div>

      {/* ===== 목록 탭 ===== */}
      {tab === "list" && (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="선수명 또는 학교명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-2">
            {/* 지역 필터 */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (region===r ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                  {r}
                </button>
              ))}
            </div>
            {/* 포지션 필터 */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {POSITIONS.map(p => (
                <button key={p} onClick={() => setPosition(p)}
                  className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (position===p ? "bg-gold text-white border-gold" : "bg-white text-gray-600 border-gray-200")}>
                  {p}
                </button>
              ))}
            </div>
            {/* 학교급 필터 */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {GRADES.map(g => (
                <button key={g.value} onClick={() => setGrade(g.value)}
                  className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (grade===g.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? <LoadingSpinner /> : (
            <>
              <div className="text-sm text-gray-500">총 {filtered.length}명</div>
              {filtered.length === 0
                ? <div className="card p-12 text-center text-gray-400">조건에 맞는 선수가 없습니다</div>
                : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{filtered.map(p => <PlayerCard key={p.id} player={p}/>)}</div>
              }
            </>
          )}
        </>
      )}

      {/* ===== 랭킹 탭 ===== */}
      {tab === "ranking" && (
        <div className="space-y-3">
          {/* 시즌 기준 배너 */}
          <div className="rounded-xl px-4 py-3 text-sm font-bold" style={{ background: "#1a2744", color: "#c8901a" }}>
            {PHASE_BANNER[seasonPhase]}
          </div>

          {/* 허위 정보 경고 */}
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
            ⚠️ <strong>허위 기록 입력 금지</strong> — 실제와 다른 기록을 입력할 경우 관리자가 해당 데이터를 삭제할 수 있습니다.
          </div>
          {/* 시즌 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 flex-shrink-0">시즌</span>
            <select
              value={rankSeason}
              onChange={e => setRankSeason(Number(e.target.value))}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-navy bg-white focus:outline-none focus:border-gold transition appearance-none cursor-pointer"
            >
              {(availableSeasons.length > 0
                ? availableSeasons.filter(y => y >= CUR_YEAR - 10)
                : Array.from({length:20}, (_,i) => CUR_YEAR - i)
              ).map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>

          {/* 투수/타자 */}
          <div className="flex gap-2">
            {["투수","타자"].map(pos => (
              <button key={pos} onClick={() => { setRankPos(pos); setRankStat(pos === "투수" ? "era" : "avg"); }}
                className={"px-4 py-2 rounded-full text-sm font-bold border transition " + (rankPos===pos ? "bg-gold text-white border-gold" : "bg-white text-gray-600 border-gray-200")}>
                {pos}
              </button>
            ))}
          </div>

          {/* 스탯 선택 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {rankConfig.map(r => (
              <button key={r.key} onClick={() => setRankStat(r.key)}
                className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (rankStat===r.key ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                {r.label}
              </button>
            ))}
          </div>

          {/* 학교급 필터 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {GRADES.map(g => (
              <button key={g.value} onClick={() => setRankGrade(g.value)}
                className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (rankGrade===g.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}>
                {g.label}
              </button>
            ))}
          </div>

          {/* 인증 기록만 토글 */}
          <div className="flex items-center justify-between">
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 flex-1 mr-2">
              {seasonPhase === "early"
                ? "⚠️ 시즌 초반 — 최소 기준 없이 모든 선수가 표시됩니다"
                : rankPos === "투수"
                  ? `⚠️ ${minInnings}이닝 미만 선수는 랭킹에 표시되지 않습니다`
                  : `⚠️ ${minAtBats}타석 미만 선수는 랭킹에 표시되지 않습니다`}
            </div>
            <button onClick={() => setVerifiedOnly(v => !v)}
              className={"flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition " + (verifiedOnly ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-200")}>
              ✅ 인증만
            </button>
          </div>

          {loading ? <LoadingSpinner /> : ranked.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <Trophy size={32} className="mx-auto mb-2 text-gray-200"/>
              <p className="text-sm">기준을 충족한 {rankPos} 기록이 없습니다</p>
              <p className="text-xs mt-1 text-gray-300">감독/코치 인증 후 랭킹에 등재됩니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranked.map((p, i) => (
                <Link key={p.id} to={"/players/"+p.id}
                  className={"card p-3 flex items-center gap-3 hover:shadow-md transition " + (i < 3 ? "border-l-4 " + ["border-yellow-400","border-gray-300","border-orange-300"][i] : "")}>
                  <div className={"w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-sm " + (i < 3 ? "bg-navy/10" : "bg-gray-100")}>
                    {i < 3 ? <span className={medalColor[i]}>{["🥇","🥈","🥉"][i]}</span> : <span className="text-gray-400">{i+1}</span>}
                  </div>
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                    {p.profile_image_url
                      ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p.name}/>
                      : <div className="w-full h-full flex items-center justify-center text-base font-extrabold text-navy/30">{p.name?.[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">
                      {p.position}
                      {` · ${p.schools?.name || "소속 없음"}`}
                      {p.schools?.level ? ` · ${LEVEL_LABEL[p.schools.level]||""}` : ""}
                    </div>
                    {getSeasonStats(p)?.stats_verified && (
                      <span className="text-[10px] text-green-600 font-bold">✅ 인증</span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-extrabold text-navy">{getStat(p, currentRankStat.key) ?? "-"}</div>
                    <div className="text-[10px] text-gray-400">{currentRankStat.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
