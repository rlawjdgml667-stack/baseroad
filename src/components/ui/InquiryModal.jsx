import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { X } from "lucide-react";
import toast from "react-hot-toast";

const ROLES = ["감독·코치", "선수", "학부모", "기타"];

export default function InquiryModal({ onClose }) {
  const [form, setForm] = useState({ name: "", contact: "", organization: "", role: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name.trim()) { toast.error("이름을 입력해주세요"); return; }
    if (!form.contact.trim()) { toast.error("연락처를 입력해주세요"); return; }
    if (!form.role) { toast.error("역할을 선택해주세요"); return; }
    if (!form.content.trim()) { toast.error("문의 내용을 입력해주세요"); return; }
    setSaving(true);
    const { error } = await supabase.from("inquiries").insert({
      name: form.name.trim(),
      contact: form.contact.trim(),
      organization: form.organization.trim() || null,
      role: form.role,
      content: form.content.trim(),
    });
    setSaving(false);
    if (error) { toast.error("제출에 실패했습니다. 잠시 후 다시 시도해주세요"); return; }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[500] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-extrabold text-navy text-base">관리자에게 문의하기</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={18} className="text-gray-500"/>
          </button>
        </div>

        {done ? (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="font-extrabold text-navy text-base mb-2">문의가 접수되었습니다</p>
            <p className="text-sm text-gray-500">빠른 시일 내에 연락드리겠습니다.</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-navy text-white font-bold rounded-xl text-sm hover:bg-navy/90 transition">
              닫기
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* 이름 */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">이름 <span className="text-red-400">*</span></label>
              <input className="input" placeholder="홍길동" value={form.name} onChange={e => set("name", e.target.value)} maxLength={20}/>
            </div>

            {/* 연락처 */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">연락처 (전화번호 또는 이메일) <span className="text-red-400">*</span></label>
              <input className="input" placeholder="010-0000-0000 또는 example@email.com" value={form.contact} onChange={e => set("contact", e.target.value)} maxLength={100}/>
            </div>

            {/* 소속 */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">소속 <span className="text-gray-300">(선택)</span></label>
              <input className="input" placeholder="학교명 또는 팀명" value={form.organization} onChange={e => set("organization", e.target.value)} maxLength={50}/>
            </div>

            {/* 역할 */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">역할 <span className="text-red-400">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {ROLES.map(r => (
                  <button key={r} onClick={() => set("role", r)}
                    className={"px-3 py-1.5 rounded-full text-xs font-bold border transition " +
                      (form.role === r ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* 문의 내용 */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">문의 내용 <span className="text-red-400">*</span></label>
              <textarea
                className="input min-h-[120px] resize-none"
                placeholder="문의 내용을 자유롭게 작성해주세요..."
                value={form.content}
                onChange={e => set("content", e.target.value)}
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-300 mt-1">{form.content.length}/500</div>
            </div>

            <button onClick={submit} disabled={saving}
              className="w-full py-3 bg-navy text-white font-extrabold rounded-xl hover:bg-navy/90 transition disabled:opacity-50 text-sm">
              {saving ? "제출 중..." : "문의 제출"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
