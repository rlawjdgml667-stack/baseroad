import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import FacilityBadge from "../../components/school/FacilityBadge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import PlayerCard from "../../components/player/PlayerCard";
import { Heart, MapPin, Phone, Mail, ChevronLeft, X, PenSquare, MessageCircle, Eye } from "lucide-react";
import toast from "react-hot-toast";

const CAT_COLOR = {
  공지: "bg-red-100 text-red-600",
  자유: "bg-gray-100 text-gray-600",
  질문: "bg-blue-100 text-blue-600",
  정보공유: "bg-green-100 text-green-700",
  진학상담: "bg-purple-100 text-purple-700",
};

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
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [imgIdx, setImgIdx] = useState(null);
  const [boardPosts, setBoardPosts] = useState([]);
  const [boardLoading, setBoardLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("schools").select("*").eq("id", id).single(),
      supabase.from("players").select("*, schools(name)").eq("school_id", id).eq("status","active"),
    ]).then(([s, p]) => {
      setSchool(s.data); setPlayers(p.data||[]); setLoading(false);
    });
    // 학교 게시판 글 불러오기
    supabase.from("posts")
      .select("id, title, category, view_count, created_at, user_id")
      .eq("school_id", id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        const userIds = [...new Set((data||[]).map(p=>p.user_id).filter(Boolean))];
        let profileMap = {};
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id,name,role,school_name").in("id", userIds);
          (profs||[]).forEach(p => { profileMap[p.id] = p; });
        }
        setBoardPosts((data||[]).map(p => {
          const prof = profileMap[p.user_id];
          return { ...p, author: prof?.name || "익명", role: prof?.role, school_name: prof?.school_name };
        }));
        setBoardLoading(false);
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
        <div className="relative h-72 bg-navy overflow-hidden">
          {school.main_image_url && (
            <img src={school.main_image_url} className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-40" alt="" />
          )}
          {school.main_image_url
            ? <img src={school.main_image_url} className="relative w-full h-full object-contain opacity-95" alt={school.name} />
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

      {/* 문의 안내 */}
      {(school.contact_phone || school.contact_email) && (
        <div className="card p-4">
          <h2 className="section-title">입단 문의</h2>
          <p className="text-xs text-gray-400 mb-3">아래 연락처로 직접 문의해주세요</p>
          <div className="flex flex-col gap-2">
            {school.contact_phone && (
              <a href={"tel:"+school.contact_phone} className="flex items-center gap-3 bg-navy/5 rounded-xl px-4 py-3 hover:bg-navy/10 transition">
                <Phone size={16} className="text-navy flex-shrink-0"/>
                <span className="font-bold text-navy text-sm">{school.contact_phone}</span>
              </a>
            )}
            {school.contact_email && (
              <a href={"mailto:"+school.contact_email} className="flex items-center gap-3 bg-navy/5 rounded-xl px-4 py-3 hover:bg-navy/10 transition">
                <Mail size={16} className="text-navy flex-shrink-0"/>
                <span className="font-bold text-navy text-sm">{school.contact_email}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 학교 게시판 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">💬 학교 게시판</h2>
          {user && (
            <Link
              to={`/community/write?school_id=${id}&school_name=${encodeURIComponent(school.name)}`}
              className="flex items-center gap-1 text-xs font-bold text-navy bg-navy/10 px-3 py-1.5 rounded-full hover:bg-navy/20 transition"
            >
              <PenSquare size={12}/> 글쓰기
            </Link>
          )}
        </div>
        {boardLoading && <div className="text-center py-6 text-gray-400 text-sm">불러오는 중...</div>}
        {!boardLoading && boardPosts.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">아직 게시글이 없습니다</p>
            {user
              ? <Link to={`/community/write?school_id=${id}&school_name=${encodeURIComponent(school.name)}`} className="text-navy font-bold text-xs mt-2 inline-block hover:underline">첫 글 남기기 →</Link>
              : <p className="text-xs mt-1">로그인 후 글을 남겨보세요</p>
            }
          </div>
        )}
        {!boardLoading && boardPosts.length > 0 && (
          <div className="divide-y divide-gray-100">
            {boardPosts.map(post => {
              // 이 학교 소속 감독·코치인지 확인
              const isCoach = post.role === "coach" && post.school_name === school?.name;
              return (
                <Link key={post.id} to={"/community/"+post.id} className="flex items-start gap-2 py-2.5 hover:bg-gray-50 rounded-lg px-1 transition">
                  <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 " + (CAT_COLOR[post.category]||"bg-gray-100 text-gray-500")}>{post.category}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{post.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-400">{post.author}</span>
                      {isCoach && (
                        <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                          감독·코치
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 flex items-center gap-1 mt-0.5">
                    <Eye size={10}/>{post.view_count||0}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {imgIdx !== null && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={() => setImgIdx(null)}>
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition"
            onClick={e => { e.stopPropagation(); setImgIdx(null); }}>
            <X size={20}/>
          </button>
          <img src={facImgs[imgIdx]} alt="시설" className="max-w-full max-h-[85vh] rounded-xl" onClick={e => e.stopPropagation()} />
          {facImgs.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
              {facImgs.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                  className={"w-2 h-2 rounded-full transition " + (i === imgIdx ? "bg-white" : "bg-white/40")} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}