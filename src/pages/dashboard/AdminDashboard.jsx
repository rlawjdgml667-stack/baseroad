import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

const LEVEL_LABEL = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };
const POSITION_LIST = ["투수","포수","내야수","외야수"];
const REGION_LIST = ["서울","경기","인천","강원","충청","전라","경상","제주"];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("stats");
  const [pendingCoaches, setPendingCoaches] = useState([]);
  const [schools, setSchools] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*").eq("role","coach").eq("status","pending"),
      supabase.from("schools").select("id,name,region,level,status,created_at"),
      supabase.from("players").select("id,name,position,status,created_at,schools(name)"),
      supabase.from("profiles").select("id,role,status,created_at"),
    ]).then(([c,s,p,pr]) => {
      setPendingCoaches(c.data||[]);
      setSchools(s.data||[]);
      setPlayers(p.data||[]);
      setAllProfiles(pr.data||[]);
      setLoading(false);
    });
  }, []);

  async function approveCoach(id) {
    await supabase.from("profiles").update({ status:"active" }).eq("id", id);
    setPendingCoaches(prev => prev.filter(c => c.id !== id));
    toast.success("감독·코치가 승인됐습니다");
  }

  async function rejectCoach(id) {
    await supabase.from("profiles").update({ status:"rejected" }).eq("id", id);
    setPendingCoaches(prev => prev.filter(c => c.id !== id));
    toast.success("반려됐습니다");
  }

  async function deleteSchool(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("schools").delete().eq("id",id);
    setSchools(prev => prev.filter(s => s.id !== id));
    toast.success("학교가 삭제됐습니다");
  }

  async function deletePlayer(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("players").delete().eq("id",id);
    setPlayers(prev => prev.filter(p => p.id !== id));
    toast.success("선수가 삭제됐습니다");
  }

  if (loading) return <LoadingSpinner />;

  // 통계 계산
  const roleCount = { parent:0, player:0, coach:0, admin:0 };
  allProfiles.forEach(p => { if (roleCount[p.role] !== undefined) roleCount[p.role]++; });

  const regionSchoolCount = REGION_LIST.map(r => ({
    region: r,
    count: schools.filter(s => (s.region||"").includes(r)).length
  })).filter(r => r.count > 0).sort((a,b) => b.count - a.count);

  const posCount = POSITION_LIST.map(pos => ({
    pos,
    count: players.filter(p => p.position === pos).length
  }));

  const levelCount = Object.entries(LEVEL_LABEL).map(([k,v]) => ({
    level: v,
    count: schools.filter(s => s.level === k).length
  })).filter(x => x.count > 0);

  const tabs = [
    ["stats","통계"],
    ["pending","승인 대기 ("+pendingCoaches.length+")"],
    ["schools","학교 관리 ("+schools.length+")"],
    ["players","선수 관리 ("+players.length+")"],
  ];

  function SimpleBar({ value, max, color }) {
    const pct = max > 0 ? Math.round((value/max)*100) : 0;
    return (
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className={"h-full rounded-full flex items-center pl-2 " + color} style={{width: pct+"%", minWidth: value > 0 ? "24px" : "0"}}>
          {value > 0 && <span className="text-white text-[10px] font-bold">{value}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">관리자 대시보드</h1>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3">
          <div className="text-2xl font-extrabold text-red-500">{pendingCoaches.length}</div>
          <div className="text-xs text-gray-500">승인 대기</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-extrabold text-navy">{schools.length}</div>
          <div className="text-xs text-gray-500">등록 학교</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-extrabold text-gold">{players.length}</div>
          <div className="text-xs text-gray-500">등록 선수</div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} className={"flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
            {l}
          </button>
        ))}
      </div>

      {/* 통계 탭 */}
      {tab === "stats" && (
        <div className="space-y-4">
          {/* 회원 유형별 */}
          <div className="card p-4">
            <h3 className="text-sm font-extrabold text-navy mb-3">👥 회원 유형별 현황</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[["학부모",roleCount.parent,"bg-blue-100 text-blue-700"],["선수",roleCount.player,"bg-green-100 text-green-700"],["감독·코치",roleCount.coach,"bg-orange-100 text-orange-700"],["관리자",roleCount.admin,"bg-red-100 text-red-700"]].map(([label,count,cls]) => (
                <div key={label} className={"rounded-xl p-3 "+cls}>
                  <div className="text-xl font-extrabold">{count}</div>
                  <div className="text-[10px] font-bold mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-400 text-center">총 {allProfiles.length}명 가입</div>
          </div>

          {/* 지역별 학교 */}
          {regionSchoolCount.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-extrabold text-navy mb-3">🗺️ 지역별 학교 수</h3>
              <div className="space-y-2">
                {regionSchoolCount.map(r => {
                  const max = regionSchoolCount[0].count;
                  return (
                    <div key={r.region} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 w-8 flex-shrink-0">{r.region}</span>
                      <SimpleBar value={r.count} max={max} color="bg-navy" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 선수 포지션별 */}
          {players.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-extrabold text-navy mb-3">⚾ 선수 포지션별 분포</h3>
              <div className="space-y-2">
                {posCount.map(({ pos, count }) => {
                  const max = Math.max(...posCount.map(p => p.count));
                  const colors = { "투수":"bg-red-400", "포수":"bg-blue-400", "내야수":"bg-green-400", "외야수":"bg-purple-400" };
                  return (
                    <div key={pos} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 w-14 flex-shrink-0">{pos}</span>
                      <SimpleBar value={count} max={max} color={colors[pos]||"bg-gray-400"} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 학교 구분별 */}
          {schools.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-extrabold text-navy mb-3">🏫 학교 구분별</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {levelCount.map(({ level, count }) => (
                  <div key={level} className="bg-navy/5 rounded-xl p-3">
                    <div className="text-xl font-extrabold text-navy">{count}</div>
                    <div className="text-[10px] text-gray-500 font-bold">{level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 승인 대기 */}
      {tab === "pending" && (
        <div className="space-y-2.5">
          {pendingCoaches.length === 0 && <div className="card p-8 text-center text-gray-400">승인 대기 중인 계정이 없습니다</div>}
          {pendingCoaches.map(c => (
            <div key={c.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-xs text-gray-400">{c.email} · {new Date(c.created_at).toLocaleDateString("ko")}</div>
                {c.school_name && <div className="text-xs text-navy mt-0.5">🏫 {c.school_name}</div>}
                {c.phone && <div className="text-xs text-gray-400 mt-0.5">📞 {c.phone}</div>}
              </div>
              <button onClick={() => approveCoach(c.id)} className="btn-primary text-xs py-1.5 px-3">승인</button>
              <button onClick={() => rejectCoach(c.id)} className="btn-ghost text-xs py-1.5 px-3 text-red-500">반려</button>
            </div>
          ))}
        </div>
      )}

      {/* 학교 관리 */}
      {tab === "schools" && (
        <div className="space-y-2">
          {schools.length === 0 && <div className="card p-8 text-center text-gray-400">등록된 학교가 없습니다</div>}
          {schools.map(s => (
            <div key={s.id} className="card p-3 flex items-center gap-2">
              <div className="flex-1">
                <span className="badge-gray text-[10px] mr-1">{LEVEL_LABEL[s.level]}</span>
                <span className="font-bold text-sm">{s.name}</span>
                <div className="text-xs text-gray-400 mt-0.5">{s.region} · {new Date(s.created_at).toLocaleDateString("ko")} 등록</div>
              </div>
              <button onClick={() => deleteSchool(s.id)} className="text-xs text-red-400 font-bold hover:text-red-600">삭제</button>
            </div>
          ))}
        </div>
      )}

      {/* 선수 관리 */}
      {tab === "players" && (
        <div className="space-y-2">
          {players.length === 0 && <div className="card p-8 text-center text-gray-400">등록된 선수가 없습니다</div>}
          {players.map(p => (
            <div key={p.id} className="card p-3 flex items-center gap-2">
              <div className="flex-1">
                <span className="font-bold text-sm">{p.name}</span>
                <div className="text-xs text-gray-400 mt-0.5">{p.position} · {p.schools?.name} · {new Date(p.created_at).toLocaleDateString("ko")} 등록</div>
              </div>
              <button onClick={() => deletePlayer(p.id)} className="text-xs text-red-400 font-bold hover:text-red-600">삭제</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
