import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const ROLES = [
  { value:"parent", label:"학부모", desc:"자녀의 진학 학교를 찾는 학부모", icon:"👨‍👩‍👦" },
  { value:"player", label:"선수", desc:"야구 선수 본인 (프로필 등록)", icon:"⚾" },
  { value:"coach", label:"감독·코치", desc:"학교 야구부 감독 또는 코치 (관리자 승인 필요)", icon:"🏫" },
];

function getAge(birthYear) {
  if (!birthYear) return null;
  return new Date().getFullYear() - parseInt(birthYear);
}

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [form, setForm] = useState({
    name:"", email:"", password:"", confirmPassword:"",
    schoolName:"", phone:"", birthYear:"",
    parentName:"", parentPhone:"", parentEmail:"",
    parentConsent: false, termsAgree: false, privacyAgree: false,
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const age = getAge(form.birthYear);
  const isUnder14 = age !== null && age < 14;

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("비밀번호가 일치하지 않습니다"); return; }
    if (!form.termsAgree) { toast.error("이용약관에 동의해주세요"); return; }
    if (!form.privacyAgree) { toast.error("개인정보처리방침에 동의해주세요"); return; }
    if (role === "player" && isUnder14 && !form.parentConsent) {
      toast.error("만 14세 미만은 법정대리인 동의가 필요합니다"); return;
    }
    if (role === "player" && isUnder14 && (!form.parentName || !form.parentPhone)) {
      toast.error("법정대리인 정보를 입력해주세요"); return;
    }

    setLoading(true);
    try {
      await signUp(form.email, form.password, {
        name: form.name,
        role,
        school_name: form.schoolName,
        phone: form.phone,
      });
      setDone(true);
    } catch (error) {
      if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
        toast.error("이미 가입된 이메일입니다!");
      } else if (error.message?.includes("Password should be at least")) {
        toast.error("비밀번호는 6자 이상이어야 합니다");
      } else if (error.message?.includes("invalid")) {
        toast.error("이메일 형식이 올바르지 않습니다");
      } else {
        toast.error(error.message || "가입 중 오류가 발생했습니다");
      }
    }
    setLoading(false);
  }

  if (done) return (
    <div className="max-w-sm mx-auto">
      <div className="card p-8 text-center space-y-4">
        <div className="text-5xl">{role === "coach" ? "⏳" : "📧"}</div>
        <h2 className="text-xl font-extrabold text-navy">
          {role === "coach" ? "가입 신청 완료!" : "이메일을 확인해주세요"}
        </h2>
        {role === "coach" ? (
          <p className="text-sm text-gray-500">
            관리자 승인 후 이용하실 수 있습니다.<br />
            보통 1~2 영업일 내로 처리됩니다.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              <span className="font-bold text-navy">{form.email}</span>로<br />
              인증 메일을 보냈습니다.
            </p>
            <p className="text-xs text-gray-400">
              이메일의 인증 링크를 클릭한 후 로그인해주세요.<br />
              메일이 오지 않으면 스팸함을 확인해주세요.
            </p>
          </>
        )}
        <Link to="/login" className="btn-primary block text-center">로그인하러 가기</Link>
      </div>
    </div>
  );

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
        <p className="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요? <Link to="/login" className="text-navy font-bold hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto">
      <button onClick={() => setStep(1)} className="text-sm text-navy font-bold mb-4 hover:underline">← 유형 다시 선택</button>
      <div className="card p-6">
        <h2 className="text-xl font-extrabold text-navy mb-4">
          {ROLES.find(r=>r.value===role)?.icon} {ROLES.find(r=>r.value===role)?.label} 회원가입
        </h2>
        {role === "coach" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
            관리자 승인 후 학교 정보를 등록하실 수 있습니다.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="label">이름 *</label><input className="input" value={form.name} onChange={e => set("name",e.target.value)} required placeholder="홍길동" /></div>
          <div><label className="label">이메일 *</label><input className="input" type="email" value={form.email} onChange={e => set("email",e.target.value)} required /></div>
          <div><label className="label">비밀번호 *</label><input className="input" type="password" value={form.password} onChange={e => set("password",e.target.value)} required minLength={6} /></div>
          <div><label className="label">비밀번호 확인 *</label><input className="input" type="password" value={form.confirmPassword} onChange={e => set("confirmPassword",e.target.value)} required /></div>

          {role === "player" && (
            <div>
              <label className="label">출생연도 *</label>
              <input className="input" type="number" placeholder="2010" min="1990" max={new Date().getFullYear()}
                value={form.birthYear} onChange={e => set("birthYear",e.target.value)} required />
              {isUnder14 && (
                <p className="text-xs text-red-500 mt-1 font-bold">⚠️ 만 14세 미만 — 법정대리인 동의가 필요합니다</p>
              )}
            </div>
          )}

          {role === "coach" && (
            <div><label className="label">소속 학교 이름</label><input className="input" value={form.schoolName} onChange={e => set("schoolName",e.target.value)} placeholder="○○중학교 야구부" /></div>
          )}
          <div><label className="label">연락처</label><input className="input" type="tel" value={form.phone} onChange={e => set("phone",e.target.value)} placeholder="010-0000-0000" /></div>

          {/* 만 14세 미만 법정대리인 정보 */}
          {role === "player" && isUnder14 && (
            <div className="border-2 border-red-200 rounded-xl p-3 space-y-2 bg-red-50">
              <p className="text-xs font-extrabold text-red-700">👨‍👩‍👦 법정대리인(부모) 정보 필수</p>
              <p className="text-[10px] text-red-600">개인정보보호법 제22조에 따라 만 14세 미만은 법정대리인 동의가 필요합니다.</p>
              <div><label className="label text-[10px]">법정대리인 이름 *</label><input className="input text-sm" value={form.parentName} onChange={e => set("parentName",e.target.value)} placeholder="부모님 이름" /></div>
              <div><label className="label text-[10px]">법정대리인 연락처 *</label><input className="input text-sm" type="tel" value={form.parentPhone} onChange={e => set("parentPhone",e.target.value)} placeholder="010-0000-0000" /></div>
              <div><label className="label text-[10px]">법정대리인 이메일</label><input className="input text-sm" type="email" value={form.parentEmail} onChange={e => set("parentEmail",e.target.value)} placeholder="부모님 이메일 (선택)" /></div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.parentConsent} onChange={e => set("parentConsent",e.target.checked)} className="mt-0.5 accent-red-500" />
                <span className="text-xs text-red-700 font-bold">법정대리인(부모)이 본 서비스의 개인정보 수집·이용에 동의합니다. *</span>
              </label>
            </div>
          )}

          {/* 약관 동의 */}
          <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
            <p className="text-xs font-extrabold text-gray-700">약관 동의</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.termsAgree} onChange={e => set("termsAgree",e.target.checked)} className="mt-0.5 accent-navy" />
              <span className="text-xs text-gray-700">
                <Link to="/terms" target="_blank" className="text-navy font-bold underline">이용약관</Link>에 동의합니다 *
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.privacyAgree} onChange={e => set("privacyAgree",e.target.checked)} className="mt-0.5 accent-navy" />
              <span className="text-xs text-gray-700">
                <Link to="/privacy" target="_blank" className="text-navy font-bold underline">개인정보처리방침</Link>에 동의합니다 *
              </span>
            </label>
          </div>

          <button className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>
      </div>
    </div>
  );
}
