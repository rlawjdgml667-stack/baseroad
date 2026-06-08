import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [pendingCoaches, setPendingCoaches] = useState([]);
  const [schools, setSchools] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*").eq("role","coach").eq("status","pending"),
      supabase.from("schools").select("id,name,region,level,status"),
      supabase.from("players").select("id,name,position,status,schools(name)"),
    ]).then(([c,s,p]) => {
      setPendingCoaches(c.data||[]);
      setSchools(s.data||[]);
      setPlayers(p.data||[]);
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

  const tabs = [["pending","승인 대기 ("+pendingCoaches.length+")"],["schools","학교 관리 ("+schools.length+")"],["players","선수 관리 ("+players.length+")"]];
  const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">관리자 대시보드</h1>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3"><div className="text-2xl font-extrabold text-navy">{pendingCoaches.length}</div><div className="text-xs text-gray-500">승인 대기</div></div>
        <div className="card p-3"><div className="text-2xl font-extrabold text-navy">{schools.length}</div><div className="text-xs text-gray-500">등록 학교</div></div>
        <div className="card p-3"><div className="text-2xl font-extrabold text-navy">{players.length}</div><div className="text-xs text-gray-500">등록 선수</div></div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} className={"flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>{l}</button>
        ))}
      </div>
      {tab === "pending" && (
        <div className="space-y-2.5">
          {pendingCoaches.length === 0 && <div className="card p-8 text-center text-gray-400">승인 대기 중인 계정이 없습니다</div>}
          {pendingCoaches.map(c => (
            <div key={c.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-xs text-gray-400">{c.email} · {new Date(c.created_at).toLocaleDateString("ko")}</div>
                {c.school_name && <div className="text-xs text-navy mt-0.5">🏫 {c.school_name}</div>}
              </div>
              <button onClick={() => approveCoach(c.id)} className="btn-primary text-xs py-1.5 px-3">승인</button>
              <button onClick={() => rejectCoach(c.id)} className="btn-ghost text-xs py-1.5 px-3 text-red-500">반려</button>
            </div>
          ))}
        </div>
      )}
      {tab === "schools" && (
        <div className="space-y-2">
          {schools.map(s => (
            <div key={s.id} className="card p-3 flex items-center gap-2">
              <div className="flex-1">
                <span className="badge-gray text-[10px] mr-1">{levelLabel[s.level]}</span>
                <span className="font-bold text-sm">{s.name}</span>
                <div className="text-xs text-gray-400 mt-0.5">{s.region}</div>
              </div>
              <button onClick={() => deleteSchool(s.id)} className="text-xs text-red-400 font-bold hover:text-red-600">삭제</button>
            </div>
          ))}
        </div>
      )}
      {tab === "players" && (
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="card p-3 flex items-center gap-2">
              <div className="flex-1">
                <span className="font-bold text-sm">{p.name}</span>
                <div className="text-xs text-gray-400 mt-0.5">{p.position} · {p.schools?.name}</div>
              </div>
              <button onClick={() => deletePlayer(p.id)} className="text-xs text-red-400 font-bold hover:text-red-600">삭제</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}