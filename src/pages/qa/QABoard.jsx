import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "../../components/ui/Modal";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function QABoard() {
  const { user, profile } = useAuth();
  const [qna, setQna] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ school_id:"", question:"" });
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      supabase.from("qna").select("*, schools(name), profiles(name)").order("created_at",{ascending:false}),
      supabase.from("schools").select("id, name").eq("status","active"),
    ]).then(([q, s]) => { setQna(q.data||[]); setSchools(s.data||[]); setLoading(false); });
  }, []);

  async function submit() {
    if (!form.school_id || !form.question.trim()) return;
    setSending(true);
    await supabase.from("qna").insert({ user_id: user.id, school_id: form.school_id, question: form.question });
    const { data } = await supabase.from("qna").select("*, schools(name), profiles(name)").order("created_at",{ascending:false});
    setQna(data||[]);
    setForm({ school_id:"", question:"" }); setModal(false); setSending(false);
    toast.success("질문이 등록됐습니다");
  }

  const filtered = qna.filter(q => filter === "all" ? true : filter === "answered" ? !!q.answer : !q.answer);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-navy">진학 Q&A</h1>
        {user && profile?.role === "parent" && (
          <button onClick={() => setModal(true)} className="btn-primary text-sm py-2 px-4">질문하기</button>
        )}
      </div>
      <p className="text-xs text-gray-400">진학 관련 궁금한 점을 질문하고 학교 측 공식 답변을 받아보세요.</p>
      <div className="flex gap-2">
        {[["all","전체"],["unanswered","미답변"],["answered","답변완료"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} className={"px-3 py-1.5 rounded-full text-xs font-bold border transition " + (filter===v ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>{l}</button>
        ))}
      </div>
      <div className="space-y-2.5">
        {filtered.length === 0 && <div className="card p-10 text-center text-gray-400">등록된 질문이 없습니다</div>}
        {filtered.map(q => (
          <div key={q.id} className="card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link to={"/schools/"+q.school_id} className="badge-navy text-[10px] hover:opacity-80">{q.schools?.name}</Link>
                {q.answer ? <span className="badge-green text-[10px]">답변완료</span> : <span className="badge-gray text-[10px]">대기중</span>}
                <span className="text-xs text-gray-400 ml-auto">{q.profiles?.name||"익명"} · {new Date(q.created_at).toLocaleDateString("ko")}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">{q.question}</p>
            </div>
            {q.answer && (
              <div className="px-4 pb-4 pt-3 bg-blue-50 border-t border-blue-100">
                <div className="text-xs font-bold text-navy mb-1">{q.schools?.name} 공식 답변</div>
                <p className="text-sm text-gray-700 leading-relaxed">{q.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="진학 질문 등록">
        <div className="space-y-3">
          <div>
            <label className="label">학교 선택 *</label>
            <select className="input" value={form.school_id} onChange={e => setForm(f=>({...f,school_id:e.target.value}))}>
              <option value="">학교를 선택하세요</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">질문 내용 *</label>
            <textarea className="input min-h-[100px] resize-none" value={form.question} onChange={e => setForm(f=>({...f,question:e.target.value}))} placeholder="궁금한 점을 구체적으로 적어주세요." />
          </div>
          <button className="btn-primary w-full" onClick={submit} disabled={sending || !form.school_id || !form.question.trim()}>
            {sending ? "등록 중..." : "질문 등록"}
          </button>
        </div>
      </Modal>
    </div>
  );
}