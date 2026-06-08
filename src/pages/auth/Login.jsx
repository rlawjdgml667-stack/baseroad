import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const { signIn, signInWithKakao } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) { toast.error(error.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 잘못됐습니다" : error.message); }
    else { toast.success("로그인됐습니다"); navigate("/"); }
    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">⚾</div>
        <h1 className="text-2xl font-extrabold text-navy">베이스로드 로그인</h1>
        <p className="text-gray-400 text-sm mt-1">학생야구 진학 정보 플랫폼</p>
      </div>
      <div className="card p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">이메일</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="example@email.com" />
          </div>
          <div>
            <label className="label">비밀번호</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? "로그인 중..." : "로그인"}</button>
        </form>
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"/></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">또는</span></div></div>
        <button onClick={signInWithKakao} className="w-full bg-[#FEE500] text-[#3C1E1E] font-bold py-2.5 rounded-lg hover:brightness-95 transition flex items-center justify-center gap-2">
          <span className="text-lg">💬</span> 카카오로 로그인
        </button>
        <p className="text-center text-sm text-gray-500">계정이 없으신가요? <Link to="/register" className="text-navy font-bold hover:underline">회원가입</Link></p>
      </div>
    </div>
  );
}