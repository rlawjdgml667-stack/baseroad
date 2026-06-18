import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import ImageUpload from "../../components/ui/ImageUpload";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Calculator, CheckCircle, Clock, Search, X, Link2, AlertCircle, RefreshCw } from "lucide-react";

const POSITIONS = ["투수","포수","내야수","외야수"];
const HANDS = ["우투우타","우투좌타","좌투좌타","좌투우타","스위치"];
const CUR_YEAR = new Date().getFullYear();
const SEASONS = Array.from({ length: 6 }, (_, i) => CUR_YEAR - i);

function parseIP(ip) {
  const s = String(ip || 0);
  const parts = s.split(".");
  const full = parseInt(parts[0]) || 0;
  const partial = parseInt(parts[1]) || 0;
  return full + partial / 3;
}

function calcBatterStats(r) {
  const ab = Number(r.ab) || 0;
  const h = Number(r.h) || 0;
  const dbl = Number(r.double) || 0;
  const tpl = Number(r.triple) || 0;
  const hr = Number(r.hr) || 0;
  const bb = Number(r.bb) || 0;
  const hbp = Number(r.hbp) || 0;
  const sf = Number(r.sf) || 0;
  if (ab === 0) return {};
  const avg = h / ab;
  const obp_denom = ab + bb + hbp + sf;
  const obp = obp_denom > 0 ? (h + bb + hbp) / obp_denom : 0;
  const singles = h - dbl - tpl - hr;
  const slg = (singles + 2 * dbl + 3 * tpl + 4 * hr) / ab;
  const ops = obp + slg;
  return {
    avg: avg.toFixed(3), obp: obp.toFixed(3), slg: slg.toFixed(3), ops: ops.toFixed(3),
    hr: r.hr || 0, rbi: r.rbi || 0, sb: r.sb || 0, ab, h,
  };
}

function calcPitcherStats(r) {
  const ipReal = parseIP(r.ip);
  const er = Number(r.er) || 0;
  const ha = Number(r.ha) || 0;
  const bb = Number(r.bb) || 0;
  const k = Number(r.k) || 0;
  if (ipReal === 0) return {};
  const era = (er * 9) / ipReal;
  const whip = (ha + bb) / ipReal;
  return {
    era: era.toFixed(2), whip: whip.toFixed(2), k_count: k,
    wins: r.wins || 0, losses: r.losses || 0, saves: r.saves || 0,
    innings: r.ip || 0, ip_real: ipReal.toFixed(1),
  };
}

const BATTER_FIELDS = [
  ["ab","타수"],["h","안타"],["double","2루타"],["triple","3루타"],
  ["hr","홈런"],["rbi","타점"],["r","득점"],["bb","볼넷"],
  ["hbp","사구"],["sf","희생플라이"],["sb","도루"],["so","삼진"],
];
const PITCHER_FIELDS = [
  ["ip","이닝 (예: 15.1)"],["er","자책점"],["ha","피안타"],
  ["bb","볼넷"],["k","탈삼진"],["wins","승"],["losses","패"],["saves","세이브"],
];

