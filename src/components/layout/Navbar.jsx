import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Menu, X, LogIn } from "lucide-react";
import { useState } from "react";
import NotificationBell from "../ui/NotificationBell";

export default function Navbar() {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-navy text-white shadow-lg">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
          <span className="text-gold text-2xl">⚾</span>
          <span>베이스로드</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <Link to="/schools" className={pathname.startsWith("/schools")?"text-gold":"hover:text-gold/80 transition"}>학교 정보</Link>
          <Link to="/players" className={pathname.startsWith("/players")?"text-gold":"hover:text-gold/80 transition"}>선수 프로필</Link>
          {user
            ? <>
                <NotificationBell />
                <Link to="/profile" className="btn-gold text-xs py-1.5 px-3 rounded-lg">{profile?.name || "내 정보"}</Link>
              </>
            : <Link to="/login" className="flex items-center gap-1 hover:text-gold/80 transition"><LogIn size={14}/>로그인</Link>
          }
        </div>
        <div className="md:hidden flex items-center gap-2">
          {user && <NotificationBell />}
          <button onClick={() => setOpen(o=>!o)}>
            {open ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden bg-navy-800 border-t border-white/10">
          {[["학교 정보","/schools"],["선수 프로필","/players"],["내 정보","/profile"]].map(([l,t]) => (
            <Link key={t} to={t} onClick={() => setOpen(false)} className="block px-6 py-3 text-sm font-semibold hover:bg-white/10 transition">{l}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
