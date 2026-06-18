import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LogOut, Settings, Camera, Pencil, Check, X, Heart, Lock, Eye, EyeOff, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, profile, fetchProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [tab, setTab] = useState("info");
  const [favSchools, setFavSchools] = useState([]);
  const [favPlayers, setFavPlayers] = useState([]);
  const [favLoading, setFavLoading] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // 비밀번호 변경
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // 선수 공개 여부 (선수 계정만)
  const [playerStatus, setPlayerStatus] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // 계정 삭제
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (tab === "favorites" && user) loadFavorites();
    if (tab === "posts" && user) loadMyPosts();
  }, [tab, user]);

  async function loadMyPosts() {
    setPostsLoading(true);
    const [{ data: communityPosts }, { data: qnaPosts }] = await Promise.all([
      supabase.from("posts").select("id,title,category,view_count,created_at,school_id").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("qna").select("id,title,category,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    const all = [
      ...(communityPosts || []).map(p => ({ ...p, _type: "community" })),
      ...(qnaPosts || []).map(p => ({ ...p, _type: "qna", view_count: 0 })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setMyPosts(all);
    setPostsLoading(false);
  }

  // 선수이면 현재 status 로드
  useEffect(() => {
    if (profile?.role === "player" && user) {
      supabase.from("players").select("status").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data) setPlayerStatus(data.status); });
    }
  }, [profile, user]);

  async function loadFavorites() {
    setFavLoading(true);
    const [fs, fp] = await Promise.all([
      supabase.from("favorites").select("target_id").eq("user_id", user.id).eq("target_type", "school"),
      supabase.from("favorites").select("target_id").eq("user_id", user.id).eq("target_type", "player"),
    ]);
    const sIds = (fs.data||[]).map(f => f.target_id);
    const pIds = (fp.data||[]).map(f => f.target_id);
    const [schools, players] = await Promise.all([
      sIds.length > 0 ? supabase.from("schools").select("id,name,level,region").in("id", sIds) : { data: [] },
      pIds.length > 0 ? supabase.from("players").select("id,name,position,profile_image_url,schools(name)").in("id", pIds) : { data: [] },
    ]);
    setFavSchools(schools.data||[]);
    setFavPlayers(players.data||[]);
    setFavLoading(false);
  }

  async function removeFav(targetId, type) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", targetId).eq("target_type", type);
    if (type === "school") setFavSchools(prev => prev.filter(s => s.id !== targetId));
    else setFavPlayers(prev => prev.filter(p => p.id !== targetId));
    toast.success("관심 목록에서 제거됐습니다");
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("20MB 이하 이미지만 가능합니다"); return; }
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("player-images").upload(path, file, { upsert: true });
    if (error) { toast.error("업로드 실패"); setUploadingPhoto(false); return; }
    const { data } = supabase.storage.from("player-images").getPublicUrl(path);
    // 캐시 버스팅을 위해 타임스탬프 추가
    const avatarUrl = data.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    await fetchProfile(user.id);
    toast.success("프로필 사진이 변경됐습니다!");
    setUploadingPhoto(false);
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    const { error } = await supabase.from("profiles").update({ name: nameInput.trim() }).eq("id", user.id);
    if (error) { toast.error("이름 변경 실패"); return; }
    await fetchProfile(user.id);
    setEditingName(false);
    toast.success("이름이 변경됐습니다!");
  }

  async function changePassword() {
    if (!pwNew || pwNew.length < 6) { toast.error("비밀번호는 6자 이상이어야 합니다"); return; }
    if (pwNew !== pwConfirm) { toast.error("새 비밀번호가 일치하지 않습니다"); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    setSavingPw(false);
    if (error) { toast.error("비밀번호 변경에 실패했습니다. 다시 시도해주세요"); return; }
    toast.success("비밀번호가 변경됐습니다!");
    setShowPwForm(false);
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
  }

  async function togglePlayerVisibility() {
    if (!playerStatus) return;
    setTogglingStatus(true);
    const newStatus = playerStatus === "active" ? "inactive" : "active";
    const { error } = await supabase.from("players").update({ status: newStatus }).eq("user_id", user.id);
    if (error) { toast.error("상태 변경 실패"); }
    else {
      setPlayerStatus(newStatus);
      toast.success(newStatus === "active" ? "프로필이 공개됐습니다" : "프로필이 비공개됐습니다");
    }
    setTogglingStatus(false);
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    // 소프트 삭제: profiles 상태를 deleted_request로, 선수이면 inactive
    await supabase.from("profiles").update({ status: "deleted_request" }).eq("id", user.id);
    if (profile?.role === "player") {
      await supabase.from("players").update({ status: "inactive" }).eq("user_id", user.id);
    }
    await signOut();
    toast.success("계정 삭제 요청이 접수됐습니다. 7일 이내 처리됩니다.");
    navigate("/");
  }

  if (!user) return (
    <div className="card p-10 text-center space-y-3">
      <div className="text-5xl">👤</div>
      <p className="text-gray-500">로그인이 필요합니다</p>
      <Link to="/login" className="btn-primary inline-block">로그인</Link>
    </div>
  );

  const roleLabel = { admin:"관리자", coach:"감독·코치", player:"선수", parent:"학부모", general:"일반 회원" };
  const roleBg = { admin:"bg-red-100 text-red-700", coach:"bg-orange-100 text-orange-700", player:"bg-green-100 text-green-700", parent:"bg-blue-100 text-blue-700", general:"bg-gray-100 text-gray-600" };
  const dashLink = { admin:"/dashboard/admin", coach:"/dashboard/coach", player:"/dashboard/player", parent:"/dashboard/parent" };
  const levelLabel = { little:"리틀", elementary:"초등", middle:"중등", high:"고등", college:"대학" };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* 프로필 카드 */}
      <div className="card p-6">
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-navy/10 flex items-center justify-center border-4 border-white shadow-md">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile?.name}/>
                : <span className="text-3xl font-extrabold text-navy/30">{profile?.name?.[0] || "?"}</span>}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-navy/80 transition shadow">
              {uploadingPhoto ? <span className="text-[10px]">...</span> : <Camera size={14}/>}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto}/>
            </label>
          </div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input className="input text-center font-extrabold text-lg py-1" value={nameInput}
                onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveName()} autoFocus />
              <button onClick={saveName} className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600"><Check size={14}/></button>
              <button onClick={() => setEditingName(false)} className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300"><X size={14}/></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl">{profile?.name || "이름 없음"}</span>
              <button onClick={() => { setNameInput(profile?.name || ""); setEditingName(true); }}
                className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-200"><Pencil size={11}/></button>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className={"text-xs font-bold px-2.5 py-1 rounded-full " + (roleBg[profile?.role] || "bg-gray-100 text-gray-600")}>
              {roleLabel[profile?.role] || profile?.role}
            </span>
            {profile?.status === "pending" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">승인 대기</span>}
            {profile?.status === "active" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">활성</span>}
          </div>
          <div className="text-xs text-gray-400">{user.email}</div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 border-t border-gray-100 pt-4">
          {[["info","내 정보"],["favorites","관심 목록 ❤️"],["posts","내 글 💬"]].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={"flex-1 py-2 text-xs font-bold rounded-lg transition " + (tab===t ? "bg-navy text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 내 정보 탭 */}
      {tab === "info" && (
        <div className="space-y-3">
          <div className="card divide-y divide-gray-100">
            {dashLink[profile?.role] && (
              <Link to={dashLink[profile?.role]} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition">
                <Settings size={18} className="text-navy"/>
                <span className="font-semibold text-sm">내 대시보드</span>
                <span className="ml-auto text-gray-300">›</span>
              </Link>
            )}

            {/* 비밀번호 변경 */}
            <div>
              <button onClick={() => setShowPwForm(v => !v)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left">
                <Lock size={18} className="text-navy"/>
                <span className="font-semibold text-sm">비밀번호 변경</span>
                <span className="ml-auto text-gray-300">{showPwForm ? "∧" : "›"}</span>
              </button>
              {showPwForm && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} className="input pr-10" placeholder="새 비밀번호 (6자 이상)"
                      value={pwNew} onChange={e => setPwNew(e.target.value)} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                  <input type={showPw ? "text" : "password"} className="input" placeholder="새 비밀번호 확인"
                    value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
                  <button onClick={changePassword} disabled={savingPw}
                    className="w-full py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 transition disabled:opacity-50">
                    {savingPw ? "변경 중..." : "비밀번호 변경"}
                  </button>
                </div>
              )}
            </div>

            {/* 선수 프로필 공개/비공개 토글 */}
            {profile?.role === "player" && playerStatus !== null && (
              <button onClick={togglePlayerVisibility} disabled={togglingStatus}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left">
                {playerStatus === "active"
                  ? <ToggleRight size={20} className="text-green-500"/>
                  : <ToggleLeft size={20} className="text-gray-400"/>}
                <div className="flex-1">
                  <span className="font-semibold text-sm block">프로필 공개 설정</span>
                  <span className="text-xs text-gray-400">{playerStatus === "active" ? "현재 공개 중 · 눌러서 비공개" : "현재 비공개 · 눌러서 공개"}</span>
                </div>
                <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + (playerStatus === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {playerStatus === "active" ? "공개" : "비공개"}
                </span>
              </button>
            )}

            <button onClick={async () => { await signOut(); toast.success("로그아웃됐습니다"); }}
              className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition text-left">
              <LogOut size={18} className="text-red-400"/>
              <span className="font-semibold text-sm text-red-500">로그아웃</span>
            </button>
          </div>

          {/* 계정 삭제 */}
          <div className="card divide-y divide-gray-100">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition text-left">
                <Trash2 size={18} className="text-red-300"/>
                <span className="font-semibold text-sm text-red-400">계정 삭제</span>
              </button>
            ) : (
              <div className="p-4 space-y-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-sm font-bold text-red-600 mb-1">⚠️ 계정을 삭제하시겠습니까?</p>
                  <p className="text-xs text-red-400">삭제 요청 후 7일 이내 처리됩니다. 선수 프로필은 즉시 비공개 처리됩니다.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition">
                    취소
                  </button>
                  <button onClick={deleteAccount} disabled={deletingAccount}
                    className="flex-1 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition disabled:opacity-50">
                    {deletingAccount ? "처리 중..." : "삭제 요청"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 관심 목록 탭 */}
      {tab === "favorites" && (
        <div className="space-y-4">
          {favLoading && <div className="card p-6 text-center text-gray-400 text-sm">불러오는 중...</div>}

          {/* 관심 학교 */}
          <div>
            <h3 className="text-sm font-extrabold text-navy mb-2">🏫 관심 학교 ({favSchools.length})</h3>
            {favSchools.length === 0
              ? <div className="card p-4 text-center text-gray-400 text-xs">관심 학교가 없습니다</div>
              : <div className="space-y-2">
                {favSchools.map(s => (
                  <div key={s.id} className="card p-3 flex items-center gap-3">
                    <Link to={`/schools/${s.id}`} className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{s.name}</div>
                      <div className="text-xs text-gray-400">{levelLabel[s.level]||s.level} · {s.region}</div>
                    </Link>
                    <button onClick={() => removeFav(s.id, "school")} className="text-red-400 hover:text-red-600">
                      <Heart size={16} fill="#f87171"/>
                    </button>
                  </div>
                ))}
              </div>
            }
          </div>

          {/* 관심 선수 */}
          <div>
            <h3 className="text-sm font-extrabold text-navy mb-2">⚾ 관심 선수 ({favPlayers.length})</h3>
            {favPlayers.length === 0
              ? <div className="card p-4 text-center text-gray-400 text-xs">관심 선수가 없습니다</div>
              : <div className="space-y-2">
                {favPlayers.map(p => (
                  <div key={p.id} className="card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                      {p.profile_image_url
                        ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p.name}/>
                        : <div className="w-full h-full flex items-center justify-center font-bold text-navy/30">{p.name?.[0]}</div>}
                    </div>
                    <Link to={`/players/${p.id}`} className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.position} {p.schools?.name ? `· ${p.schools.name}` : ""}</div>
                    </Link>
                    <button onClick={() => removeFav(p.id, "player")} className="text-red-400 hover:text-red-600">
                      <Heart size={16} fill="#f87171"/>
                    </button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* 내 글 탭 */}
      {tab === "posts" && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-navy">💬 내가 쓴 글 ({myPosts.length})</h3>
          {postsLoading && <div className="card p-6 text-center text-gray-400 text-sm">불러오는 중...</div>}
          {!postsLoading && myPosts.length === 0 && (
            <div className="card p-8 text-center text-gray-400">
              <p className="text-sm">아직 작성한 글이 없어요</p>
              <Link to="/community/write" className="text-navy font-bold text-xs mt-2 inline-block hover:underline">첫 글 쓰러 가기 →</Link>
            </div>
          )}
          {myPosts.map(post => (
            <Link key={post._type+post.id} to={post._type === "qna" ? "/qa" : "/community/"+post.id} className="card p-3 block hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-1">
                {post._type === "qna" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">Q&A</span>}
                {post.school_id && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy">학교</span>}
                <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + (post.category === "공지" ? "bg-red-100 text-red-600" : post.category === "질문" ? "bg-blue-100 text-blue-600" : post.category === "정보공유" ? "bg-green-100 text-green-700" : post.category === "진학상담" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600")}>
                  {post.category}
                </span>
                <span className="font-bold text-sm truncate flex-1">{post.title}</span>
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-2">
                <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                {post._type !== "qna" && <span>· 조회 {post.view_count}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
