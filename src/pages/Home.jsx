import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SchoolCard from "../components/school/SchoolCard";
import PlayerCard from "../components/player/PlayerCard";
import { Search, ChevronRight } from "lucide-react";

const REGION_LIST = ["서울","경기","인천","대전","세종","충남","충북","광주","전남","전북","대구","경북","부산","경남","울산","강원","제주"];

export default function Home() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [players, setPlayers] = useState([]);
  const [regionStats, setRegionStats] = useState([]);
  const [totalStats, setTotalStats] = useState({ schools:0, players:0 });
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const [s, p] = await Promise.all([
        supabase.from("schools").select("id,name,level,region").ilike("name", `%${searchQ}%`).eq("status","active").limit(5),
        supabase.from("players").select("id,name,position,profile_image_url,schools(name)").ilike("name", `%${searchQ}%`).eq("status","active").limit(5),
      ]);
      setSearchResults({ schools: s.data||[], players: p.data||[] });
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  useEffect(() => {
    Promise.all([
      supabase.from("schools").select("*").eq("status","active").limit(4).order("created_at",{ascending:false}),
      supabase.from("players").select("*, schools(name, region, level)").eq("status","active").limit(4).order("created_at",{ascending:false}),
      supabase.from("schools").select("region").eq("status","active"),
      supabase.from("players").select("id", {count:"exact", head:true}).eq("status","active"),
    ]).then(([sc, pl, allSc, plCount]) => {
      setSchools(sc.data||[]);
      setPlayers(pl.data||[]);
      const sd = allSc.data||[];
      const stats = REGION_LIST.map(r => ({ region:r, count: sd.filter(s => (s.region||"").includes(r)).length })).filter(r => r.count > 0);
      setRegionStats(stats);
      setTotalStats({ schools: sd.length, players: plCount.count||0 });
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 pb-4">
      {/* 히어로 */}
      <div className="bg-navy rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 text-[120px] leading-none opacity-5 select-none">⚾</div>
        <div className="relative">
          <h1 className="text-2xl font-extrabold leading-tight">우리 아이에게 맞는<br/><span className="text-gold">야구부 학교</span>를 찾아보세요</h1>
          <p className="text-white/70 text-sm mt-2 mb-4">학교 시설·회비·감독 정보를 한눈에 비교하고<br/>선수 프로필로 진학을 준비하세요</p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/schools" className="btn-gold text-sm py-2 px-4">학교 목록 보기</Link>
            <Link to="/players" className="btn-outline text-sm py-2 px-4 border-white text-white hover:bg-white hover:text-navy">선수 프로필 보기</Link>
          </div>
        </div>
      </div>

      {/* 통합 검색 */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm focus-within:border-navy transition">
          <Search size={16} className="text-gray-400 flex-shrink-0"/>
          <input
            className="flex-1 text-sm outline-none bg-transparent"
            placeholder="학교명 또는 선수명으로 검색..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && <button onClick={() => { setSearchQ(""); setSearchResults(null); }} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>}
        </div>
        {/* 검색 결과 드롭다운 */}
        {searchQ && (
          <div className="absolute left-0 right-0 top-14 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            {searching && <div className="p-4 text-center text-sm text-gray-400">검색 중...</div>}
            {!searching && searchResults && (
              <>
                {searchResults.schools.length === 0 && searchResults.players.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-400">검색 결과가 없습니다</div>
                )}
                {searchResults.schools.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-extrabold text-gray-400 bg-gray-50">🏫 학교</div>
                    {searchResults.schools.map(s => (
                      <Link key={s.id} to={"/schools/"+s.id} onClick={() => { setSearchQ(""); setSearchResults(null); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-navy/5 transition border-b border-gray-50 last:border-0">
                        <span className="text-xs font-bold text-navy">{s.name}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">{s.region}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.players.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-extrabold text-gray-400 bg-gray-50">⚾ 선수</div>
                    {searchResults.players.map(p => (
                      <Link key={p.id} to={"/players/"+p.id} onClick={() => { setSearchQ(""); setSearchResults(null); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-navy/5 transition border-b border-gray-50 last:border-0">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-navy/10 flex-shrink-0">
                          {p.profile_image_url ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-navy/30">{p.name?.[0]}</div>}
                        </div>
                        <span className="text-xs font-bold text-navy">{p.name}</span>
                        <span className="text-[10px] text-gray-400">{p.position}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">{p.schools?.name||""}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 핵심 통계 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="text-2xl font-extrabold text-navy">{totalStats.schools}</div>
          <div className="text-xs text-gray-400 mt-0.5">등록 학교</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-extrabold text-gold">{totalStats.players}</div>
          <div className="text-xs text-gray-400 mt-0.5">등록 선수</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-extrabold text-green-600">{regionStats.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">활동 지역</div>
        </div>
      </div>

      {/* 지역별 학교 현황 */}
      {regionStats.length > 0 && (
        <div className="card p-4">
          <h2 className="section-title">지역별 학교 현황</h2>
          <div className="space-y-2 mt-3">
            {regionStats.sort((a,b)=>b.count-a.count).map(r => {
              const max = Math.max(...regionStats.map(x=>x.count));
              const pct = Math.round((r.count/max)*100);
              return (
                <Link key={r.region} to={"/schools?region="+r.region} className="flex items-center gap-2 group">
                  <span className="text-xs font-bold text-gray-600 w-8 flex-shrink-0">{r.region}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-navy rounded-full transition-all group-hover:opacity-80 flex items-center pl-2" style={{width: pct+"%"}}>
                      <span className="text-white text-[10px] font-bold">{r.count}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 빠른 기능 링크 */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/schools/compare" className="card p-4 flex items-center gap-3 hover:shadow-md transition">
          <span className="text-2xl">⚖️</span>
          <div>
            <div className="font-extrabold text-sm text-navy">학교 비교</div>
            <div className="text-xs text-gray-400">학교를 나란히 비교</div>
          </div>
        </Link>
        <Link to="/players/compare" className="card p-4 flex items-center gap-3 hover:shadow-md transition">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-extrabold text-sm text-navy">선수 비교</div>
            <div className="text-xs text-gray-400">선수 스탯 비교</div>
          </div>
        </Link>
        <Link to="/players?tab=ranking" className="card p-4 flex items-center gap-3 hover:shadow-md transition">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="font-extrabold text-sm text-navy">선수 랭킹</div>
            <div className="text-xs text-gray-400">포지션별 랭킹</div>
          </div>
        </Link>
        <Link to="/community" className="card p-4 flex items-center gap-3 hover:shadow-md transition">
          <span className="text-2xl">💬</span>
          <div>
            <div className="font-extrabold text-sm text-navy">커뮤니티</div>
            <div className="text-xs text-gray-400">자유롭게 소통하기</div>
          </div>
        </Link>
      </div>

      {/* 최근 등록 학교 */}
      {schools.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">최근 등록 학교</h2>
            <Link to="/schools" className="text-xs text-navy font-bold hover:underline">전체 보기 →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {schools.map(s => <SchoolCard key={s.id} school={s}/>)}
          </div>
        </div>
      )}

      {/* 최근 등록 선수 */}
      {players.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">최근 등록 선수</h2>
            <Link to="/players" className="text-xs text-navy font-bold hover:underline">전체 보기 →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {players.map(p => <PlayerCard key={p.id} player={p}/>)}
          </div>
        </div>
      )}

      {/* 서비스 소개 */}
      <div>
        <h2 className="section-title">누구를 위한 서비스인가요?</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon:"👨‍👩‍👦", title:"학부모", desc:"학교 정보 비교·분석", to:"/schools" },
            { icon:"⚾", title:"선수", desc:"내 프로필 등록 및 공개", to:"/players" },
            { icon:"🏫", title:"감독·코치", desc:"학교 정보 등록 관리", to:"/dashboard/coach" },
          ].map(item => (
            <Link key={item.title} to={item.to} className="card p-3 text-center hover:shadow-md transition">
              <div className="text-3xl mb-1">{item.icon}</div>
              <div className="font-extrabold text-xs text-navy">{item.title}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.desc}</div>
            </Link>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">
          스카우트·관계자 분들도 선수 정보를 자유롭게 열람하실 수 있습니다
        </p>
      </div>

      {/* 이용 방법 */}
      <HowToUse />
    </div>
  );
}

const HOW_TO = [
  {
    role: "학부모",
    icon: "👨‍👩‍👦",
    color: "bg-blue-50 border-blue-200",
    accent: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    link: "/register",
    linkLabel: "학부모로 가입하기",
    steps: [
      { icon: "✍️", title: "회원가입", desc: "학부모로 가입합니다" },
      { icon: "🏫", title: "자녀 학교 입력", desc: "대시보드에서 자녀 소속 학교를 직접 입력합니다" },
      { icon: "🔍", title: "학교 검색 & 비교", desc: "전국 야구부 학교 시설·회비·감독 정보를 비교합니다" },
      { icon: "💬", title: "커뮤니티 활동", desc: "다른 학부모·선수와 진학 정보를 교류합니다" },
    ],
  },
  {
    role: "선수",
    icon: "⚾",
    color: "bg-green-50 border-green-200",
    accent: "text-green-700",
    badge: "bg-green-100 text-green-700",
    link: "/register",
    linkLabel: "선수로 가입하기",
    steps: [
      { icon: "✍️", title: "회원가입", desc: "선수로 가입합니다" },
      { icon: "📋", title: "프로필 등록", desc: "포지션·신체 정보·플레이 영상을 등록합니다" },
      { icon: "🔗", title: "학교 연결 신청", desc: "소속 학교를 검색하여 연결을 신청합니다" },
      { icon: "📊", title: "시즌 기록 입력", desc: "감독 인증을 받으면 랭킹에 등재됩니다" },
    ],
  },
  {
    role: "감독·코치",
    icon: "🏫",
    color: "bg-orange-50 border-orange-200",
    accent: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    link: "/register",
    linkLabel: "감독·코치로 가입하기",
    steps: [
      { icon: "✍️", title: "회원가입 신청", desc: "감독·코치로 가입 신청합니다 (관리자 승인 필요)" },
      { icon: "✅", title: "관리자 승인", desc: "승인 후 학교 정보 등록 권한이 부여됩니다" },
      { icon: "🏫", title: "학교 정보 등록", desc: "시설·회비·훈련 방식 등 학교 정보를 등록합니다" },
      { icon: "⚾", title: "선수 관리", desc: "연결 신청한 선수를 승인하고 기록을 인증합니다" },
    ],
  },
];

function HowToUse() {
  const [active, setActive] = useState(0);
  const item = HOW_TO[active];
  return (
    <div className="space-y-3">
      <h2 className="section-title">이용 방법</h2>
      {/* 역할 탭 */}
      <div className="flex gap-2">
        {HOW_TO.map((h, i) => (
          <button key={h.role} onClick={() => setActive(i)}
            className={"flex-1 py-2.5 rounded-xl text-xs font-extrabold border-2 transition " +
              (active === i ? h.color + " " + h.accent + " border-current" : "bg-white text-gray-400 border-gray-200")}>
            <span className="mr-1">{h.icon}</span>{h.role}
          </button>
        ))}
      </div>

      {/* 단계 */}
      <div className={"rounded-2xl border p-4 space-y-3 " + item.color}>
        {item.steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5 " + item.badge}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className={"text-sm font-extrabold " + item.accent}>
                <span className="mr-1">{s.icon}</span>{s.title}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
            </div>
            {i < item.steps.length - 1 && (
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1"/>
            )}
          </div>
        ))}
        <Link to={item.link}
          className={"block text-center text-xs font-extrabold py-2.5 rounded-xl mt-1 " + item.badge + " hover:opacity-80 transition"}>
          {item.linkLabel} →
        </Link>
      </div>
    </div>
  );
}
