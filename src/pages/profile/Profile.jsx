import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    toast.success("로그아웃됐습니다");
  }

  if (!user) return (
    <div className="card p-10 text-center space-y-3">
      <div className="text-5xl">👤</div>
      <p className="text-gray-500">로그인이 필요합니다</p>
      <Link to="/login" className="btn-primary inline-block">로그인</Link>
    </div>
  );

  const roleLabel = { admin:"관리자", coach:"감독·코치", player:"선수", parent:"학부모" };
  const dashLink = { admin:"/dashboard/admin", coach:"/dashboard/coach", player:"/dashboard/player", parent:"/dashboard/parent" };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-navy/50" />
          </div>
          <div>
            <div className="font-extrabold text-lg">{profile?.name || user.email}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="badge-navy text-xs">{roleLabel[profile?.role] || profile?.role}</span>
              {profile?.status === "pending" && <span className="badge-gold text-xs">승인 대기</span>}
              {profile?.status === "active" && <span className="badge-green text-xs">활성</span>}
            </div>
            <div className="text-xs text-gray-400 mt-1">{user.email}</div>
          </div>
        </div>
      </div>
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