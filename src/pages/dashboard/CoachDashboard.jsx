import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import ImageUpload from "../../components/ui/ImageUpload";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Eye, Heart, MessageCircle } from "lucide-react";

const REGIONS = ["서울","경기","인천","강원","충청","전라","경상","제주"];
const LEVELS = [{ value:"elementary", label:"초등" },{ value:"middle", label:"중등" },{ value:"high", label:"고등" },{ value:"college", label:"대학" }];

export default function CoachDashboard() {
  const { user, profile } = useAuth();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("school");
  const [qaList, setQaList] = useState([]);
  const [answerMap, setAnswerMap] = useState({});
  const [stats, setStats] = useState({ favorites: 0, players: 0, qnaCount: 0 });
  const [form, setForm] = useState({
    name:"", region:"서울", level:"high", address:"",
    contact_phone:"", contact_email:"", director_name:"",
    monthly_fee:"", founded_year:"", history:"", youtube_url:"",
    has_stadium:false, has_indoor:false, has_weight:false,
    has_dormitory:false, has_pitching_machine:false, has_trainer:false,
    bullpen_count:0, main_image_url:"",
  });

  useEffect(() => {
    if (profile?.status === "pending") { setLoading(false); return; }
    supabase.from("schools").select("*").eq("coach_user_id", user.id).single().then(({ data }) => {
      if (data) {
        setSchool(data);
        setForm(f => ({ ...f, ...data }));
        // 학교 통계 로드
        Promise.all([
          supabase.from("favorites").select("id", {count:"exact",head:true}).eq("target_id",data.id).eq("target_type","school"),
          supabase.from("players").select("id", {count:"exact",head:true}).eq("school_id",data.id),
          supabase.from("qna").select("id", {count:"exact",head:true}).eq("school_id",data.id),
        ]).then(([fav, pl, qna]) => {
          setStats({ favorites: fav.count||0, players: pl.count||0, qnaCount: qna.count||0 });
        });
        // Q&A 로드
        supabase.from("qna").select("*").eq("school_id", data.id).order("created_at",{ascending:false}).then(({ data: qd }) => setQaList(qd||[]));
      }
      setLoading(false);
    });
  }, [user, profile]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function saveSchool() {
    setSaving(true);
    const payload = { ...form, coach_user_id: user.id };
    if (school) {
      const { error } = await supabase.from("schools").update(payload).eq("id", school.id);
      if (error) toast.error("저장 실패: " + error.message);
      else toast.success("학교 정보가 저장됐습니다");
    } else {
      const { data, error } = await supabase.from("schools").insert({ ...payload, status:"active" }).select().single();
      if (error) toast.error("등록 실패: " + error.message);
      else { setSchool(data); toast.success("학교가 등록됐습니다!"); }
    }
    setSaving(false);
  }

  async function submitAnswer(qid) {
    const ans = answerMap[qid];
    if (!ans?.trim()) return;
    await supabase.from("qna").update({ answer: ans }).eq("id", qid);
    setQaList(prev => prev.map(q => q.id === qid ? { ...q, answer: ans } : q));
    toast.success("답변이 등록됐습니다");
  }

  if (loading) return <LoadingSpinner />;

  if (profile?.status === "pending") return (
    <div className="card p-8 text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h2 className="text-xl font-extrabold text-navy mb-2">승인 대기 중</h2>
      <p className="text-gray-500 text-sm">관리자 승인 후 학교 정보를 등록하실 수 있습니다.<br/>보통 1-2 영업일 내로 처리됩니다.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">감독·코치 대시보드</h1>

      {/* 학교 통계 (학교 등록된 경우) */}
      {school && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <Heart size={16} className="text-red-400 mx-auto mb-1"/>
            <div className="text-xl font-extrabold text-navy">{stats.favorites}</div>
            <div className="text-[10px] text-gray-500">관심 등록</div>
          </div>
          <div className="card p-3 text-center">
            <span className="text-base block mb-1">⚾</span>
            <div className="text-xl font-extrabold text-gold">{stats.players}</div>
            <div className="text-[10px] text-gray-500">등록 선수</div>
          </div>
          <div className="card p-3 text-center">
            <MessageCircle size={16} className="text-blue-400 mx-auto mb-1"/>
            <div className="text-xl font-extrabold text-blue-600">{stats.qnaCount}</div>
            <div className="text-[10px] text-gray-500">질문 수</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["school","학교 정보"],["qa","Q&A 답변 ("+qaList.filter(q=>!q.answer).length+")"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} className={"flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>{l}</button>
        ))}
      </div>

      {tab === "school" && (
        <div className="card p-4 space-y-4">
          <h2 className="section-title">학교 정보 {school ? "수정" : "등록"}</h2>
          <div><label className="label">학교명 *</label><input className="input" value={form.name} onChange={e => set("name",e.target.value)} placeholder="○○중학교 야구부" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">지역</label><select className="input" value={form.region} onChange={e => set("region",e.target.value)}>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label className="label">구분</label><select className="input" value={form.level} onChange={e => set("level",e.target.value)}>{LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
          </div>
          <div><label className="label">주소</label><input className="input" value={form.address||""} onChange={e => set("address",e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">연락처</label><input className="input" value={form.contact_phone||""} onChange={e => set("contact_phone",e.target.value)} /></div>
            <div><label className="label">이메일</label><input className="input" value={form.contact_email||""} onChange={e => set("contact_email",e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">감독 이름</label><input className="input" value={form.director_name||""} onChange={e => set("director_name",e.target.value)} /></div>
            <div><label className="label">창단연도</label><input className="input" type="number" value={form.founded_year||""} onChange={e => set("founded_year",e.target.value)} /></div>
          </div>
          <div><label className="label">월 회비</label><input className="input" value={form.monthly_fee||""} onChange={e => set("monthly_fee",e.target.value)} placeholder="예: 15만원" /></div>
          <div><label className="label">학교 소개</label><textarea className="input min-h-[80px] resize-none" value={form.history||""} onChange={e => set("history",e.target.value)} /></div>
          <div><label className="label">유튜브 URL</label><input className="input" value={form.youtube_url||""} onChange={e => set("youtube_url",e.target.value)} placeholder="https://youtube.com/..." /></div>
          <div>
            <label className="label">대표 이미지</label>
            <ImageUpload bucket="school-images" path={user.id+"/main"} currentUrl={form.main_image_url} onUpload={url => set("main_image_url",url)} />
          </div>
          <div>
            <label className="label">시설 현황</label>
            <div className="grid grid-cols-2 gap-2">
              {[["has_stadium","전용 야구장"],["has_indoor","실내 연습장"],["has_weight","웨이트 시설"],["has_dormitory","기숙사"],["has_pitching_machine","피칭머신"],["has_trainer","트레이너 상주"]].map(([k,l]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k,e.target.checked)} className="w-4 h-4 accent-navy" />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>
            <div className="mt-2"><label className="label">불펜 마운드 수</label><input className="input w-24" type="number" min={0} value={form.bullpen_count||0} onChange={e => set("bullpen_count",Number(e.target.value))} /></div>
          </div>
          <button onClick={saveSchool} disabled={saving||!form.name} className="btn-primary w-full">
            {saving ? "저장 중..." : school ? "학교 정보 저장" : "학교 등록"}
          </button>
        </div>
      )}

      {tab === "qa" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">학부모가 우리 학교에 등록한 질문입니다.</p>
          {qaList.length === 0 && <div className="card p-8 text-center text-gray-400">아직 질문이 없습니다</div>}
          {qaList.map(q => (
            <div key={q.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex gap-2 mb-2">
                  <span className={"badge-" + (q.answer ? "green" : "gray") + " text-[10px]"}>{q.answer ? "답변완료" : "미답변"}</span>
                  <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString("ko")}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">{q.question}</p>
              </div>
              {q.answer ? (
                <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                  <p className="text-xs font-bold text-navy mb-1">내 답변</p>
                  <p className="text-sm text-gray-700">{q.answer}</p>
                </div>
              ) : (
                <div className="px-4 pb-4 pt-3 bg-gray-50 border-t border-gray-100 space-y-2">
                  <textarea className="input min-h-[70px] resize-none text-sm" placeholder="답변을 입력하세요..." value={answerMap[q.id]||""} onChange={e => setAnswerMap(m => ({...m,[q.id]:e.target.value}))} />
                  <button className="btn-primary text-sm py-1.5 px-4" onClick={() => submitAnswer(q.id)}>답변 등록</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
