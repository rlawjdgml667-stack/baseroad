import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const ROLES = [
  { value:"parent", label:"학부모", desc:"자녀의 진학 학교를 찾는 학부모", icon:"👨‍👩‍👦" },
  { value:"player", label:"선수", desc:"야구 선수 본인 (프로필 등록)", icon:"⚾" },
  { value:"coach", label:"감독·코치", desc:"학교 야구부 감독 또는 코치 (관리자 승인 필요)", icon:"🏫" },
];

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ name:"", email:"", password:"", confirmPassword:"", schoolName:"", phone:"", parentConsent:false });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("비밀번호가 일치하지 않습니다"); return; }
    if (role === "player" && !form.parentConsent) { toast.error("미성년자는 보호자 동의가 필요합니다"); return; }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, { name: form.name, role, school_name: form.schoolName, phone: form.phone });
    if (error) { toast.error(error.message); }
    else {
      if (role === "coach") toast.success("가입 신청이 완료됐습니다. 관리자 승인 후 이용하실 수 있습니다.");
      else toast.success("회원가입이 완료됐습니다!");
      navigate("/login");
    }
    setLoading(false);
  }

  if (step === 1) return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">⚾</div>
        <h1 className="text-2xl font-extrabold text-navy">회원가입</h1>
        <p className="text-gray-400 text-sm mt-1">유형을 선택해 주세요</p>
      </div>
      <div className="space-y-3">
        {ROLES.map(r => (
          <button key={r.value} onClick={() => { setRole(r.value); setStep(2); }}
            className="card w-full p-4 text-left hover:border-navy border-2 border-transparent transition flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">{r.icon}</span>
            <div>
              <div className="font-extrabold">{r.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
            </div>
          </button>
        ))}
        <p className="text-center text-sm text-gray-500 mt-4">이미 계정이 있으신가요? <Link to="/login" className="text-navy font-bold hover:underline">로그인</Link></p>
      </div>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto">
      <button onClick={() => setStep(1)} className="text-sm text-navy font-bold mb-4 hover:underline">← 유형 다시 선택</button>
      <div className="card p-6">
        <h2 className="text-xl font-extrabold text-navy mb-4">{ROLES.find(r=>r.value===role)?.icon} {ROLES.find(r=>r.value===role)?.label} 회원가입</h2>
        {role === "coach" && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">관리자 승인 후 학교 정보를 등록하실 수 있습니다.</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="label">이름 *</label><input className="input" value={form.name} onChange={e => set("name",e.target.value)} required placeholder="홍길동" /></div>
          <div><label className="label">이메일 *</label><input className="input" type="email" value={form.email} onChange={e => set("email",e.target.value)} required /></div>
          <div><label className="label">비밀번호 *</label><input className="input" type="password" value={form.password} onChange={e => set("password",e.target.value)} required minLength={6} /></div>
          <div><label className="label">비밀번호 확인 *</label><input className="input" type="password" value={form.confirmPassword} onChange={e => set("confirmPassword",e.target.value)} required /></div>
          {role === "coach" && <div><label className="label">소속 학교 이름</label><input className="input" value={form.schoolName} onChange={e => set("schoolName",e.target.value)} placeholder="○○중학교 야구부" /></div>}
          <div><label className="label">연락처</label><input className="input" type="tel" value={form.phone} onChange={e => set("phone",e.target.value)} placeholder="010-0000-0000" /></div>
          {role === "player" && (
            <label className="flex items-start gap-2 cursor-pointer bg-blue-50 rounded-xl p-3">
              <input type="checkbox" checked={form.parentConsent} onChange={e => set("parentConsent",e.target.checked)} className="mt-0.5 accent-navy" />
              <span className="text-xs text-blue-700">미성년자의 경우 보호자(학부모)의 개인정보 제공 동의를 받았습니다.</span>
            </label>
          )}
          <button className="btn-primary w-full mt-2" disabled={loading}>{loading ? "가입 중..." : "회원가입"}</button>
        </form>
      </div>
    </div>
  );
}