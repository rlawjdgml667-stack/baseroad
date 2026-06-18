import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Heart, Check, Minus } from "lucide-react";
import toast from "react-hot-toast";

const FACILITIES = [
  ["has_stadium","전용 야구장"],["has_indoor","실내 연습장"],["has_weight","웨이트 시설"],
  ["has_dormitory","기숙사"],["has_pitching_machine","피칭머신"],["has_trainer","트레이너 상주"],
];

export default function ParentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [favSchools, setFavSchools] = useState([]);
  const [favPlayers, setFavPlayers] = useState([]);
  const [tab, setTab] = useState("schools");
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [childSchool, setChildSchool] = useState("");
  const [schoolSaving, setSchoolSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("favorites").select("target_id").eq("user_id",user.id).eq("target_type","school"),
      supabase.from("favorites").select("target_id").eq("user_id",user.id).eq("target_type","player"),
    ]).then(async ([fs, fp]) => {
      const sIds = (fs.data||[]).map(f => f.target_id);
      const pIds = (fp.data||[]).map(f => f.target_id);
      const [sRes, pRes] = await Promise.all([
        sIds.length ? supabase.from("schools").select("*").in("id",sIds) : { data:[] },
        pIds.length ? supabase.from("players").select("id,name,position,profile_image_url,school_id,schools(name)").in("id",pIds) : { data:[] },
      ]);
      setFavSchools(sRes.data||[]);
      setFavPlayers(pRes.data||[]);
      // 자녀 소속 학교 로드
      const { data: prof } = await supabase.from("profiles").select("school_name").eq("id", user.id).single();
      if (prof?.school_name) setChildSchool(prof.school_name);
      setLoading(false);
    });
  }, [user]);

  async function saveChildSchool() {
    setSchoolSaving(true);
    await supabase.from("profiles").update({ school_name: childSchool.trim() || null }).eq("id", user.id);
    setSchoolSaving(false);
    toast.success("저장됐습니다");
  }

  function toggleCompare(id) {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  }

  if (loading) return <LoadingSpinner />;

  const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };
  const tabs = [
    ["schools","관심 학교 ("+favSchools.length+")"],
    ["players","관심 선수 ("+favPlayers.length+")"],
  ];

  const compareSchools = favSchools.filter(s => compareIds.includes(s.id));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">학부모 대시보드</h1>

      {/* 자녀 소속 학교 */}
      <div className="card p-4 space-y-2">
        <div className="text-sm font-extrabold text-navy">자녀 소속 학교</div>
        <p className="text-xs text-gray-400">커뮤니티 글 작성 시 이름 옆에 표시됩니다.</p>
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="예: 서울중앙고등학교"
            value={childSchool}
            onChange={e => setChildSchool(e.target.value)}
          />
          <button onClick={saveChildSchool} disabled={schoolSaving} className="btn-primary text-sm px-4 flex-shrink-0">
            {schoolSaving ? "저장 중..." : "저장"}
          </button>
        </div>
        <p className="text-[10px] text-gray-400">※ 본인이 직접 입력한 정보입니다 (미인증)</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="card p-3">
          <div className="text-2xl font-extrabold text-red-400">{favSchools.length}</div>
          <div className="text-xs text-gray-500">관심 학교</div>
        </div>
        <div className="card p-3">
          <div className="text-2xl font-extrabold text-gold">{favPlayers.length}</div>
          <div className="text-xs text-gray-500">관심 선수</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} className={"flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>{l}</button>
        ))}
      </div>

      {tab === "schools" && (
        <div className="space-y-3">
          {favSchools.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              관심 학교가 없습니다<br/>
              <Link to="/schools" className="text-navy font-bold text-sm mt-2 inline-block">학교 목록 보기 →</Link>
            </div>
          ) : (
            <>
              {/* 비교 모드 토글 */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">관심 학교를 비교해볼 수 있습니다</p>
                <button onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}
                  className={"text-xs font-bold px-3 py-1.5 rounded-full border transition " + (compareMode ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                  {compareMode ? "비교 취소" : "학교 비교 ⚖️"}
                </button>
              </div>

              {compareMode && compareIds.length > 0 && (
                <div className="text-xs text-navy font-bold">{compareIds.length}개 선택됨 (최대 3개)</div>
              )}

              <div className="space-y-2.5">
                {favSchools.map(s => (
                  <div key={s.id} className={"card flex gap-3 p-3 items-center transition " + (compareMode && compareIds.includes(s.id) ? "border-2 border-navy" : "")}>
                    {compareMode && (
                      <button onClick={() => toggleCompare(s.id)}
                        className={"w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition " + (compareIds.includes(s.id) ? "bg-navy border-navy" : "border-gray-300")}>
                        {compareIds.includes(s.id) && <Check size={12} className="text-white"/>}
                      </button>
                    )}
                    <Link to={"/schools/"+s.id} className="flex gap-3 items-center flex-1 hover:opacity-80 transition">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-navy/10 flex-shrink-0">
                        {s.main_image_url ? <img src={s.main_image_url} className="w-full h-full object-cover" alt={s.name}/> : <div className="w-full h-full flex items-center justify-center text-2xl">🏫</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="badge-navy text-[10px] mr-1">{levelLabel[s.level]}</span>
                        <div className="font-extrabold text-sm truncate">{s.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{s.region} · {s.monthly_fee || "회비 미등록"}</div>
                      </div>
                    </Link>
                    <Heart size={14} fill="#f43f5e" className="text-red-400 flex-shrink-0" />
                  </div>
                ))}
              </div>

              {/* 비교 테이블 */}
              {compareMode && compareSchools.length >= 2 && (
                <div className="card overflow-hidden mt-2">
                  <div className="bg-navy px-4 py-2">
                    <span className="text-white text-xs font-extrabold">비교 결과</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <td className="p-2 text-gray-400 font-bold w-20">항목</td>
                          {compareSchools.map(s => <td key={s.id} className="p-2 font-extrabold text-navy text-center">{s.name}</td>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["지역", s => s.region||"-"],
                          ["구분", s => levelLabel[s.level]||"-"],
                          ["감독", s => s.director_name||"-"],
                          ["월 회비", s => s.monthly_fee||"-"],
                          ["창단연도", s => s.founded_year ? s.founded_year+"년" : "-"],
                        ].map(([label, getter]) => (
                          <tr key={label} className="border-b border-gray-50 even:bg-gray-50/50">
                            <td className="p-2 text-gray-500 font-bold">{label}</td>
                            {compareSchools.map(s => <td key={s.id} className="p-2 text-center text-gray-700">{getter(s)}</td>)}
                          </tr>
                        ))}
                        {FACILITIES.map(([key, label]) => (
                          <tr key={key} className="border-b border-gray-50 even:bg-gray-50/50">
                            <td className="p-2 text-gray-500 font-bold">{label}</td>
                            {compareSchools.map(s => (
                              <td key={s.id} className="p-2 text-center">
                                {s[key] ? <Check size={13} className="text-green-500 mx-auto"/> : <Minus size={13} className="text-gray-300 mx-auto"/>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 flex gap-2">
                    {compareSchools.map(s => (
                      <Link key={s.id} to={"/schools/"+s.id} className="flex-1 btn-outline text-xs py-2 text-center">{s.name}</Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
                  <Heart size={14} fill="#f43f5e" className="text-red-400 ml-auto" />
                </Link>
              ))}
            </div>
      )}

    </div>
  );
}
