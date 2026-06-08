import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

const posColor = {
  "투수": "bg-red-100 text-red-700",
  "포수": "bg-blue-100 text-blue-700",
  "내야수": "bg-green-100 text-green-700",
  "외야수": "bg-purple-100 text-purple-700",
};

const PITCHER_STATS = [
  ["era","방어율",""],["wins","승","승"],["losses","패","패"],
  ["saves","세이브","SV"],["innings_pitched","이닝","이닝"],
  ["strikeouts","탈삼진","K"],["walks","볼넷","BB"],["hits_allowed","피안타","안타"],
];

const BATTER_STATS = [
  ["batting_avg","타율",""],["home_runs","홈런","HR"],["rbi","타점","타점"],
  ["hits","안타","안타"],["runs","득점","득점"],["stolen_bases","도루","도루"],
  ["obp","출루율",""],["ops","OPS",""],
];

export default function PlayerCompare() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [selected, setSelected] = useState([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectingSlot, setSelectingSlot] = useState(null);

  useEffect(() => {
    supabase.from("players").select("*, schools(name)").eq("status","active").order("name").then(({ data }) => {
      setAllPlayers(data||[]);
      setLoading(false);
    });
  }, []);

  function selectPlayer(player) {
    if (selectingSlot === null) return;
    const newSelected = [...selected];
    newSelected[selectingSlot] = player;
    setSelected(newSelected);
    setSelectingSlot(null);
    setSearch("");
  }

  function removePlayer(idx) {
    const newSelected = [...selected];
    newSelected[idx] = null;
    setSelected(newSelected);
  }

  const activePlayers = selected.filter(Boolean);
  const searchResults = search ? allPlayers.filter(p => p.name.includes(search) || (p.schools?.name||"").includes(search) || (p.position||"").includes(search)).slice(0, 8) : [];

  // 포지션별 스탯 결정
  const hasPitcher = activePlayers.some(p => p.position === "투수");
  const hasBatter = activePlayers.some(p => p.position !== "투수");
  const pitcherStats = hasPitcher ? PITCHER_STATS : [];
  const batterStats = hasBatter ? BATTER_STATS : [];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/players" className="text-sm text-navy font-bold hover:underline">← 선수 목록</Link>
      </div>
      <h1 className="text-xl font-extrabold text-navy">선수 비교</h1>
      <p className="text-xs text-gray-400">최대 3명의 선수를 나란히 비교할 수 있습니다.</p>

      {/* 선수 선택 슬롯 */}
      <div className="grid grid-cols-3 gap-2">
        {[0,1,2].map(idx => (
          <div key={idx}>
            {selected[idx] ? (
              <div className="card p-2.5 text-center relative">
                <button onClick={() => removePlayer(idx)} className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200">
                  <X size={10} className="text-red-500"/>
                </button>
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-navy/10 mx-auto mb-1.5">
                  {selected[idx].profile_image_url
                    ? <img src={selected[idx].profile_image_url} className="w-full h-full object-cover" alt=""/>
                    : <div className="w-full h-full flex items-center justify-center text-base font-extrabold text-navy/30">{selected[idx].name?.[0]}</div>}
                </div>
                <div className="text-xs font-extrabold text-navy leading-tight truncate">{selected[idx].name}</div>
                <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block " + (posColor[selected[idx].position]||"bg-gray-100 text-gray-600")}>
                  {selected[idx].position}
                </span>
              </div>
            ) : (
              <button onClick={() => setSelectingSlot(idx)}
                className="card p-3 text-center w-full border-2 border-dashed border-gray-200 hover:border-navy transition bg-gray-50 h-full min-h-[90px] flex flex-col items-center justify-center">
                <div className="text-xl text-gray-300 mb-1">+</div>
                <div className="text-xs text-gray-400">선수 선택</div>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 검색 */}
      {selectingSlot !== null && (
        <div className="card p-3 space-y-2 border-2 border-navy">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy">슬롯 {selectingSlot+1} 선수 선택</span>
            <button onClick={() => { setSelectingSlot(null); setSearch(""); }} className="text-xs text-gray-400">취소</button>
          </div>
          <input className="input" placeholder="선수명 또는 학교명 검색..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => selectPlayer(p)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-navy/5 flex items-center gap-2 transition">
                  <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded-full " + (posColor[p.position]||"bg-gray-100 text-gray-600")}>{p.position}</span>
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.schools?.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 비교 테이블 */}
      {activePlayers.length >= 2 && (
        <div className="space-y-3">
          {/* 기본 정보 */}
          <div className="card overflow-hidden">
            <div className="bg-navy px-4 py-2">
              <span className="text-white text-xs font-extrabold">기본 정보</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 text-gray-400 font-bold w-16">항목</td>
                    {selected.map((p, i) => p && <td key={i} className="p-2 font-extrabold text-navy text-center">{p.name}</td>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["포지션", p => p.position||"-"],
                    ["학교", p => p.schools?.name||"-"],
                    ["학년", p => p.grade||"-"],
                    ["투타", p => p.bat_throw||"-"],
                    ["신장", p => p.height ? p.height+"cm" : "-"],
                    ["체중", p => p.weight ? p.weight+"kg" : "-"],
                  ].map(([label, getter]) => (
                    <tr key={label} className="border-b border-gray-50 even:bg-gray-50/50">
                      <td className="p-2 text-gray-500 font-bold">{label}</td>
                      {selected.map((p, i) => p && <td key={i} className="p-2 text-center text-gray-700">{getter(p)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 투수 스탯 */}
          {pitcherStats.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-red-500 px-4 py-2">
                <span className="text-white text-xs font-extrabold">투수 스탯</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {pitcherStats.map(([key, label, unit]) => (
                      <tr key={key} className="border-b border-gray-50 even:bg-gray-50/50">
                        <td className="p-2 text-gray-500 font-bold w-16">{label}</td>
                        {selected.map((p, i) => p && (
                          <td key={i} className="p-2 text-center font-bold text-navy">
                            {p.position === "투수" ? (p[key] != null ? p[key]+(unit?" "+unit:"") : "-") : <span className="text-gray-300">N/A</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 타자 스탯 */}
          {batterStats.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-blue-600 px-4 py-2">
                <span className="text-white text-xs font-extrabold">타자 스탯</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {batterStats.map(([key, label, unit]) => (
                      <tr key={key} className="border-b border-gray-50 even:bg-gray-50/50">
                        <td className="p-2 text-gray-500 font-bold w-16">{label}</td>
                        {selected.map((p, i) => p && (
                          <td key={i} className="p-2 text-center font-bold text-navy">
                            {p.position !== "투수" ? (p[key] != null ? p[key]+(unit?" "+unit:"") : "-") : <span className="text-gray-300">N/A</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 상세보기 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            {selected.map((p, i) => p && (
              <Link key={i} to={"/players/"+p.id} className="btn-outline text-xs py-2 text-center">{p.name} 상세보기</Link>
            ))}
          </div>
        </div>
      )}

      {activePlayers.length < 2 && (
        <div className="card p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm">비교할 선수를 2명 이상 선택해주세요</p>
        </div>
      )}
    </div>
  );
}
