import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { ChevronLeft, Trash2, Send } from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

const CAT_COLOR = {
  자유: "bg-gray-100 text-gray-600",
  질문: "bg-blue-100 text-blue-600",
  정보공유: "bg-green-100 text-green-700",
  진학상담: "bg-purple-100 text-purple-700",
};
const roleLabel = { player: "선수", parent: "학부모", coach: "감독", admin: "관리자" };
const roleBg = { player: "bg-green-100 text-green-700", parent: "bg-blue-100 text-blue-700", coach: "bg-orange-100 text-orange-700", admin: "bg-red-100 text-red-700" };

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

export default function CommunityDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadPost(); }, [id]);

  async function loadPost() {
    // 조회수 증가 (실패해도 무시)
    supabase.from("posts").select("view_count").eq("id", id).single().then(({ data }) => {
      if (data) supabase.from("posts").update({ view_count: (data.view_count || 0) + 1 }).eq("id", id);
    });

    const [{ data: p, error: pe }, { data: c }] = await Promise.all([
      supabase.from("posts").select("*, profiles!posts_user_id_fkey(name, role)").eq("id", id).single(),
      supabase.from("comments").select("*, profiles!comments_user_id_fkey(name, role)").eq("post_id", id).order("created_at", { ascending: true }),
    ]);

    // join 실패시 fallback
    if (pe || !p) {
      const { data: p2 } = await supabase.from("posts").select("*").eq("id", id).single();
      if (p2) {
        const { data: prof } = await supabase.from("profiles").select("name, role").eq("id", p2.user_id).single();
        setPost({ ...p2, profiles: prof });
      }
    } else {
      setPost(p);
    }

    // 댓글 profiles fallback
    const commentsWithProfiles = await Promise.all((c || []).map(async (cm) => {
      if (cm.profiles) return cm;
      const { data: prof } = await supabase.from("profiles").select("name, role").eq("id", cm.user_id).single();
      return { ...cm, profiles: prof };
    }));
    setComments(commentsWithProfiles);
    setLoading(false);
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    if (!user) { toast.error("로그인이 필요합니다"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from("comments").insert({
      post_id: id,
      user_id: user.id,
      content: commentText.trim(),
    }).select("id, post_id, user_id, content, created_at").single();
    setSubmitting(false);
    if (error) { toast.error("댓글 작성 실패: " + error.message); return; }
    const { data: prof } = await supabase.from("profiles").select("name, role").eq("id", user.id).single();
    setComments(prev => [...prev, { ...data, profiles: prof }]);
    setCommentText("");
  }

  async function deletePost() {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    await supabase.from("posts").delete().eq("id", id);
    toast.success("삭제됐습니다");
    navigate("/community");
  }

  async function deleteComment(cid) {
    await supabase.from("comments").delete().eq("id", cid);
    setComments(prev => prev.filter(c => c.id !== cid));
    toast.success("댓글이 삭제됐습니다");
  }

  if (loading) return <LoadingSpinner />;
  if (!post) return <div className="text-center py-20 text-gray-400">게시글을 찾을 수 없습니다</div>;

  const isOwner = user?.id === post.user_id;
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link to="/community" className="text-navy/60 hover:text-navy">
          <ChevronLeft size={20}/>
        </Link>
        <h1 className="text-sm font-bold text-gray-400">커뮤니티</h1>
      </div>

      {/* 게시글 */}
      <div className="card p-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 " + (CAT_COLOR[post.category] || "bg-gray-100 text-gray-600")}>
            {post.category}
          </span>
          <h2 className="font-extrabold text-base text-gray-800 flex-1">{post.title}</h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 pb-3 border-b border-gray-100">
          <span className={"font-bold px-1.5 py-0.5 rounded-full text-[10px] " + (roleBg[post.profiles?.role] || "bg-gray-100 text-gray-500")}>
            {roleLabel[post.profiles?.role] || ""}
          </span>
          <span className="font-semibold text-gray-500">{post.profiles?.name || "익명"}</span>
          <span>·</span>
          <span>{timeAgo(post.created_at)}</span>
          {(isOwner || isAdmin) && (
            <button onClick={deletePost} className="ml-auto text-red-400 hover:text-red-600 flex items-center gap-1">
              <Trash2 size={12}/> 삭제
            </button>
          )}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-2">
        <h3 className="text-sm font-extrabold text-navy">댓글 {comments.length}개</h3>
        {comments.length === 0 ? (
          <div className="card p-6 text-center text-gray-400 text-xs">첫 댓글을 남겨보세요!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="card p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className={"font-bold px-1.5 py-0.5 rounded-full text-[10px] " + (roleBg[c.profiles?.role] || "bg-gray-100 text-gray-500")}>
                  {roleLabel[c.profiles?.role] || ""}
                </span>
                <span className="text-xs font-bold text-gray-700">{c.profiles?.name || "익명"}</span>
                <span className="text-[11px] text-gray-400">{timeAgo(c.created_at)}</span>
                {(user?.id === c.user_id || isAdmin) && (
                  <button onClick={() => deleteComment(c.id)} className="ml-auto text-red-300 hover:text-red-500">
                    <Trash2 size={12}/>
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line pl-1">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {/* 댓글 입력 */}
      {user ? (
        <div className="card p-3">
          <div className="flex gap-2">
            <textarea
              className="input flex-1 min-h-[72px] resize-none text-sm"
              placeholder="댓글을 입력해주세요..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) submitComment(); }}
              maxLength={500}
            />
            <button onClick={submitComment} disabled={submitting || !commentText.trim()}
              className="flex-shrink-0 w-10 bg-navy text-white rounded-xl flex items-center justify-center hover:bg-navy/90 transition disabled:opacity-40">
              <Send size={16}/>
            </button>
          </div>
          <div className="text-right text-xs text-gray-300 mt-1">Ctrl+Enter로 등록 · {commentText.length}/500</div>
        </div>
      ) : (
        <div className="card p-4 text-center text-sm text-gray-400">
          <Link to="/login" className="text-navy font-bold hover:underline">로그인</Link>하면 댓글을 달 수 있어요
        </div>
      )}
    </div>
  );
}
