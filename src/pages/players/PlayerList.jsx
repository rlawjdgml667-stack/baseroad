import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import PlayerCard from "../../components/player/PlayerCard";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search, Trophy } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";

const REGIONS = ["전체","서울","경기","인천","강원","충청","전라","경상","제주"];
const POSITIONS = ["전체","투수","포수","내야수","외야수"];
const GRADES = ["전체","초등","중학","고등","대학"];

const RANKING_CONFIGS = {
  "투수": [
    { key:"era", label:"방어율", unit:"", asc:true, desc:"낮을수록 좋음" },
    { key:"wins", label:"승", unit:"승", asc:false },
    { key:"strikeouts", label:"탈삼진", unit:"K", asc:false },
    { key:"innings_pitched", label:"이닝", unit:"이닝", asc:false },
  ],
  "타자": [
    { key:"batting_avg", label:"타율", unit:"", asc:false },
    { key:"home_runs", label:"홈런", unit:"HR", asc:false },
    { key:"rbi", label:"타점", unit:"타점", asc:false },
    { key:"hits", label:"안타", unit:"안타", asc:false },
  ],
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

  useEffect(() => {
    supabase.from("players").select("*, schools(name, region, level)").eq("status","active").then(({ data }) => {
      setPlayers(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = players.filter(p => {
    const sr = p.schools?.region || "";
    const sl = p.schools?.level || "";
    const levelMap = { elementary:"초등", middle:"중학", high:"고등", college:"대학" };
    if (region !== "전체" && !sr.includes(region)) return false;
    if (position !== "전체" && p.position !== position) return false;
    if (grade !== "전체" && levelMap[sl] !== grade) return false;
    if (search && !p.name.includes(search) && !(p.schools?.name||"").includes(search)) return false;
    return true;
  });

  // 랭킹 데이터
  const pitchers = players.filter(p => p.position === "투수");
  const batters = players.filter(p => ["포수","내야수","외야수"].includes(p.position));
  const rankPlayers = rankPos === "투수" ? pitchers : batters;
  const rankConfig = (rankPos === "투수" ? RANKING_CONFIGS["투수"] : RANKING_CONFIGS["타자"]);
  const currentRankStat = rankConfig.find(r => r.key === rankStat) || rankConfig[0];

  const ranked = [...rankPlayers]
    .filter(p => p[currentRankStat.key] != null)
    .sort((a, b) => currentRankStat.asc
      ? (a[currentRankStat.key]||999) - (b[currentRankStat.key]||999)
      : (b[currentRankStat.key]||0) - (a[currentRankStat.key]||0)
    )
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

      {tab === "list" && (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="선수명 또는 학교명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (region===r ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {POSITIONS.map(p => (
                <button key={p} onClick={() => setPosition(p)}
                  className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (position===p ? "bg-gold text-white border-gold" : "bg-white text-gray-600 border-gray-200")}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)}
                  className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (grade===g ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}>
                  {g}
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

      {tab === "ranking" && (
        <div className="space-y-3">
          {/* 포지션 선택 */}
          <div className="flex gap-2">
            {["투수","타자"].map(pos => (
              <button key={pos} onClick={() => { setRankPos(pos); setRankStat(pos === "투수" ? "era" : "batting_avg"); }}
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

          {loading ? <LoadingSpinner /> : ranked.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <Trophy size={32} className="mx-auto mb-2 text-gray-200"/>
              <p className="text-sm">등록된 {rankPos} 데이터가 없습니다</p>
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
                    <div className="text-xs text-gray-400">{p.position} · {p.schools?.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-extrabold text-navy">{p[currentRankStat.key]}</div>
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
