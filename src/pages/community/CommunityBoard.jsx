import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { PenSquare, MessageCircle, Eye, ChevronRight } from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const CATEGORIES = ["전체", "공지", "자유", "질문", "정보공유", "진학상담"];
const CAT_COLOR = {
  공지: "bg-red-100 text-red-600",
  자유: "bg-gray-100 text-gray-600",
  질문: "bg-blue-100 text-blue-600",
  정보공유: "bg-green-100 text-green-700",
  진학상담: "bg-purple-100 text-purple-700",
};

export default function CommunityBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");

  useEffect(() => { loadPosts(); }, [category]);

  async function loadPosts() {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("id, title, category, view_count, created_at, user_id")
      .order("created_at", { ascending: false });
    if (category !== "전체") query = query.eq("category", category);
    const { data } = await query;
    // 댓글 수 별도 조회
    const postIds = (data || []).map(p => p.id);
    let commentCounts = {};
    if (postIds.length > 0) {
      const { data: cc } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);
      (cc || []).forEach(c => {
        commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
      });
    }
    // profiles 별도 조회
    const userIds = [...new Set((data || []).map(p => p.user_id).filter(Boolean))];
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name, role, school_name").in("id", userIds);
      (profs || []).forEach(pr => { profileMap[pr.id] = pr; });
    }
    setPosts((data || []).map(p => ({ ...p, commentCount: commentCounts[p.id] || 0, profiles: profileMap[p.user_id] || null })));
    setLoading(false);
  }

  const roleLabel = { player: "선수", parent: "학부모", coach: "감독", admin: "관리자", general: "일반 회원" };
  const roleBg = { player: "bg-green-100 text-green-700", parent: "bg-blue-100 text-blue-700", coach: "bg-orange-100 text-orange-700", admin: "bg-red-100 text-red-700", general: "bg-gray-100 text-gray-600" };

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금 전";
    if (m < 60) return m + "분 전";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "시간 전";
    const d = Math.floor(h / 24);
    if (d < 7) return d + "일 전";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">커뮤니티 💬</h1>
        {user && (
          <button onClick={() => navigate("/community/write")}
            className="flex items-center gap-1.5 bg-navy text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-navy/90 transition">
            <PenSquare size={14}/> 글쓰기
          </button>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " +
              (category === c ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
            {c}
          </button>
        ))}
      </div>

      {/* 공지사항 고정 배너 */}
      {!loading && posts.filter(p => p.category === "공지").length > 0 && (
        <div className="space-y-1">
          {posts.filter(p => p.category === "공지").map(post => (
            <Link key={post.id} to={"/community/" + post.id}
              className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 hover:bg-red-100 transition">
              <span className="text-xs font-extrabold text-red-500 flex-shrink-0">📢 공지</span>
              <span className="text-sm font-bold text-red-700 truncate">{post.title}</span>
              <span className="ml-auto text-[11px] text-red-400 flex-shrink-0">{timeAgo(post.created_at)}</span>
            </Link>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : posts.filter(p => category === "전체" ? p.category !== "공지" : true).length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <MessageCircle size={32} className="mx-auto mb-2 text-gray-200"/>
          <p className="text-sm">아직 게시글이 없어요</p>
          {user && <button onClick={() => navigate("/community/write")} className="mt-3 text-navy text-xs font-bold underline">첫 글 작성하기</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.filter(p => category === "전체" ? p.category !== "공지" : true).map(post => (
            <Link key={post.id} to={"/community/" + post.id}
              className="card p-4 block hover:shadow-md transition">
              <div className="flex items-start gap-2 mb-2">
                <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 " + (CAT_COLOR[post.category] || "bg-gray-100 text-gray-600")}>
                  {post.category}
                </span>
                <span className="font-bold text-sm text-gray-800 line-clamp-1 flex-1">{post.title}</span>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-0.5"/>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className={"font-bold px-1.5 py-0.5 rounded-full text-[10px] " + (roleBg[post.profiles?.role] || "bg-gray-100 text-gray-500")}>
                  {roleLabel[post.profiles?.role] || ""}
                </span>
                <span className="font-semibold text-gray-500">{post.profiles?.name || "익명"}</span>
                {post.profiles?.school_name && <span className="text-gray-400">· {post.profiles.school_name}{post.profiles?.role === "parent" && <span className="text-gray-300 text-[9px] ml-0.5">(본인입력)</span>}</span>}
                <span>·</span>
                <span>{timeAgo(post.created_at)}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><Eye size={11}/>{post.view_count}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle size={11}/>{post.commentCount}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!user && (
        <div className="card p-4 text-center text-sm text-gray-400">
          <Link to="/login" className="text-navy font-bold hover:underline">로그인</Link>하면 글을 작성할 수 있어요
        </div>
      )}
    </div>
  );
}
