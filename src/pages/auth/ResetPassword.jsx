import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { toast.error("비밀번호가 일치하지 않습니다"); return; }
    if (password.length < 6) { toast.error("비밀번호는 6자 이상이어야 합니다"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.message?.includes("expired") || error.message?.includes("invalid")) {
        toast.error("링크가 만료됐습니다. 비밀번호 찾기를 다시 시도해주세요");
      } else {
        toast.error("변경 실패. 다시 시도해주세요");
      }
    } else {
      toast.success("비밀번호가 변경됐습니다");
      navigate("/");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-2xl font-extrabold text-navy">새 비밀번호 설정</h1>
        <p className="text-gray-400 text-sm mt-1">새로운 비밀번호를 입력해주세요</p>
      </div>
      <div className="card p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">새 비밀번호 *</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="6자 이상" />
          </div>
          <div>
            <label className="label">비밀번호 확인 *</label>
            <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="동일하게 입력" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
