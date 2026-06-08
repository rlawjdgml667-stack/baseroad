import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Heart } from "lucide-react";

export default function ParentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [favSchools, setFavSchools] = useState([]);
  const [favPlayers, setFavPlayers] = useState([]);
  const [myQna, setMyQna] = useState([]);
  const [tab, setTab] = useState("schools");

  useEffect(() => {
    Promise.all([
      supabase.from("favorites").select("target_id").eq("user_id",user.id).eq("target_type","school"),
      supabase.from("favorites").select("target_id").eq("user_id",user.id).eq("target_type","player"),
      supabase.from("qna").select("*, schools(name)").eq("user_id",user.id).order("created_at",{ascending:false}),
    ]).then(async ([fs, fp, qna]) => {
      const sIds = (fs.data||[]).map(f => f.target_id);
      const pIds = (fp.data||[]).map(f => f.target_id);
      const [sRes, pRes] = await Promise.all([
        sIds.length ? supabase.from("schools").select("id,name,region,level,main_image_url,monthly_fee").in("id",sIds) : { data:[] },
        pIds.length ? supabase.from("players").select("id,name,position,profile_image_url,school_id,schools(name)").in("id",pIds) : { data:[] },
      ]);
      setFavSchools(sRes.data||[]);
      setFavPlayers(pRes.data||[]);
      setMyQna(qna.data||[]);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <LoadingSpinner />;

  const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };
  const tabs = [["schools","관심 학교 ("+favSchools.length+")"],["players","관심 선수 ("+favPlayers.length+")"],["qna","내 Q&A ("+myQna.length+")"]];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">학부모 대시보드</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} className={"flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>{l}</button>
        ))}
      </div>
      {tab === "schools" && (
        favSchools.length === 0
          ? <div className="card p-10 text-center text-gray-400">관심 학교가 없습니다<br/><Link to="/schools" className="text-navy font-bold text-sm mt-2 inline-block">학교 목록 보기 →</Link></div>
          : <div className="space-y-2.5">
              {favSchools.map(s => (
                <Link key={s.id} to={"/schools/"+s.id} className="card flex gap-3 p-3 items-center hover:bg-navy/5 transition">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-navy/10 flex-shrink-0">
                    {s.main_image_url ? <img src={s.main_image_url} className="w-full h-full object-cover" alt={s.name}/> : <div className="w-full h-full flex items-center justify-center text-2xl">🏫</div>}
                  </div>
                  <div className="flex-1">
                    <span className="badge-navy text-[10px] mr-1">{levelLabel[s.level]}</span>
                    <div className="font-extrabold text-sm">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.region} · {s.monthly_fee || "회비 미등록"}</div>
                  </div>
                  <Heart size={14} fill="#f43f5e" className="text-red-400" />
                </Link>
              ))}
            </div>
      )}
      {tab === "players" && (
        favPlayers.length === 0
          ? <div className="card p-10 text-center text-gray-400">관심 선수가 없습니다<br/><Link to="/players" className="text-navy font-bold text-sm mt-2 inline-block">선수 목록 보기 →</Link></div>
          : <div className="space-y-2.5">
              {favPlayers.map(p => (
                <Link key={p.id} to={"/players/"+p.id} className="card flex gap-3 p-3 items-center hover:bg-navy/5 transition">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                    {p.profile_image_url ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-navy/20">{p.name?.[0]}</div>}
                  </div>
                  <div><div className="font-extrabold text-sm">{p.name}</div><div className="text-xs text-gray-400">{p.position} · {p.schools?.name}</div></div>
                </Link>
              ))}
            </div>
      )}
      {tab === "qna" && (
        myQna.length === 0
          ? <div className="card p-10 text-center text-gray-400">등록한 질문이 없습니다</div>
          : <div className="space-y-2.5">
              {myQna.map(q => (
                <div key={q.id} className="card overflow-hidden">
                  <div className="p-4">
                    <div className="flex gap-2 items-center mb-2">
                      <span className="badge-navy text-[10px]">{q.schools?.name}</span>
                      <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString("ko")}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                  </div>
                  {q.answer
                    ? <div className="px-4 pb-4 pt-3 bg-blue-50 border-t border-blue-100"><p className="text-xs font-bold text-navy mb-1">공식 답변</p><p className="text-sm text-gray-700">{q.answer}</p></div>
                    : <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">답변 대기 중</div>}
                </div>
              ))}
            </div>
      )}
    </div>
  );
}