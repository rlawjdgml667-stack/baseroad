import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import ImageUpload from "../../components/ui/ImageUpload";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

const POSITIONS = ["투수","포수","내야수","외야수"];
const HANDS = ["우투우타","우투좌타","좌투좌타","좌투우타","스위치"];

const STAT_FIELDS = {
  "투수": [["pitch_type","구종"],["max_speed","최고구속(km/h)"],["avg_speed","평균구속"],["era","평균자책"],["wins","승"],["losses","패"],["saves","세이브"],["innings","이닝"],["k_count","탈삼진"],["whip","WHIP"]],
  "포수": [["avg","타율"],["ops","OPS"],["rbi","타점"],["pop_time","팝타임(초)"],["cs_rate","도루저지율"]],
  "내야수": [["avg","타율"],["ops","OPS"],["hr","홈런"],["rbi","타점"],["sb","도루"],["fielding_pct","수비율"]],
  "외야수": [["avg","타율"],["ops","OPS"],["hr","홈런"],["rbi","타점"],["sb","도루"],["arm_strength","어깨 구속(km/h)"]],
};

export default function PlayerDashboard() {
  const { user, profile } = useAuth();
  const [playerData, setPlayerData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", birth_year:"", position:"투수", dominant_hand:"우투우타", school_id:"", intro:"", height:"", weight:"", highlight_url:"", profile_image_url:"" });
  const [stats, setStats] = useState({});

  useEffect(() => {
    Promise.all([
      supabase.from("players").select("*").eq("user_id", user.id).single(),
      supabase.from("schools").select("id, name, level").eq("status","active"),
    ]).then(([p, s]) => {
      if (p.data) { setPlayerData(p.data); setForm(f=>({...f,...p.data})); setStats(p.data.stats||{}); }
      setSchools(s.data||[]);
      setLoading(false);
    });
  }, [user]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setStat = (k,v) => setStats(s=>({...s,[k]:v}));

  async function save() {
    setSaving(true);
    const payload = { ...form, stats, user_id: user.id, status: "active" };
    if (playerData) {
      const { error } = await supabase.from("players").update(payload).eq("id", playerData.id);
      if (error) toast.error(error.message); else toast.success("프로필이 저장됐습니다");
    } else {
      const { data, error } = await supabase.from("players").insert(payload).select().single();
      if (error) toast.error(error.message); else { setPlayerData(data); toast.success("프로필이 등록됐습니다!"); }
    }
    setSaving(false);
  }

  if (loading) return <LoadingSpinner />;

  const statFields = STAT_FIELDS[form.position] || [];
  const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">선수 프로필 관리</h1>
      <div className="card p-4 space-y-4">
        <div>
          <label className="label">프로필 사진</label>
          <ImageUpload bucket="player-images" path={`${user.id}/profile`} currentUrl={form.profile_image_url} onUpload={url => set("profile_image_url",url)} />
        </div>
        <div><label className="label">이름 *</label><input className="input" value={form.name||""} onChange={e => set("name",e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">출생연도</label><input className="input" type="number" placeholder="2009" value={form.birth_year||""} onChange={e => set("birth_year",e.target.value)} /></div>
          <div>
            <label className="label">포지션</label>
            <select className="input" value={form.position} onChange={e => set("position",e.target.value)}>
              {POSITIONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">키(cm)</label><input className="input" type="number" value={form.height||""} onChange={e => set("height",e.target.value)} /></div>
          <div><label className="label">몸무게(kg)</label><input className="input" type="number" value={form.weight||""} onChange={e => set("weight",e.target.value)} /></div>
        </div>
        <div>
          <label className="label">투타</label>
          <select className="input" value={form.dominant_hand||"우투우타"} onChange={e => set("dominant_hand",e.target.value)}>
            {HANDS.map(h => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="label">소속 학교</label>
          <select className="input" value={form.school_id||""} onChange={e => set("school_id",e.target.value)}>
            <option value="">학교를 선택하세요</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({levelLabel[s.level]||s.level})</option>)}
          </select>
        </div>
        <div><label className="label">자기 소개</label><textarea className="input min-h-[80px] resize-none" value={form.intro||""} onChange={e => set("intro",e.target.value)} placeholder="선수 소개, 강점 등을 적어주세요" /></div>
        <div><label className="label">하이라이트 영상 URL (YouTube)</label><input className="input" value={form.highlight_url||""} onChange={e => set("highlight_url",e.target.value)} placeholder="https://youtube.com/..." /></div>
        {statFields.length > 0 && (
          <div>
            <label className="label">포지션별 스탯 ({form.position})</label>
            <div className="grid grid-cols-2 gap-2">
              {statFields.map(([k,l]) => (
                <div key={k}><label className="label text-[10px]">{l}</label><input className="input text-sm" value={stats[k]||""} onChange={e => setStat(k,e.target.value)} /></div>
              ))}
            </div>
          </div>
        )}
        <button onClick={save} disabled={saving||!form.name} className="btn-primary w-full">
          {saving ? "저장 중..." : playerData ? "프로필 저장" : "프로필 등록"}
        </button>
      </div>
    </div>
  );
}