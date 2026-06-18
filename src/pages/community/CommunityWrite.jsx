import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["자유", "질문", "정보공유", "진학상담"];
const ADMIN_CATEGORIES = ["공지", "자유", "질문", "정보공유", "진학상담"];

export default function CommunityWrite() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get("school_id");
  const schoolName = searchParams.get("school_name");
  const cats = profile?.role === "admin" ? ADMIN_CATEGORIES : CATEGORIES;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("자유");
  const [saving, setSaving] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  async function submit() {
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    if (!content.trim()) { toast.error("내용을 입력해주세요"); return; }
    setSaving(true);
    const insertData = {
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category,
    };
    if (schoolId) insertData.school_id = schoolId;
    const { data, error } = await supabase.from("posts").insert(insertData).select("id").maybeSingle();
    setSaving(false);
    if (error) { toast.error("작성 실패: " + error.message); return; }
    toast.success("게시글이 등록됐습니다!");
    if (schoolId) navigate("/schools/" + schoolId);
    else if (data?.id) navigate("/community/" + data.id);
    else navigate("/community");
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-navy/60 hover:text-navy">
          <ChevronLeft size={20}/>
        </button>
        <h1 className="text-lg font-extrabold text-navy">
          {schoolName ? `${schoolName} 게시판 글쓰기` : "글쓰기"}
        </h1>
      </div>
      {schoolName && (
        <div className="bg-navy/5 rounded-xl px-4 py-2 text-xs text-navy font-bold">
          📌 {schoolName} 학교 게시판에 등록됩니다
        </div>
      )}

      <div className="card p-4 space-y-4">
        {/* 카테고리 */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">카테고리</label>
          <div className="flex gap-2 flex-wrap">
            {cats.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={"px-3 py-1.5 rounded-full text-xs font-bold border transition " +
                  (category === c ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">제목</label>
          <input className="input" placeholder="제목을 입력해주세요" value={title}
            onChange={e => setTitle(e.target.value)} maxLength={100}/>
        </div>

        {/* 내용 */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">내용</label>
          <textarea className="input min-h-[200px] resize-none" placeholder="내용을 자유롭게 작성해주세요..."
            value={content} onChange={e => setContent(e.target.value)} maxLength={3000}/>
          <div className="text-right text-xs text-gray-300 mt-1">{content.length}/3000</div>
        </div>

        <button onClick={submit} disabled={saving}
          className="w-full py-3 bg-navy text-white font-bold rounded-xl hover:bg-navy/90 transition disabled:opacity-50">
          {saving ? "등록 중..." : "게시글 등록"}
        </button>
      </div>
    </div>
  );
}
