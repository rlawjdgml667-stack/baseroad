import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import SchoolCard from "../../components/school/SchoolCard";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search } from "lucide-react";

const REGIONS = ["전체","서울","경기","인천","대전","세종","충남","충북","광주","전남","전북","대구","경북","부산","경남","울산","강원","제주"];
const LEVELS = [{ v:"all",l:"전체" },{ v:"little",l:"리틀" },{ v:"elementary",l:"초등" },{ v:"middle",l:"중등" },{ v:"high",l:"고등" },{ v:"college",l:"대학" }];

export default function SchoolList() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("전체");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("schools").select("*").eq("status","active").then(({ data }) => {
      setSchools(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = schools.filter(s => {
    if (region !== "전체" && !s.region.includes(region)) return false;
    if (level !== "all" && s.level !== level) return false;
    if (search && !s.name.includes(search) && !(s.director_name||"").includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">학교 정보</h1>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="학교명 또는 감독명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)}
              className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (region===r ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy")}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {LEVELS.map(l => (
            <button key={l.v} onClick={() => setLevel(l.v)}
              className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (level===l.v ? "bg-gold text-white border-gold" : "bg-white text-gray-600 border-gray-200 hover:border-gold")}>
              {l.l}
            </button>
          ))}
        </div>
      </div>
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="text-sm text-gray-500">총 {filtered.length}개 학교</div>
          {filtered.length === 0
            ? <div className="card p-12 text-center text-gray-400">조건에 맞는 학교가 없습니다</div>
            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{filtered.map(s => <SchoolCard key={s.id} school={s}/>)}</div>
          }
        </>
      )}
    </div>
  );
}