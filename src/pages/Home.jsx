import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SchoolCard from "../components/school/SchoolCard";
import PlayerCard from "../components/player/PlayerCard";

export default function Home() {
  const [schools, setSchools] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    supabase.from("schools").select("*").eq("status","active").limit(4).order("created_at",{ascending:false}).then(({data}) => setSchools(data||[]));
    supabase.from("players").select("*, schools(name, region, level)").eq("status","active").limit(4).order("created_at",{ascending:false}).then(({data}) => setPlayers(data||[]));
  }, []);

  return (
    <div className="space-y-8 pb-4">
      <div className="bg-navy rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 text-[120px] leading-none opacity-5 select-none">⚾</div>
        <div className="relative">
          <h1 className="text-2xl font-extrabold leading-tight">우리 아이에게 맞는<br/><span className="text-gold">야구부 학교</span>를 찾아보세요</h1>
          <p className="text-white/70 text-sm mt-2 mb-4">학교 시설·회비·감독 정보를 한눈에 비교하고<br/>선수 프로필과 Q&A로 진학을 준비하세요</p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/schools" className="btn-gold text-sm py-2 px-4">학교 목록 보기</Link>
            <Link to="/players" className="btn-outline text-sm py-2 px-4 border-white text-white hover:bg-white hover:text-navy">선수 프로필 보기</Link>
          </div>
        </div>
      </div>

      <div>
        <h2 className="section-title">누구를 위한 서비스인가요?</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon:"👨‍👩‍👦", title:"학부모", desc:"학교 정보 비교 및 Q&A", to:"/schools" },
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
      </div>

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

      <div className="text-center py-4 border-t border-gray-200">
        <Link to="/players" className="text-xs text-gray-400 hover:text-navy transition">
          스카우트·관계자 분들도 선수 정보를 자유롭게 열람하실 수 있습니다 →
        </Link>
      </div>
    </div>
  );
}