export default function PlayerDashboard() {
  const { user, profile } = useAuth();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({
    name:"", birth_year:"", position:"투수", dominant_hand:"우투우타",
    intro:"", height:"", weight:"", highlight_url:"", profile_image_url:"",
    is_public: true,
  });

  // 학교 연결 관련
  const [connectionReq, setConnectionReq] = useState(null); // 현재 연결 요청
  const [connectedSchool, setConnectedSchool] = useState(null); // 승인된 학교
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolResults, setSchoolResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // 시즌 기록
  const [season, setSeason] = useState(CUR_YEAR);
  const [seasonStats, setSeasonStats] = useState(null);
  const [rawStats, setRawStats] = useState({});
  const [computed, setComputed] = useState({});
  const [statSaving, setStatSaving] = useState(false);

  useEffect(() => {
    loadPlayerData();
  }, [user]);

  async function loadPlayerData() {
    const { data: p } = await supabase.from("players").select("*").eq("user_id", user.id).single();
    if (p) {
      setPlayerData(p);
      setForm(f => ({ ...f, ...p }));
      // 연결 요청 로드
      await loadConnectionStatus(p.id, p.school_id);
    }
    setLoading(false);
  }

  async function loadConnectionStatus(playerId, currentSchoolId) {
    if (currentSchoolId) {
      // 현재 연결된 학교
      const { data: school } = await supabase.from("schools").select("id,name,level").eq("id", currentSchoolId).single();
      setConnectedSchool(school || null);
    } else {
      // school_id가 없어도 승인된 요청이 있으면 자동 복구
      const { data: approved } = await supabase
        .from("school_connection_requests")
        .select("school_id, schools(id,name,level)")
        .eq("player_id", playerId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (approved?.schools) {
        // school_id 자동 업데이트
        await supabase.from("players").update({ school_id: approved.school_id }).eq("id", playerId);
        setPlayerData(p => p ? { ...p, school_id: approved.school_id } : p);
        setConnectedSchool(approved.schools);
      } else {
        setConnectedSchool(null);
      }
    }
    // 대기 중인 요청
    const { data: req } = await supabase
      .from("school_connection_requests")
      .select("*, schools(id,name,level)")
      .eq("player_id", playerId)
      .eq("status", "pending")
      .maybeSingle();
    setConnectionReq(req || null);
  }

  useEffect(() => {
    if (!playerData) return;
    supabase.from("player_season_stats")
      .select("*").eq("player_id", playerData.id).eq("season", season).single()
      .then(({ data }) => {
        if (data) { setSeasonStats(data); setRawStats(data.raw_stats || {}); setComputed(data.computed_stats || {}); }
        else { setSeasonStats(null); setRawStats({}); setComputed({}); }
      });
  }, [playerData, season]);

  // 학교 검색
  useEffect(() => {
    if (!schoolSearch.trim() || schoolSearch.length < 1) { setSchoolResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await supabase.from("schools").select("id,name,level,region")
        .ilike("name", `%${schoolSearch}%`).eq("status","active").limit(8);
      setSchoolResults(data || []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolSearch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setRaw = (k, v) => setRawStats(s => ({ ...s, [k]: v }));

  function recalculate() {
    const isPitcher = form.position === "투수";
    const c = isPitcher ? calcPitcherStats(rawStats) : calcBatterStats(rawStats);
    setComputed(c);
    toast.success("계산됐습니다!");
    return c;
  }

  async function saveProfile() {
    setSaving(true);
    // school_id 제거 - 연결 시스템으로 관리
    const { school_id: _, ...rest } = form;
    const payload = { ...rest, user_id: user.id, status: "active" };
    if (playerData) {
      const { error } = await supabase.from("players").update(payload).eq("id", playerData.id);
      if (error) toast.error(error.message); else toast.success("프로필이 저장됐습니다");
    } else {
      const { data, error } = await supabase.from("players").insert(payload).select().single();
      if (error) toast.error(error.message);
      else { setPlayerData(data); toast.success("프로필이 등록됐습니다!"); }
    }
    setSaving(false);
  }

  // 학교 연결 신청
  async function requestConnection(school) {
    if (!playerData) { toast.error("먼저 프로필을 저장해주세요"); return; }
    setConnecting(true);
    try {
      // 기존 거절된 요청이 있으면 삭제 후 재신청
      await supabase.from("school_connection_requests")
        .delete().eq("player_id", playerData.id).eq("school_id", school.id);

      const { error } = await supabase.from("school_connection_requests").insert({
        player_id: playerData.id,
        school_id: school.id,
        status: "pending",
      });
      if (error) throw error;

      // school_name_text 업데이트
      await supabase.from("players").update({ school_name_text: school.name }).eq("id", playerData.id);
      await supabase.from("profiles").update({ school_name: school.name }).eq("id", user.id);
      setPlayerData(p => ({ ...p, school_name_text: school.name }));

      // 학교 감독에게 알림 전송
      const { data: sch } = await supabase.from("schools").select("coach_user_id").eq("id", school.id).single();
      if (sch?.coach_user_id) {
        await supabase.from("notifications").insert({
          user_id: sch.coach_user_id,
          type: "connection_requested",
          message: `${playerData.name} 선수가 ${school.name} 연결을 신청했습니다.`,
          link: "/dashboard/coach",
        });
      }

      toast.success(`${school.name}에 연결 신청했습니다! 감독/코치 승인을 기다려주세요.`);
      setSchoolSearch("");
      setSchoolResults([]);
      await loadConnectionStatus(playerData.id, playerData.school_id);
    } catch (e) {
      toast.error("신청 실패: " + e.message);
    }
    setConnecting(false);
  }

  // 연결 신청 취소
  async function cancelRequest() {
    if (!connectionReq) return;
    await supabase.from("school_connection_requests").delete().eq("id", connectionReq.id);
    await supabase.from("players").update({ school_name_text: null }).eq("id", playerData.id);
    setConnectionReq(null);
    toast.success("연결 신청을 취소했습니다");
  }

  // 학교 연결 해제 (직접 나가기)
  async function leaveSchool() {
    if (!window.confirm("소속 학교에서 나가시겠습니까? 시즌 기록은 유지됩니다.")) return;
    await supabase.from("players").update({ school_id: null, school_name_text: null }).eq("id", playerData.id);
    await supabase.from("profiles").update({ school_name: null }).eq("id", user.id);
    setPlayerData(p => ({ ...p, school_id: null, school_name_text: null }));
    setConnectedSchool(null);
    toast.success("학교 소속이 해제됐습니다");
  }

  async function saveSeason() {
    if (!playerData) { toast.error("먼저 프로필을 저장해주세요"); return; }
    setStatSaving(true);
    const isPitcher = form.position === "투수";
    const c = isPitcher ? calcPitcherStats(rawStats) : calcBatterStats(rawStats);
    setComputed(c);
    const payload = { player_id: playerData.id, season, raw_stats: rawStats, computed_stats: c, stats_verified: false };
    if (seasonStats) {
      await supabase.from("player_season_stats").update({ ...payload, stats_verified: false }).eq("id", seasonStats.id);
    } else {
      const { data } = await supabase.from("player_season_stats").insert(payload).select().single();
      setSeasonStats(data);
    }
    // 소속 학교 감독에게 알림 전송
    if (playerData.school_id) {
      const { data: sch } = await supabase.from("schools").select("coach_user_id,name").eq("id", playerData.school_id).single();
      if (sch?.coach_user_id) {
        await supabase.from("notifications").insert({
          user_id: sch.coach_user_id,
          type: "stats_submitted",
          message: `${form.name || playerData.name} 선수가 ${season}시즌 기록을 업데이트했습니다. 인증해주세요.`,
          link: "/dashboard/coach",
        });
      }
    }
    toast.success(season + "시즌 기록이 저장됐습니다");
    setStatSaving(false);
  }

  if (loading) return <LoadingSpinner />;

  const isPitcher = form.position === "투수";
  const rawFields = isPitcher ? PITCHER_FIELDS : BATTER_FIELDS;
  const minLabel = isPitcher ? "※ 15이닝 미만은 랭킹에 표시되지 않습니다" : "※ 30타수 미만은 랭킹에 표시되지 않습니다";
  const levelLabel = { little:"리틀", elementary:"초등", middle:"중등", high:"고등", college:"대학" };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">선수 프로필 관리</h1>

      <div className="flex gap-2">
        {[["profile","기본 정보"],["school","학교 연결"],["stats","시즌 기록"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-4 py-2 rounded-full text-sm font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
            {l}
          </button>
        ))}
      </div>

      {/* ===== 기본 정보 탭 ===== */}
      {tab === "profile" && (
        <div className="card p-4 space-y-4">
          <div>
            <label className="label">프로필 사진</label>
            <ImageUpload bucket="player-images" path={user.id + "/profile"} currentUrl={form.profile_image_url} onUpload={url => set("profile_image_url", url)} />
          </div>
          <div><label className="label">이름 *</label><input className="input" value={form.name||""} onChange={e => set("name",e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">출생연도</label><input className="input" type="number" placeholder="2009" value={form.birth_year||""} onChange={e => set("birth_year",e.target.value)} /></div>
            <div>
              <label className="label">포지션</label>
              <select className="input" value={form.position} onChange={e => set("position",e.target.value)}>
                {POSITIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">키(cm)</label><input className="input" type="number" value={form.height||""} onChange={e => set("height",e.target.value)} /></div>
            <div><label className="label">몸무게(kg)</label><input className="input" type="number" value={form.weight||""} onChange={e => set("weight",e.target.value)} /></div>
          </div>
          <div>
            <label className="label">투타</label>
            <select className="input" value={form.dominant_hand||"우투우타"} onChange={e => set("dominant_hand",e.target.value)}>
              {HANDS.map(h => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div><label className="label">자기 소개</label><textarea className="input min-h-[80px] resize-none" value={form.intro||""} onChange={e => set("intro",e.target.value)} placeholder="선수 소개, 강점 등을 적어주세요" /></div>
          <div>
            <label className="label">플레이 영상 URL (YouTube)</label>
            <input className="input" value={form.highlight_url||""} onChange={e => set("highlight_url",e.target.value)} placeholder="https://youtube.com/..." />
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
              <p className="font-bold">📹 YouTube 영상 업로드 방법</p>
              <p>1. YouTube 앱 또는 youtube.com 접속</p>
              <p>2. 우측 상단 <strong>+</strong> 버튼 → <strong>동영상 업로드</strong></p>
              <p>3. 영상 선택 후 제목 입력 → <strong>공개</strong> 또는 <strong>일부 공개</strong> 설정</p>
              <p>4. 업로드 완료 후 영상 주소(URL) 복사해서 위 칸에 붙여넣기</p>
              <p className="text-amber-600 font-bold mt-1">⚠️ 본인이 직접 촬영한 영상만 업로드 가능합니다</p>
            </div>
          </div>
          {/* 공개/비공개 설정 */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-bold text-navy">프로필 공개</div>
              <div className="text-xs text-gray-400 mt-0.5">{form.is_public ? "누구나 내 프로필을 볼 수 있습니다" : "로그인한 사용자만 볼 수 있습니다"}</div>
            </div>
            <button
              type="button"
              onClick={() => set("is_public", !form.is_public)}
              className={"relative w-12 h-6 rounded-full transition-colors " + (form.is_public ? "bg-navy" : "bg-gray-300")}>
              <span className={"absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform " + (form.is_public ? "translate-x-6" : "translate-x-0.5")} />
            </button>
          </div>

          <button onClick={saveProfile} disabled={saving||!form.name} className="btn-primary w-full">
            {saving ? "저장 중..." : playerData ? "프로필 저장" : "프로필 등록"}
          </button>
        </div>
      )}

      {/* ===== 학교 연결 탭 ===== */}
      {tab === "school" && (
        <div className="space-y-4">
          {!playerData && (
            <div className="card p-6 text-center text-gray-400 text-sm">
              먼저 기본 정보 탭에서 프로필을 저장해주세요
            </div>
          )}

          {playerData && (
            <>
              {/* 현재 연결 상태 */}
              <div className="card p-4">
                <h3 className="text-sm font-extrabold text-navy mb-3 flex items-center gap-2">
                  <Link2 size={15}/> 현재 소속 학교
                </h3>

                {/* 승인된 학교 있음 */}
                {connectedSchool && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <CheckCircle size={14} className="text-green-600"/>
                        <span className="text-sm font-extrabold text-green-700">연결됨</span>
                      </div>
                      <div className="font-bold">{connectedSchool.name}</div>
                      <div className="text-xs text-gray-500">{levelLabel[connectedSchool.level] || connectedSchool.level}</div>
                    </div>
                    <button onClick={leaveSchool} className="text-xs text-red-400 font-bold border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50">
                      나가기
                    </button>
                  </div>
                )}

                {/* 대기 중인 요청 있음 */}
                {!connectedSchool && connectionReq && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Clock size={14} className="text-amber-600"/>
                        <span className="text-sm font-extrabold text-amber-700">승인 대기 중</span>
                      </div>
                      <div className="font-bold">{connectionReq.schools?.name}</div>
                      <div className="text-xs text-gray-500">감독/코치가 승인하면 학교 페이지에 등록됩니다</div>
                    </div>
                    <button onClick={cancelRequest} className="text-xs text-gray-500 font-bold border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50">
                      취소
                    </button>
                  </div>
                )}

                {/* 연결 없음 */}
                {!connectedSchool && !connectionReq && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2 text-gray-400">
                    <AlertCircle size={14}/>
                    <span className="text-sm">소속 학교가 없습니다</span>
                  </div>
                )}
              </div>

              {/* 학교 검색 & 신청 (이미 승인된 학교 없을 때) */}
              {!connectedSchool && (
                <div className="card p-4">
                  <h3 className="text-sm font-extrabold text-navy mb-1">
                    {connectionReq ? "다른 학교로 변경 신청" : "학교 연결 신청"}
                  </h3>
                  {connectionReq && (
                    <p className="text-xs text-amber-600 mb-3">⚠️ 새 학교에 신청하면 기존 대기 신청이 자동 취소됩니다.</p>
                  )}
                  <p className="text-xs text-gray-400 mb-3">학교명으로 검색하여 연결을 신청하세요. 해당 학교 감독/코치가 승인하면 학교 페이지에 등록됩니다.</p>

                  <div className={(schoolResults.length > 0 || searchLoading) ? "relative pb-48" : "relative"}>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:border-navy transition">
                      <Search size={15} className="text-gray-400 flex-shrink-0"/>
                      <input
                        className="flex-1 text-sm outline-none bg-transparent"
                        placeholder="학교 이름 검색..."
                        value={schoolSearch}
                        onChange={e => setSchoolSearch(e.target.value)}
                      />
                      {schoolSearch && (
                        <button onClick={() => { setSchoolSearch(""); setSchoolResults([]); }}>
                          <X size={14} className="text-gray-400"/>
                        </button>
                      )}
                    </div>

                    {(schoolResults.length > 0 || searchLoading) && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {searchLoading && <div className="p-3 text-xs text-center text-gray-400">검색 중...</div>}
                        {schoolResults.map(s => (
                          <button key={s.id} onClick={() => requestConnection(s)} disabled={connecting}
                            className="w-full text-left px-4 py-3 hover:bg-navy/5 border-b last:border-b-0 border-gray-50 transition">
                            <div className="text-sm font-bold">{s.name}</div>
                            <div className="text-xs text-gray-400">{levelLabel[s.level]||s.level} · {s.region}</div>
                          </button>
                        ))}
                        {!searchLoading && schoolResults.length === 0 && schoolSearch.trim() && (
                          <div className="p-3 text-xs text-center text-gray-400">검색 결과가 없습니다</div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-3">
                    💡 소속 학교가 플랫폼에 등록되지 않은 경우, 학교 감독/코치에게 베이스로드 가입 및 학교 등록을 요청해주세요.
                  </p>
                </div>
              )}

              {/* 연결된 학교 있으면 변경 옵션 */}
              {connectedSchool && (
                <div className="card p-4">
                  <h3 className="text-sm font-extrabold text-navy mb-1">학교 변경</h3>
                  <p className="text-xs text-gray-400 mb-3">학교를 변경하려면 먼저 '나가기'를 누른 후 새 학교에 신청하세요. 시즌 기록은 유지됩니다.</p>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    ℹ️ 학년이 올라가 학교가 바뀐 경우에도 이전 시즌 기록은 그대로 보존됩니다.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== 시즌 기록 탭 ===== */}
      {tab === "stats" && (
        <div className="space-y-4">
          {!playerData && (
            <div className="card p-6 text-center text-gray-400">
              <p className="text-sm">먼저 기본 정보 탭에서 프로필을 저장해주세요</p>
            </div>
          )}

          {playerData && (
            <>
              <div className="card p-3 flex items-center gap-3">
                <span className="text-sm font-bold text-navy">시즌</span>
                <select className="input flex-1" value={season} onChange={e => setSeason(Number(e.target.value))}>
                  {SEASONS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                {seasonStats?.stats_verified && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                    <CheckCircle size={14}/> 인증됨
                  </span>
                )}
                {seasonStats && !seasonStats.stats_verified && (
                  <span className="flex items-center gap-1 text-xs font-bold text-orange-400">
                    <Clock size={14}/> 미인증
                  </span>
                )}
                <button onClick={async () => {
                  const { data } = await supabase.from("player_season_stats").select("*").eq("player_id", playerData.id).eq("season", season).single();
                  if (data) { setSeasonStats(data); setRawStats(data.raw_stats||{}); setComputed(data.computed_stats||{}); }
                  toast.success("새로고침됐습니다");
                }} className="ml-auto text-gray-400 hover:text-navy transition" title="인증 상태 새로고침">
                  <RefreshCw size={14}/>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-bold mb-0.5">📋 기록 입력 안내</p>
                <p>{minLabel}</p>
                <p className="mt-1">입력 후 <strong>자동 계산</strong> 버튼을 눌러 스탯을 확인하세요. 감독/코치가 인증하면 ✅ 인증 뱃지가 붙어요.</p>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-extrabold text-navy mb-3">
                  {isPitcher ? "⚾ 투수 원본 기록 입력" : "🏏 타자 원본 기록 입력"}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {rawFields.map(([k, l]) => (
                    <div key={k}>
                      <label className="label text-[10px]">{l}</label>
                      <input className="input text-sm" type={k === "ip" ? "text" : "number"} min="0"
                        placeholder={k === "ip" ? "15.1" : "0"}
                        value={rawStats[k] || ""}
                        onChange={e => setRaw(k, e.target.value)} />
                    </div>
                  ))}
                </div>
                <button onClick={recalculate} className="btn-outline w-full mt-3 flex items-center justify-center gap-2">
                  <Calculator size={14}/> 자동 계산
                </button>
              </div>

              {Object.keys(computed).length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-extrabold text-navy mb-3">📊 계산된 스탯</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {isPitcher ? [
                      ["방어율", computed.era], ["WHIP", computed.whip], ["탈삼진", computed.k_count],
                      ["승", computed.wins], ["패", computed.losses], ["세이브", computed.saves], ["이닝", computed.innings],
                    ].map(([l, v]) => (
                      <div key={l} className="text-center bg-navy/5 rounded-lg py-2 px-1">
                        <div className="text-[10px] text-gray-500">{l}</div>
                        <div className="text-base font-extrabold text-navy">{v ?? "-"}</div>
                      </div>
                    )) : [
                      ["타율", computed.avg], ["출루율", computed.obp], ["장타율", computed.slg],
                      ["OPS", computed.ops], ["홈런", computed.hr], ["타점", computed.rbi],
                      ["도루", computed.sb], ["타수", computed.ab], ["안타", computed.h],
                    ].map(([l, v]) => (
                      <div key={l} className="text-center bg-navy/5 rounded-lg py-2 px-1">
                        <div className="text-[10px] text-gray-500">{l}</div>
                        <div className="text-base font-extrabold text-navy">{v ?? "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                ⚠️ <strong>허위 기록 입력 금지</strong> — 실제와 다른 기록을 입력할 경우 관리자가 해당 데이터를 삭제할 수 있습니다.
              </div>

              <button onClick={saveSeason} disabled={statSaving} className="btn-primary w-full">
                {statSaving ? "저장 중..." : season + "시즌 기록 저장"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
