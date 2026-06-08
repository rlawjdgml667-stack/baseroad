import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LogOut, Settings, Camera, Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, profile, fetchProfile } = useAuth();
  const { signOut } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleSignOut() {
    await signOut();
    toast.success("로그아웃됐습니다");
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
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    await fetchProfile(user.id);
    toast.success("프로필 사진이 변경됐습니다!");
    setUploadingPhoto(false);
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    await supabase.from("profiles").update({ name: nameInput.trim() }).eq("id", user.id);
    await fetchProfile(user.id);
    setEditingName(false);
    toast.success("이름이 변경됐습니다!");
  }

  if (!user) return (
    <div className="card p-10 text-center space-y-3">
      <div className="text-5xl">👤</div>
      <p className="text-gray-500">로그인이 필요합니다</p>
      <Link to="/login" className="btn-primary inline-block">로그인</Link>
    </div>
  );

  const roleLabel = { admin:"관리자", coach:"감독·코치", player:"선수", parent:"학부모" };
  const roleBg = { admin:"bg-red-100 text-red-700", coach:"bg-orange-100 text-orange-700", player:"bg-green-100 text-green-700", parent:"bg-blue-100 text-blue-700" };
  const dashLink = { admin:"/dashboard/admin", coach:"/dashboard/coach", player:"/dashboard/player", parent:"/dashboard/parent" };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* 프로필 카드 */}
      <div className="card p-6">
        {/* 프로필 사진 */}
        <div className="flex flex-col items-center gap-3 mb-5">
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

          {/* 이름 */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                className="input text-center font-extrabold text-lg py-1"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveName()}
                autoFocus
              />
              <button onClick={saveName} className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600">
                <Check size={14}/>
              </button>
              <button onClick={() => setEditingName(false)} className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300">
                <X size={14}/>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl">{profile?.name || "이름 없음"}</span>
              <button onClick={() => { setNameInput(profile?.name || ""); setEditingName(true); }}
                className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-200">
                <Pencil size={11}/>
              </button>
            </div>
          )}

          {/* 역할 / 상태 뱃지 */}
          <div className="flex items-center gap-1.5">
            <span className={"text-xs font-bold px-2.5 py-1 rounded-full " + (roleBg[profile?.role] || "bg-gray-100 text-gray-600")}>
              {roleLabel[profile?.role] || profile?.role}
            </span>
            {profile?.status === "pending" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">승인 대기</span>}
            {profile?.status === "active" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">활성</span>}
            {profile?.status === "suspended" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">정지</span>}
          </div>

          <div className="text-xs text-gray-400">{user.email}</div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="card divide-y divide-gray-100">
        {dashLink[profile?.role] && (
          <Link to={dashLink[profile?.role]} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition">
            <Settings size={18} className="text-navy"/>
            <span className="font-semibold text-sm">내 대시보드</span>
            <span className="ml-auto text-gray-300">›</span>
          </Link>
        )}
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition text-left">
          <LogOut size={18} className="text-red-400"/>
          <span className="font-semibold text-sm text-red-500">로그아웃</span>
        </button>
      </div>
    </div>
  );
}
