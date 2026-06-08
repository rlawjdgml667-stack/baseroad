import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import FacilityBadge from "../../components/school/FacilityBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Modal from "../../components/ui/Modal";
import PlayerCard from "../../components/player/PlayerCard";
import { Heart, MapPin, Phone, Mail, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

function extractYtId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function SchoolDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [school, setSchool] = useState(null);
  const [players, setPlayers] = useState([]);
  const [qna, setQna] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [qaModal, setQaModal] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [imgIdx, setImgIdx] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("schools").select("*").eq("id", id).single(),
      supabase.from("players").select("*, schools(name)").eq("school_id", id).eq("status","active"),
      supabase.from("qna").select("*, profiles(name)").eq("school_id", id).order("created_at",{ascending:false}),
    ]).then(([s, p, q]) => {
      setSchool(s.data); setPlayers(p.data||[]); setQna(q.data||[]); setLoading(false);
    });
    if (user) {
      supabase.from("favorites").select("id").eq("user_id", user.id).eq("target_type","school").eq("target_id", id).single()
        .then(({ data }) => setIsFav(!!data));
    }
  }, [id, user]);

  async function toggleFav() {
    if (!user) { toast.error("로그인이 필요합니다"); return; }
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_type","school").eq("target_id", id);
      setIsFav(false); toast.success("관심 학교에서 제거됐습니다");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, target_type:"school", target_id: id });
      setIsFav(true); toast.success("관심 학교에 추가됐습니다");
    }
  }

  async function submitQ() {
    if (!question.trim()) return;
    setSending(true);
    await supabase.from("qna").insert({ user_id: user.id, school_id: id, question });
    const { data } = await supabase.from("qna").select("*, profiles(name)").eq("school_id", id).order("created_at",{ascending:false});
    setQna(data||[]);
    setQuestion(""); setQaModal(false); setSending(false);
    toast.success("질문이 등록되었습니다");
  }

  if (loading) return <LoadingSpinner />;
  if (!school) return <div className="text-center py-20 text-gray-400">학교를 찾을 수 없습니다</div>;

  const ytId = extractYtId(school.youtube_url);
  const facilities = [
    { label:"전용 야구장", value: school.has_stadium },
    { label:"실내 연습장", value: school.has_indoor },
    { label:"웨이트 시설", value: school.has_weight },
    { label:"기숙사", value: school.has_dormitory },
    { label:"불펜 마운드("+( school.bullpen_count||0)+"개)", value: !!school.bullpen_count },
    { label:"피칭머신", value: school.has_pitching_machine },
    { label:"트레이너 상주", value: school.has_trainer },
  ];
  const facImgs = Array.isArray(school.facility_images) ? school.facility_images : [];
  const coaches = Array.isArray(school.coaches) ? school.coaches : [];
  const notablePlayers = Array.isArray(school.notable_players) ? school.notable_players : [];
  const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };

  return (
    <div className="space-y-4">
      <Link to="/schools" className="inline-flex items-center gap-1 text-sm font-bold text-navy/70 hover:text-navy"><ChevronLeft size={16}/>학교 목록</Link>
      <div className="card">
        <div className="relative h-48 bg-navy overflow-hidden">
          {school.main_image_url
            ? <img src={school.main_image_url} className="w-full h-full object-contain opacity-80" alt={school.name} />
            : <div className="w-full h-full flex items-center justify-center text-7xl opacity-10">⚾</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4 text-white">
            <span className="badge-gold text-xs mr-1.5">{levelLabel[school.level]||school.level}</span>
            <h1 className="text-xl font-extrabold mt-1">{school.name}</h1>
            <div className="flex items-center gap-1 text-white/70 text-xs mt-1"><MapPin size={10}/>{school.region}</div>
          </div>
          <button onClick={toggleFav} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition">
            <Heart size={18} fill={isFav?"#f43f5e":"none"} className={isFav?"text-red-400":"text-white"} />
          </button>
        </div>
        <div className="p-4">
          <div className="flex gap-4 text-sm mb-3">
            {school.founded_year && <div><div className="text-xs text-gray-400">창단</div><div className="font-bold text-navy">{school.founded_year}년</div></div>}
            {school.monthly_fee && <div><div className="text-xs text-gray-400">월 회비</div><div className="font-bold text-gold-500">{school.monthly_fee}</div></div>}
            {school.director_name && <div><div className="text-xs text-gray-400">감독</div><div className="font-bold">{school.director_name}</div></div>}
          </div>
          <div className="flex gap-3 text-xs">
            {school.contact_phone && <a href={"tel:"+school.contact_phone} className="flex items-center gap-1 text-navy font-semibold hover:underline"><Phone size={12}/>{school.contact_phone}</a>}
            {school.contact_email && <a href={"mailto:"+school.contact_email} className="flex items-center gap-1 text-navy font-semibold hover:underline"><Mail size={12}/>{school.contact_email}</a>}
          </div>
        </div>
      </div>

      {school.history && (
        <div className="card p-4">
          <h2 className="section-title">학교 소개</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{school.history}</p>
        </div>
      )}

      <div className="card p-4">
        <h2 className="section-title">시설 현황</h2>
        <div className="flex flex-wrap gap-2 mb-4">{facilities.map(f => <FacilityBadge key={f.label} label={f.label} value={f.value}/>)}</div>
        {facImgs.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {facImgs.map((img, i) => (
              <img key={i} src={img} alt={"시설 "+(i+1)} onClick={() => setImgIdx(i)}
                className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition" />
            ))}
          </div>
        )}
      </div>

      {(school.director_name || coaches.length > 0) && (
        <div className="card p-4">
          <h2 className="section-title">코칭스태프</h2>
          <div className="space-y-3">
            {school.director_name && (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                  {school.director_photo_url ? <img src={school.director_photo_url} className="w-full h-full object-cover" alt={school.director_name} /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-navy/20">{school.director_name[0]}</div>}
                </div>
                <div><div className="font-extrabold text-sm">{school.director_name}</div><div className="text-xs text-gray-400">감독</div></div>
              </div>
            )}
            {coaches.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                  {c.photo_url ? <img src={c.photo_url} className="w-full h-full object-cover" alt={c.name} /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-navy/20">{c.name?.[0]}</div>}
                </div>
                <div>
                  <div className="font-extrabold text-sm">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.role || "코치"}</div>
                  {c.career && <div className="text-xs text-gray-500 mt-0.5">{c.career}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notablePlayers.length > 0 && (
        <div className="card p-4">
          <h2 className="section-title">주요 배출 선수</h2>
          <div className="space-y-2">
            {notablePlayers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-navy text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i+1}</span>
                <span className="font-bold">{p.name}</span>
                <span className="text-gray-400">{p.position}</span>
                <span className="text-gray-500 text-xs ml-auto">{p.current_team}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ytId && (
        <div className="card overflow-hidden">
          <div className="p-4 pb-2"><h2 className="section-title">팀 영상</h2></div>
          <div className="aspect-video">
            <iframe src={"https://www.youtube.com/embed/"+ytId} className="w-full h-full" allowFullScreen title="팀 영상" />
          </div>
        </div>
      )}

      {players.length > 0 && (
        <div>
          <h2 className="section-title">소속 선수 ({players.length}명)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{players.map(p => <PlayerCard key={p.id} player={p}/>)}</div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">진학 Q&A</h2>
          {user && profile?.role === "parent" && (
            <button onClick={() => setQaModal(true)} className="btn-primary text-xs py-1.5 px-3">질문하기</button>
          )}
        </div>
        <div className="space-y-2.5">
          {qna.length === 0 && <div className="card p-6 text-center text-gray-400 text-sm">아직 질문이 없습니다</div>}
          {qna.map(q => (
            <div key={q.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex gap-2 items-center mb-2">
                  <span className="badge-navy text-[10px]">질문</span>
                  <span className="text-xs text-gray-400">{q.profiles?.name||"익명"} · {new Date(q.created_at).toLocaleDateString("ko")}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">{q.question}</p>
              </div>
              {q.answer ? (
                <div className="px-4 pb-4 pt-3 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-bold text-navy">{school.name} 공식 답변</span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(q.updated_at).toLocaleDateString("ko")}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{q.answer}</p>
                </div>
              ) : (
                <div className="px-4 pb-3 pt-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">학교 측 답변 대기 중</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={qaModal} onClose={() => setQaModal(false)} title="진학 질문 등록">
        <div className="space-y-3">
          <div>
            <label className="label">질문 내용</label>
            <textarea className="input min-h-[100px] resize-none" value={question} onChange={e => setQuestion(e.target.value)} placeholder="궁금한 점을 자세히 적어주세요." />
          </div>
          <button className="btn-primary w-full" onClick={submitQ} disabled={sending || !question.trim()}>
            {sending ? "등록 중..." : "질문 등록"}
          </button>
        </div>
      </Modal>

      {imgIdx !== null && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={() => setImgIdx(null)}>
          <img src={facImgs[imgIdx]} alt="시설" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}