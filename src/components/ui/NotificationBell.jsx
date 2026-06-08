import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    // 실시간 구독
    const channel = supabase
      .channel("notifications:" + user.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
  }

  async function markRead(notif) {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    setOpen(false);
    if (notif.link) navigate(notif.link);
  }

  async function markAllRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  if (!user) return null;

  const typeIcon = {
    stats_submitted: "📊",
    stats_verified: "✅",
    connection_requested: "🔗",
    connection_approved: "🎉",
    connection_rejected: "❌",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-extrabold text-navy text-sm">알림</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-navy font-semibold">
                모두 읽음
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">알림이 없습니다</div>
            )}
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={"w-full text-left px-4 py-3 hover:bg-gray-50 transition flex gap-3 " + (!n.is_read ? "bg-blue-50/60" : "")}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className={"text-xs leading-snug " + (!n.is_read ? "font-bold text-gray-800" : "text-gray-600")}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(n.created_at).toLocaleDateString("ko", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
                {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"/>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
