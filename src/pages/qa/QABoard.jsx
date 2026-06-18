import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORIES = ["전체","진학상담","훈련방법","장비·용품","자유게시판"];
const CAT_COLOR = {
  "진학상담": "bg-blue-100 text-blue-700",
  "훈련방법": "bg-green-100 text-green-700",
  "장비·용품": "bg-orange-100 text-orange-700",
  "자유게시판": "bg-gray-100 text-gray-600",
};

export default function QABoard() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title:"", content:"", category:"진학상담" });
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [replies, setReplies] = useState({});
  const [replyText, setReplyText] = useState({});
  const [replyLoading, setReplyLoading] = useState({});

  useEffect(() => { loadPosts(); }, []);

  async function loadPosts() {
    const { data } = await supabase
      .from("qna")
      .select("*, profiles(name, role, school_name)")
      .order("created_at", { ascending: false });
    setPosts(data||[]);
    setLoading(false);
  }

  async function loadReplies(postId) {
    const { data } = await supabase
      .from("qna_replies")
      .select("*, profiles(name, role, school_name)")
      .eq("qna_id", postId)
      .order("created_at", { ascending: true });
    setReplies(prev => ({ ...prev, [postId]: data||[] }));
  }

  function toggleExpand(id) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      loadReplies(id);
    }
  }

  async function submitPost() {
    if (!form.title.trim() || !form.content.trim()) { toast.error("제목과 내용을 입력해주세요"); return; }
    setSending(true);
    const { error } = await supabase.from("qna").insert({
      user_id: user.id,
      title: form.title,
      question: form.content,
      category: form.category,
    });
    if (error) { toast.error("등록 실패: " + error.message); }
    else {
      toast.success("게시글이 등록됐습니다");
      setModal(false);
      setForm({ title:"", content:"", category:"진학상담" });
      loadPosts();
    }
    setSending(false);
  }

  async function submitReply(postId) {
    const text = replyText[postId];
    if (!text?.trim()) return;
    setReplyLoading(prev => ({ ...prev, [postId]: true }));
    const { error } = await supabase.from("qna_replies").insert({
      qna_id: postId,
      user_id: user.id,
      content: text,
    });
    if (error) { toast.error("댓글 등록 실패"); }
    else {
      setReplyText(prev => ({ ...prev, [postId]: "" }));
      loadReplies(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: (p.reply_count||0)+1 } : p));
    }
    setReplyLoading(prev => ({ ...prev, [postId]: false }));
  }

  async function deletePost(id) {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("qna").delete().eq("id", id);
    setPosts(prev => prev.filter(p => p.id !== id));
    if (expanded === id) setExpanded(null);
    toast.success("삭제됐습니다");
  }

  async function deleteReply(replyId, postId) {
    await supabase.from("qna_replies").delete().eq("id", replyId);
    loadReplies(postId);
  }

  const filtered = category === "전체" ? posts : posts.filter(p => p.category === category);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">커뮤니티</h1>
        {user && (
          <button onClick={() => setModal(true)} className="btn-primary text-sm py-2 px-4">글 작성</button>
        )}
      </div>
      <p className="text-xs text-gray-400">진학 정보, 훈련 팁, 장비 추천 등 야구 관련 이야기를 자유롭게 나눠보세요.</p>

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition " + (category===c ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy")}>
            {c}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-400">총 {filtered.length}개 게시글</div>

      {/* 게시글 목록 */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <div className="text-4xl mb-2">💬</div>
            <div>첫 번째 게시글을 작성해보세요!</div>
          </div>
        )}
        {filtered.map(post => (
          <div key={post.id} className="card overflow-hidden">
            {/* 게시글 헤더 */}
            <div className="p-4 cursor-pointer" onClick={() => toggleExpand(post.id)}>
              <div className="flex items-start gap-2 mb-2">
                <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 " + (CAT_COLOR[post.category]||"bg-gray-100 text-gray-600")}>
                  {post.category||"자유게시판"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 leading-snug">{post.title||post.question}</p>
                </div>
                {expanded === post.id ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/>}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="font-medium text-gray-600">{post.profiles?.name||"익명"}</span>
                {post.profiles?.school_name && <span className="text-gray-400">· {post.profiles.school_name}{post.profiles?.role === "parent" && <span className="text-gray-300 text-[9px] ml-0.5">(본인입력)</span>}</span>}
                <span>·</span>
                <span>{new Date(post.created_at).toLocaleDateString("ko")}</span>
                <span className="ml-auto flex items-center gap-1">
                  <MessageCircle size={12}/>
                  {replies[post.id]?.length ?? post.reply_count ?? 0}
                </span>
              </div>
            </div>

            {/* 펼침: 본문 + 댓글 */}
            {expanded === post.id && (
              <div className="border-t border-gray-100">
                {/* 본문 */}
                {post.title && (
                  <div className="px-4 py-3 bg-gray-50">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.question}</p>
                    {user?.id === post.user_id && (
                      <button onClick={() => deletePost(post.id)} className="text-xs text-red-400 font-bold mt-2 hover:text-red-600">삭제</button>
                    )}
                  </div>
                )}

                {/* 댓글 목록 */}
                <div className="px-4 py-2 space-y-2">
                  {(replies[post.id]||[]).map(r => (
                    <div key={r.id} className="flex gap-2 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-navy">
                        {(r.profiles?.name||"?")[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-gray-700">{r.profiles?.name||"익명"}</span>
                          <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString("ko")}</span>
                          {user?.id === r.user_id && (
                            <button onClick={() => deleteReply(r.id, post.id)} className="text-[10px] text-red-400 ml-auto hover:text-red-600">삭제</button>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 댓글 입력 */}
                {user ? (
                  <div className="px-4 pb-4 flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="댓글을 입력하세요..."
                      value={replyText[post.id]||""}
                      onChange={e => setReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(post.id); } }}
                    />
                    <button
                      onClick={() => submitReply(post.id)}
                      disabled={replyLoading[post.id]}
                      className="btn-primary text-sm py-2 px-3 flex-shrink-0">
                      등록
                    </button>
                  </div>
                ) : (
                  <div className="px-4 pb-4 text-xs text-gray-400 text-center">댓글을 달려면 로그인이 필요합니다</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 글 작성 모달 */}
      <Modal open={modal} onClose={() => setModal(false)} title="게시글 작성">
        <div className="space-y-3">
          <div>
            <label className="label">카테고리</label>
            <select className="input" value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
              {["진학상담","훈련방법","장비·용품","자유게시판"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">제목 *</label>
            <input className="input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="제목을 입력하세요" />
          </div>
          <div>
            <label className="label">내용 *</label>
            <textarea className="input min-h-[120px] resize-none" value={form.content} onChange={e => setForm(f=>({...f,content:e.target.value}))} placeholder="내용을 입력하세요" />
          </div>
          <button className="btn-primary w-full" onClick={submitPost} disabled={sending||!form.title.trim()||!form.content.trim()}>
            {sending ? "등록 중..." : "게시글 등록"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
