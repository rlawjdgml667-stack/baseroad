import { Link, useLocation } from "react-router-dom";
import { Home, School, Users, MessageCircle, User } from "lucide-react";

const navItems = [
  { to:"/", icon:Home, label:"홈" },
  { to:"/schools", icon:School, label:"학교" },
  { to:"/players", icon:Users, label:"선수" },
  { to:"/qa", icon:MessageCircle, label:"Q&A" },
  { to:"/profile", icon:User, label:"내정보" },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const cls = "flex-1 flex flex-col items-center py-2 text-[10px] font-bold transition " + (active ? "text-navy" : "text-gray-400 hover:text-gray-600");
          return (
            <Link key={to} to={to} className={cls}>
              <Icon size={20} className="mb-0.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}