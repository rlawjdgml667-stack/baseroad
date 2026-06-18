import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await signIn(email, password);
      const { data: profileData } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      const role = profileData?.role;
      toast.success("로그인됐습니다");
      if (role === "coach") navigate("/dashboard/coach");
      else if (role === "player") navigate("/dashboard/player");
      else if (role === "parent") navigate("/dashboard/parent");
      else if (role === "admin") navigate("/dashboard/admin");
      else navigate("/schools");
    } catch (error) {
      const msg = error.message;
      if (msg?.includes("Invalid login credentials") || msg?.includes("invalid_credentials")) {
        toast.error("이메일 또는 비밀번호가 틀렸습니다");
      } else if (msg?.includes("Too many requests")) {
        toast.error("잠시 후 다시 시도해주세요");
      } else {
        toast.error("로그인 실패: " + msg);
      }
    }
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
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-gray-400 hover:text-navy hover:underline">비밀번호를 잊으셨나요?</Link>
          </div>
        </form>
        <p className="text-center text-sm text-gray-500">계정이 없으신가요? <Link to="/register" className="text-navy font-bold hover:underline">회원가입</Link></p>
      </div>
    </div>
  );
}