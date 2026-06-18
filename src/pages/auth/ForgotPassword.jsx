import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) {
      toast.error("전송 실패. 이메일 주소를 확인해주세요");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) return (
    <div className="max-w-sm mx-auto">
      <div className="card p-8 text-center space-y-4">
        <div className="text-5xl">📧</div>
        <h2 className="text-xl font-extrabold text-navy">이메일을 확인해주세요</h2>
        <p className="text-sm text-gray-500">
          <span className="font-bold text-navy">{email}</span>으로<br />
          비밀번호 재설정 링크를 보냈습니다.
        </p>
        <p className="text-xs text-gray-400">메일이 오지 않으면 스팸함을 확인해주세요.</p>
        <Link to="/login" className="btn-primary block text-center">로그인으로 돌아가기</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔑</div>
        <h1 className="text-2xl font-extrabold text-navy">비밀번호 찾기</h1>
        <p className="text-gray-400 text-sm mt-1">가입한 이메일로 재설정 링크를 보내드립니다</p>
      </div>
      <div className="card p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">이메일</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="example@email.com" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? "전송 중..." : "재설정 링크 보내기"}</button>
        </form>
        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="text-navy font-bold hover:underline">로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
