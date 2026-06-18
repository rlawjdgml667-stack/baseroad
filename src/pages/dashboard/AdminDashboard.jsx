import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

const LEVEL_LABEL = { little:"리틀", elementary:"초등", middle:"중등", high:"고등", college:"대학" };
const POSITION_LIST = ["투수","포수","내야수","외야수"];
const REGION_LIST = ["서울","경기","인천","대전","세종","충남","충북","광주","전남","전북","대구","경북","부산","경남","울산","강원","제주"];
const ROLE_LABEL = { parent:"학부모", player:"선수", coach:"감독·코치", admin:"관리자", general:"일반 회원" };

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("stats");
  const [pendingCoaches, setPendingCoaches] = useState([]);
  const [schools, setSchools] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [posts, setPosts] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [designateMap, setDesignateMap] = useState({}); // coach id → 담당자 지정 여부
  // 문의 관리
  const [inquiries, setInquiries] = useState([]);
  const [inquiryFilter, setInquiryFilter] = useState("전체");
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*").eq("role","coach").eq("status","pending"),
      supabase.from("schools").select("id,name,region,level,status,created_at"),
      supabase.from("players").select("id,name,position,status,created_at,schools(name)"),
      supabase.from("profiles").select("*").order("created_at",{ascending:false}),
      supabase.from("posts").select("*, profiles(name)").order("created_at",{ascending:false}),
      supabase.from("inquiries").select("*").order("created_at",{ascending:false}),
    ]).then(([c,s,p,pr,qna,inq]) => {
      setPendingCoaches(c.data||[]);
      setSchools(s.data||[]);
      setPlayers(p.data||[]);
      setAllProfiles(pr.data||[]);
      setPosts(qna.data||[]);
      setInquiries(inq.data||[]);
      setLoading(false);
    });
  }, []);

  async function markRead(inq) {
    if (inq.is_read) return;
    await supabase.from("inquiries").update({ is_read: true }).eq("id", inq.id);
    setInquiries(prev => prev.map(i => i.id === inq.id ? { ...i, is_read: true } : i));
    if (selectedInquiry?.id === inq.id) setSelectedInquiry(i => ({ ...i, is_read: true }));
  }

  async function saveReply() {
    if (!replyText.trim() || !selectedInquiry) return;
    setReplySaving(true);
    await supabase.from("inquiries").update({ admin_reply: replyText.trim(), is_read: true }).eq("id", selectedInquiry.id);
    setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? { ...i, admin_reply: replyText.trim(), is_read: true } : i));
    setSelectedInquiry(i => ({ ...i, admin_reply: replyText.trim(), is_read: true }));
    setReplySaving(false);
    toast.success("답변이 저장됐습니다");
  }

  async function approveCoach(coach) {
    // 1. 코치 계정 승인
    await supabase.from("profiles").update({ status:"active" }).eq("id", coach.id);

    // 2. 담당자 지정 체크된 경우 → 해당 학교 coach_user_id 교체
    if (designateMap[coach.id] && coach.school_name) {
      const { data: matchedSchool } = await supabase
        .from("schools").select("id,name").ilike("name", coach.school_name).maybeSingle();
      if (matchedSchool) {
        await supabase.from("schools").update({ coach_user_id: coach.id }).eq("id", matchedSchool.id);
        toast.success(`${coach.name} 승인 + ${matchedSchool.name} 담당자로 지정됐습니다 🏫`);
      } else {
        toast.success(`${coach.name} 승인됐습니다 (일치하는 학교 없음 — 새 학교 등록 가능)`);
      }
    } else {
      toast.success("감독·코치가 승인됐습니다");
    }

    setPendingCoaches(prev => prev.filter(c => c.id !== coach.id));
    setDesignateMap(prev => { const n = {...prev}; delete n[coach.id]; return n; });
  }

  async function rejectCoach(id) {
    await supabase.from("profiles").update({ status:"rejected" }).eq("id", id);
    setPendingCoaches(prev => prev.filter(c => c.id !== id));
    toast.success("반려됐습니다");
  }

  async function deleteSchool(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("schools").delete().eq("id",id);
    if (error) { toast.error("삭제 실패"); return; }
    setSchools(prev => prev.filter(s => s.id !== id));
    toast.success("학교가 삭제됐습니다");
  }

  async function deletePlayer(id) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("players").delete().eq("id",id);
    if (error) { toast.error("삭제 실패"); return; }
    setPlayers(prev => prev.filter(p => p.id !== id));
    toast.success("선수가 삭제됐습니다");
  }

  async function deletePost(id) {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    setPosts(prev => prev.filter(p => p.id !== id));
    toast.success("게시글이 삭제됐습니다");
  }

  async function changeRole(id, role) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p));
    toast.success("역할이 변경됐습니다");
  }

  async function toggleMemberStatus(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", id);
    setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    toast.success(newStatus === "suspended" ? "계정이 정지됐습니다" : "계정이 활성화됐습니다");
  }

  if (loading) return <LoadingSpinner />;

  // 통계 계산
  const roleCount = { parent:0, player:0, coach:0, admin:0, general:0 };
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

  const unreadCount = inquiries.filter(i => !i.is_read).length;
  const filteredInquiries = inquiries.filter(i => {
    if (inquiryFilter === "읽지 않음") return !i.is_read;
    if (inquiryFilter === "감독·코치") return i.role === "감독·코치";
    if (inquiryFilter === "선수") return i.role === "선수";
    if (inquiryFilter === "학부모") return i.role === "학부모";
    return true;
  });

  const tabs = [
    ["stats","통계"],
    ["pending","승인 대기 ("+pendingCoaches.length+")"],
    ["schools","학교 관리 ("+schools.length+")"],
    ["players","선수 관리 ("+players.length+")"],
    ["community","커뮤니티 관리"],
    ["members","회원 관리"],
    ["inquiries", unreadCount > 0 ? `문의 관리 🔴${unreadCount}` : "문의 관리"],
  ];

  const filteredMembers = allProfiles.filter(p =>
    !memberSearch || p.name?.includes(memberSearch) || p.email?.includes(memberSearch)
  );

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
            <div className="grid grid-cols-5 gap-2 text-center">
              {[["학부모",roleCount.parent,"bg-blue-100 text-blue-700"],["선수",roleCount.player,"bg-green-100 text-green-700"],["감독·코치",roleCount.coach,"bg-orange-100 text-orange-700"],["관리자",roleCount.admin,"bg-red-100 text-red-700"],["일반 회원",roleCount.general,"bg-gray-100 text-gray-600"]].map(([label,count,cls]) => (
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
            <div key={c.id} className="card p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center flex-shrink-0 text-base font-extrabold text-navy/40">
                  {c.name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-sm">{c.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{c.email}</div>
                  {c.school_name
                    ? <div className="text-xs text-navy font-bold mt-1">🏫 {c.school_name} 감독·코치</div>
                    : <div className="text-xs text-gray-400 mt-1">🏫 학교명 미입력</div>}
                  {c.phone && <div className="text-xs text-gray-500 mt-0.5">📞 {c.phone}</div>}
                  <div className="text-xs text-gray-300 mt-0.5">가입일: {new Date(c.created_at).toLocaleDateString("ko")}</div>
                </div>
              </div>
              {/* 담당자 지정 옵션 (학교명 입력한 경우만 표시) */}
              {c.school_name && (
                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
                  <input
                    type="checkbox"
                    checked={!!designateMap[c.id]}
                    onChange={e => setDesignateMap(prev => ({ ...prev, [c.id]: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <div>
                    <div className="text-xs font-extrabold text-amber-700">🏫 {c.school_name} 담당자로 지정</div>
                    <div className="text-[10px] text-amber-600">체크 시 기존 담당자 권한이 이 계정으로 이전됩니다</div>
                  </div>
                </label>
              )}
              <div className="flex gap-2">
                <button onClick={() => approveCoach(c)} className="btn-primary text-xs py-1.5 flex-1">✅ 승인</button>
                <button onClick={() => rejectCoach(c.id)} className="bg-red-50 text-red-500 font-bold text-xs py-1.5 px-4 rounded-lg border border-red-100 hover:bg-red-100 transition">반려</button>
              </div>
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

      {tab === "community" && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">커뮤니티 게시글을 관리합니다. 부적절한 글을 삭제할 수 있습니다.</p>
          {posts.length === 0 && <div className="card p-8 text-center text-gray-400">게시글이 없습니다</div>}
          {posts.map(post => (
            <div key={post.id} className="card p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {post.category && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{post.category}</span>}
                  <span className="text-xs text-gray-400">{post.profiles?.name||"익명"}</span>
                  <span className="text-xs text-gray-300">{new Date(post.created_at).toLocaleDateString("ko")}</span>
                </div>
                <p className="text-sm font-semibold truncate">{post.title}</p>
                {post.content && <p className="text-xs text-gray-400 truncate mt-0.5">{post.content}</p>}
              </div>
              <button onClick={() => deletePost(post.id)} className="text-xs text-red-400 font-bold hover:text-red-600 flex-shrink-0">삭제</button>
            </div>
          ))}
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-3">
          <input className="input" placeholder="이름 또는 이메일 검색..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
          <p className="text-xs text-gray-400">총 {filteredMembers.length}명</p>
          <div className="space-y-2">
            {filteredMembers.map(m => (
              <div key={m.id} className="card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy/40 flex-shrink-0">
                    {m.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm">{m.name}</span>
                      <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded-full " + (m.status==="suspended" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700")}>{m.status==="suspended"?"정지":"활성"}</span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">{m.email}</div>
                  </div>
                  <span className={"text-[10px] font-bold px-2 py-1 rounded-full " + (m.role==="admin"?"bg-red-100 text-red-700":m.role==="coach"?"bg-orange-100 text-orange-700":m.role==="player"?"bg-green-100 text-green-700":m.role==="general"?"bg-gray-100 text-gray-600":"bg-blue-100 text-blue-700")}>
                    {ROLE_LABEL[m.role]||m.role}
                  </span>
                </div>
                {m.role !== "admin" && (
                  <div className="flex gap-2">
                    <select className="input text-xs py-1 flex-1" value={m.role} onChange={e => changeRole(m.id, e.target.value)}>
                      <option value="parent">학부모</option>
                      <option value="player">선수</option>
                      <option value="coach">감독·코치</option>
                      <option value="general">일반 회원</option>
                      <option value="admin">관리자</option>
                    </select>
                    <button onClick={() => toggleMemberStatus(m.id, m.status)}
                      className={"text-xs font-bold px-3 py-1 rounded-lg border transition " + (m.status==="suspended" ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-500 border-red-200")}>
                      {m.status==="suspended" ? "활성화" : "정지"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 문의 관리 탭 ===== */}
      {tab === "inquiries" && (
        <div className="space-y-3">
          {/* 상단 통계 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3 text-center">
              <div className="text-2xl font-extrabold text-navy">{inquiries.length}</div>
              <div className="text-xs text-gray-400">전체 문의</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-extrabold text-red-500">{unreadCount}</div>
              <div className="text-xs text-gray-400">읽지 않은 문의</div>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["전체","읽지 않음","감독·코치","선수","학부모"].map(f => (
              <button key={f} onClick={() => setInquiryFilter(f)}
                className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " +
                  (inquiryFilter === f ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                {f}
              </button>
            ))}
          </div>

          {selectedInquiry ? (
            // 상세 보기
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => { setSelectedInquiry(null); setReplyText(""); }}
                  className="text-xs font-bold text-navy/70 hover:text-navy">← 목록으로</button>
                {!selectedInquiry.is_read && (
                  <button onClick={() => markRead(selectedInquiry)}
                    className="text-xs font-bold bg-green-50 text-green-600 border border-green-200 px-3 py-1 rounded-lg hover:bg-green-100 transition">
                    읽음 처리
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-navy text-base">{selectedInquiry.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:"#1a2744",color:"#c8901a"}}>{selectedInquiry.role}</span>
                  {!selectedInquiry.is_read && <span className="text-[10px] font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">미확인</span>}
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div>📞 {selectedInquiry.contact}</div>
                  {selectedInquiry.organization && <div>🏫 {selectedInquiry.organization}</div>}
                  <div>🕐 {new Date(selectedInquiry.created_at).toLocaleString("ko-KR")}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedInquiry.content}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">관리자 답변</label>
                <textarea
                  className="input min-h-[100px] resize-none text-sm"
                  placeholder="답변을 입력하세요..."
                  value={replyText || selectedInquiry.admin_reply || ""}
                  onChange={e => setReplyText(e.target.value)}
                />
                <button onClick={saveReply} disabled={replySaving}
                  className="mt-2 w-full py-2.5 font-bold text-sm rounded-xl transition disabled:opacity-50"
                  style={{background:"#1a2744",color:"#c8901a"}}>
                  {replySaving ? "저장 중..." : "답변 저장"}
                </button>
              </div>
            </div>
          ) : (
            // 목록
            <div className="space-y-2">
              {filteredInquiries.length === 0 && (
                <div className="card p-10 text-center text-gray-400 text-sm">문의가 없습니다</div>
              )}
              {filteredInquiries.map(inq => (
                <button key={inq.id} onClick={() => { setSelectedInquiry(inq); setReplyText(inq.admin_reply || ""); markRead(inq); }}
                  className={"card p-3 w-full text-left hover:shadow-md transition " + (!inq.is_read ? "border-l-4 border-red-400" : "")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-navy">{inq.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:"#1a2744",color:"#c8901a"}}>{inq.role}</span>
                    {!inq.is_read && <span className="text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full ml-auto">미확인</span>}
                    {inq.admin_reply && <span className="text-[10px] font-bold bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full ml-auto">답변완료</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{inq.content}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{new Date(inq.created_at).toLocaleDateString("ko-KR")}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
