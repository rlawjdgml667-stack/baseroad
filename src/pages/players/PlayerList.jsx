import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import PlayerCard from "../../components/player/PlayerCard";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search } from "lucide-react";

const REGIONS = ["전체","서울","경기","인천","강원","충청","전라","경상","제주"];
const POSITIONS = ["전체","투수","포수","내야수","외야수"];
const GRADES = ["전체","초등","중학","고등","대학"];

export default function PlayerList() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("전체");
  const [position, setPosition] = useState("전체");
  const [grade, setGrade] = useState("전체");
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">선수 목록</h1>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="선수명 또는 학교명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${region===r ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200"}`}>{r}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {POSITIONS.map(p => (
            <button key={p} onClick={() => setPosition(p)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${position===p ? "bg-gold text-white border-gold" : "bg-white text-gray-600 border-gray-200"}`}>{p}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {GRADES.map(g => (
            <button key={g} onClick={() => setGrade(g)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${grade===g ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>{g}</button>
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
    </div>
  );
}