import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import ImageUpload from "../../components/ui/ImageUpload";
import MultiImageUpload from "../../components/ui/MultiImageUpload";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Heart, MessageCircle, CheckCircle, Clock, UserCheck, UserX } from "lucide-react";

const REGIONS = ["서울","경기","인천","대전","세종","충남","충북","광주","전남","전북","대구","경북","부산","경남","울산","강원","제주"];
const LEVELS = [{ value:"little", label:"리틀" },{ value:"elementary", label:"초등" },{ value:"middle", label:"중등" },{ value:"high", label:"고등" },{ value:"college", label:"대학" }];
const CUR_YEAR = new Date().getFullYear();
const SEASONS = Array.from({ length: 6 }, (_, i) => CUR_YEAR - i);

export default function CoachDashboard() {
  const { user, profile, fetchProfile } = useAuth();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("school");
  const [qaList, setQaList] = useState([]);
  const [answerMap, setAnswerMap] = useState({});
  const [myPlayers, setMyPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerSeasons, setPlayerSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(CUR_YEAR);
  const [stats, setStats] = useState({ favorites: 0, players: 0, qnaCount: 0 });
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [form, setForm] = useState({
    name:"", region:"서울", level:"high", address:"",
    contact_phone:"", contact_email:"", director_name:"",
    monthly_fee:"", founded_year:"", history:"", youtube_url:"",
    has_stadium:false, has_indoor:false, has_weight:false,
    has_dormitory:false, has_pitching_machine:false, has_trainer:false,
    bullpen_count:0, main_image_url:"", director_photo_url:"",
    coaches:[],
  });
  const [newCoach, setNewCoach] = useState({ name:"", role:"코치", career:"", photo_url:"" });

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
        // 소속 선수 로드
        supabase.from("players").select("id,name,position,profile_image_url,stats_verified").eq("school_id", data.id).eq("status","active").then(({ data: pd }) => setMyPlayers(pd||[]));
        // 연결 요청 로드
        supabase.from("school_connection_requests")
          .select("*, players(id,name,position,birth_year,profile_image_url)")
          .eq("school_id", data.id).eq("status","pending")
          .order("created_at",{ascending:false})
          .then(({ data: cr }) => setConnectionRequests(cr||[]));
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

  async function approveConnection(req) {
    // 연결 승인: status → approved, players.school_id 업데이트
    await supabase.from("school_connection_requests").update({ status: "approved" }).eq("id", req.id);
    await supabase.from("players").update({ school_id: school.id }).eq("id", req.player_id);
    setConnectionRequests(prev => prev.filter(r => r.id !== req.id));
    setMyPlayers(prev => [...prev, { id: req.players.id, name: req.players.name, position: req.players.position, profile_image_url: req.players.profile_image_url, stats_verified: false }]);
    setStats(s => ({ ...s, players: s.players + 1 }));
    toast.success(`${req.players?.name} 선수 연결이 승인됐습니다! ✅`);
  }

  async function rejectConnection(req) {
    await supabase.from("school_connection_requests").update({ status: "rejected" }).eq("id", req.id);
    setConnectionRequests(prev => prev.filter(r => r.id !== req.id));
    toast.success("연결 요청을 거절했습니다");
  }

  async function removePlayer(playerId, playerName) {
    if (!window.confirm(`${playerName} 선수를 학교 명단에서 제거하시겠습니까?`)) return;
    await supabase.from("players").update({ school_id: null }).eq("id", playerId);
    // 연결 요청도 정리
    await supabase.from("school_connection_requests").update({ status: "removed" }).eq("player_id", playerId).eq("school_id", school.id);
    setMyPlayers(prev => prev.filter(p => p.id !== playerId));
    setStats(s => ({ ...s, players: s.players - 1 }));
    toast.success(`${playerName} 선수가 명단에서 제거됐습니다`);
  }

  async function loadPlayerSeasons(playerId) {
    const { data } = await supabase.from("player_season_stats").select("*").eq("player_id", playerId).order("season", {ascending:false});
    setPlayerSeasons(data||[]);
    if (data && data.length > 0) setSelectedSeason(data[0].season);
  }

  async function verifySeason(seasonStatId) {
    await supabase.from("player_season_stats").update({ stats_verified: true, verified_by: user.id, verified_at: new Date().toISOString() }).eq("id", seasonStatId);
    setPlayerSeasons(prev => prev.map(s => s.id === seasonStatId ? { ...s, stats_verified: true } : s));
    setMyPlayers(prev => prev.map(p => p.id === selectedPlayer?.id ? { ...p, stats_verified: true } : p));
    toast.success("인증됐습니다! ✅");
  }

  async function unverify(seasonStatId) {
    await supabase.from("player_season_stats").update({ stats_verified: false, verified_by: null, verified_at: null }).eq("id", seasonStatId);
    setPlayerSeasons(prev => prev.map(s => s.id === seasonStatId ? { ...s, stats_verified: false } : s));
    toast.success("인증이 해제됐습니다");
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
      <p className="text-gray-500 text-sm mb-4">관리자 승인 후 학교 정보를 등록하실 수 있습니다.<br/>보통 1-2 영업일 내로 처리됩니다.</p>
      <button onClick={() => fetchProfile(user.id)} className="btn-outline text-sm">
        🔄 승인 여부 확인
      </button>
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
        {[
          ["school","학교 정보"],
          ["requests", "연결 요청" + (connectionRequests.length > 0 ? ` (${connectionRequests.length})` : "")],
          ["verify","선수 인증 ("+myPlayers.filter(p=>!p.stats_verified).length+")"],
          ["qa","Q&A ("+qaList.filter(q=>!q.answer).length+")"],
        ].map(([t,l]) => (
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
            <label className="label">학교 대표 이미지</label>
            <ImageUpload bucket="school-images" path={user.id+"/main"} currentUrl={form.main_image_url} onUpload={url => set("main_image_url",url)} />
          </div>
          <div>
            <label className="label">시설 사진 (최대 8장)</label>
            <MultiImageUpload bucket="school-images" pathPrefix={user.id+"/facility"} currentUrls={Array.isArray(form.facility_images) ? form.facility_images : []} onUpdate={urls => set("facility_images", urls)} maxCount={8} />
          </div>
          <div>
            <label className="label">감독 프로필 사진</label>
            <ImageUpload bucket="school-images" path={user.id+"/director"} currentUrl={form.director_photo_url} onUpload={url => set("director_photo_url",url)} />
          </div>
          <div>
            <label className="label">코치 스태프 등록</label>
            <div className="space-y-2 mb-2">
              {(form.coaches||[]).map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-navy/10 flex-shrink-0">
                    {c.photo_url ? <img src={c.photo_url} className="w-full h-full object-cover" alt={c.name}/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-navy/30">{c.name?.[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.role} {c.career ? "· "+c.career : ""}</div>
                  </div>
                  <button onClick={() => set("coaches", form.coaches.filter((_,j) => j !== i))} className="text-xs text-red-400 font-bold hover:text-red-600">삭제</button>
                </div>
              ))}
            </div>
            <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-gray-500">코치 추가</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="input text-sm" placeholder="이름 *" value={newCoach.name} onChange={e => setNewCoach(c=>({...c,name:e.target.value}))} />
                <select className="input text-sm" value={newCoach.role} onChange={e => setNewCoach(c=>({...c,role:e.target.value}))}>
                  {["코치","배터리코치","내야코치","외야코치","타격코치","트레이너"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <input className="input text-sm" placeholder="경력 (예: 전 OO고 코치)" value={newCoach.career} onChange={e => setNewCoach(c=>({...c,career:e.target.value}))} />
              <div>
                <label className="label text-[10px]">코치 사진</label>
                <ImageUpload bucket="school-images" path={user.id+"/coach-"+Date.now()} currentUrl={newCoach.photo_url} onUpload={url => setNewCoach(c=>({...c,photo_url:url}))} />
              </div>
              <button disabled={!newCoach.name.trim()} onClick={() => { set("coaches",[...(form.coaches||[]),{...newCoach}]); setNewCoach({name:"",role:"코치",career:"",photo_url:""}); }} className="btn-outline text-xs py-1.5 w-full">코치 추가</button>
            </div>
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

      {/* ===== 연결 요청 탭 ===== */}
      {tab === "requests" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">선수가 우리 학교로 연결을 신청했습니다. 확인 후 승인 또는 거절해주세요.</p>

          {!school && (
            <div className="card p-6 text-center text-gray-400 text-sm">학교를 먼저 등록해주세요</div>
          )}

          {school && connectionRequests.length === 0 && (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-gray-400 text-sm">새로운 연결 요청이 없습니다</p>
            </div>
          )}

          {connectionRequests.map(req => {
            const p = req.players;
            return (
              <div key={req.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                    {p?.profile_image_url
                      ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p?.name}/>
                      : <div className="w-full h-full flex items-center justify-center text-lg font-extrabold text-navy/30">{p?.name?.[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold">{p?.name}</div>
                    <div className="text-xs text-gray-400">{p?.position} {p?.birth_year ? `· ${p.birth_year}년생` : ""}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      신청일: {new Date(req.created_at).toLocaleDateString("ko")}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveConnection(req)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-navy text-white font-bold text-sm py-2 rounded-xl hover:bg-navy/90 transition">
                    <UserCheck size={15}/> 승인
                  </button>
                  <button onClick={() => rejectConnection(req)}
                    className="flex-1 flex items-center justify-center gap-1.5 border-2 border-red-200 text-red-500 font-bold text-sm py-2 rounded-xl hover:bg-red-50 transition">
                    <UserX size={15}/> 거절
                  </button>
                </div>
              </div>
            );
          })}

          {/* 현재 소속 선수 목록 (제거 기능 포함) */}
          {school && myPlayers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-extrabold text-navy mb-2">현재 소속 선수 ({myPlayers.length}명)</h3>
              <div className="space-y-2">
                {myPlayers.map(p => (
                  <div key={p.id} className="card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                      {p.profile_image_url
                        ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p.name}/>
                        : <div className="w-full h-full flex items-center justify-center font-bold text-navy/30 text-sm">{p.name?.[0]}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.position}</div>
                    </div>
                    <button onClick={() => removePlayer(p.id, p.name)}
                      className="text-xs text-red-400 font-bold hover:text-red-600 border border-red-100 rounded-lg px-2 py-0.5">
                      제거
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "verify" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">소속 선수의 시즌 기록을 확인하고 인증해주세요.</p>
          {myPlayers.length === 0 && <div className="card p-8 text-center text-gray-400">소속 선수가 없습니다</div>}
          <div className="space-y-2">
            {myPlayers.map(p => (
              <div key={p.id}>
                <button onClick={() => { setSelectedPlayer(selectedPlayer?.id === p.id ? null : p); if (selectedPlayer?.id !== p.id) loadPlayerSeasons(p.id); }}
                  className={"card p-3 flex items-center gap-3 w-full text-left transition " + (selectedPlayer?.id === p.id ? "border-2 border-navy" : "")}>
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                    {p.profile_image_url ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center font-bold text-navy/30">{p.name?.[0]}</div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.position}</div>
                  </div>
                  {p.stats_verified
                    ? <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={14}/> 인증</span>
                    : <span className="flex items-center gap-1 text-xs font-bold text-orange-400"><Clock size={14}/> 미인증</span>}
                </button>

                {selectedPlayer?.id === p.id && (
                  <div className="border border-navy/20 rounded-b-xl p-3 bg-navy/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy">시즌 선택</span>
                      <select className="input text-xs py-1 flex-1" value={selectedSeason} onChange={e => setSelectedSeason(Number(e.target.value))}>
                        {SEASONS.map(y => <option key={y} value={y}>{y}년</option>)}
                      </select>
                    </div>
                    {(() => {
                      const ss = playerSeasons.find(s => s.season === selectedSeason);
                      if (!ss) return <p className="text-xs text-gray-400 text-center py-2">{selectedSeason}시즌 기록 없음</p>;
                      const c = ss.computed_stats || {};
                      const isPitcher = p.position === "투수";
                      const statEntries = isPitcher
                        ? [["방어율",c.era],["WHIP",c.whip],["탈삼진",c.k_count],["승",c.wins],["패",c.losses],["이닝",c.innings]]
                        : [["타율",c.avg],["OPS",c.ops],["홈런",c.hr],["타점",c.rbi],["출루율",c.obp],["타수",c.ab]];
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-1.5">
                            {statEntries.map(([l,v]) => (
                              <div key={l} className="bg-white rounded-lg p-2 text-center">
                                <div className="text-[10px] text-gray-400">{l}</div>
                                <div className="text-sm font-extrabold text-navy">{v ?? "-"}</div>
                              </div>
                            ))}
                          </div>
                          {ss.stats_verified
                            ? <button onClick={() => unverify(ss.id)} className="w-full text-xs text-orange-400 font-bold py-1.5 border border-orange-200 rounded-lg hover:bg-orange-50">인증 해제</button>
                            : <button onClick={() => verifySeason(ss.id)} className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-1"><CheckCircle size={14}/> 기록 인증하기</button>
                          }
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
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
