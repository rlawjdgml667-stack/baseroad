import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SchoolCard from "../components/school/SchoolCard";
import PlayerCard from "../components/player/PlayerCard";

const REGION_LIST = ["서울","경기","인천","대전","세종","충남","충북","광주","전남","전북","대구","경북","부산","경남","울산","강원","제주"];

export default function Home() {
  const [schools, setSchools] = useState([]);
  const [players, setPlayers] = useState([]);
  const [regionStats, setRegionStats] = useState([]);
  const [totalStats, setTotalStats] = useState({ schools:0, players:0 });
  const [loading, setLoading] = useState(true);

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
        <Link to="/register" className="card p-4 flex items-center gap-3 hover:shadow-md transition">
          <span className="text-2xl">📝</span>
          <div>
            <div className="font-extrabold text-sm text-navy">선수 등록</div>
            <div className="text-xs text-gray-400">내 프로필 등록하기</div>
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
            { icon:"🏫", title:"감독·코치", desc:"학교 정보 등록 관리", to:"/register" },
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
    </div>
  );
}
