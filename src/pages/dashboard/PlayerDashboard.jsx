import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import ImageUpload from "../../components/ui/ImageUpload";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Calculator, CheckCircle, Clock } from "lucide-react";

const POSITIONS = ["투수","포수","내야수","외야수"];
const HANDS = ["우투우타","우투좌타","좌투좌타","좌투우타","스위치"];
const CUR_YEAR = new Date().getFullYear();
const SEASONS = Array.from({ length: 6 }, (_, i) => CUR_YEAR - i);

// 이닝 파싱 (15.1 → 15.333...)
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
  const slg = (h + dbl + 2 * tpl + 3 * hr) / ab;
  const ops = obp + slg;

  return {
    avg: avg.toFixed(3),
    obp: obp.toFixed(3),
    slg: slg.toFixed(3),
    ops: ops.toFixed(3),
    hr: r.hr || 0,
    rbi: r.rbi || 0,
    sb: r.sb || 0,
    ab: ab,
    h: h,
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
    era: era.toFixed(2),
    whip: whip.toFixed(2),
    k_count: k,
    wins: r.wins || 0,
    losses: r.losses || 0,
    saves: r.saves || 0,
    innings: r.ip || 0,
    ip_real: ipReal.toFixed(1),
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
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({
    name:"", birth_year:"", position:"투수", dominant_hand:"우투우타",
    school_id:"", intro:"", height:"", weight:"", highlight_url:"", profile_image_url:""
  });
  const [season, setSeason] = useState(CUR_YEAR);
  const [seasonStats, setSeasonStats] = useState(null);
  const [rawStats, setRawStats] = useState({});
  const [computed, setComputed] = useState({});
  const [statSaving, setStatSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("players").select("*").eq("user_id", user.id).single(),
      supabase.from("schools").select("id, name, level").eq("status","active"),
    ]).then(([p, s]) => {
      if (p.data) { setPlayerData(p.data); setForm(f => ({ ...f, ...p.data })); }
      setSchools(s.data||[]);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!playerData) return;
    supabase.from("player_season_stats")
      .select("*").eq("player_id", playerData.id).eq("season", season).single()
      .then(({ data }) => {
        if (data) {
          setSeasonStats(data);
          setRawStats(data.raw_stats || {});
          setComputed(data.computed_stats || {});
        } else {
          setSeasonStats(null);
          setRawStats({});
          setComputed({});
        }
      });
  }, [playerData, season]);

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
    const payload = { ...form, user_id: user.id, status: "active" };
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

  async function saveSeason() {
    if (!playerData) { toast.error("먼저 프로필을 저장해주세요"); return; }
    setStatSaving(true);
    const isPitcher = form.position === "투수";
    const c = isPitcher ? calcPitcherStats(rawStats) : calcBatterStats(rawStats);
    setComputed(c);

    const payload = {
      player_id: playerData.id,
      season,
      raw_stats: rawStats,
      computed_stats: c,
      stats_verified: false,
    };

    if (seasonStats) {
      await supabase.from("player_season_stats").update({ ...payload, stats_verified: false }).eq("id", seasonStats.id);
    } else {
      const { data } = await supabase.from("player_season_stats").insert(payload).select().single();
      setSeasonStats(data);
    }
    toast.success(season + "시즌 기록이 저장됐습니다");
    setStatSaving(false);
  }

  if (loading) return <LoadingSpinner />;

  const isPitcher = form.position === "투수";
  const rawFields = isPitcher ? PITCHER_FIELDS : BATTER_FIELDS;
  const levelLabel = { little:"리틀", elementary:"초등", middle:"중등", high:"고등", college:"대학" };
  const minLabel = isPitcher ? "※ 15이닝 미만은 랭킹에 표시되지 않습니다" : "※ 30타수 미만은 랭킹에 표시되지 않습니다";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-navy">선수 프로필 관리</h1>

      <div className="flex gap-2">
        {[["profile","기본 정보"],["stats","시즌 기록"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-4 py-2 rounded-full text-sm font-bold border transition " + (tab===t ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
            {l}
          </button>
        ))}
      </div>

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
          <div>
            <label className="label">소속 학교</label>
            <select className="input" value={form.school_id||""} onChange={e => set("school_id",e.target.value)}>
              <option value="">학교를 선택하세요</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({levelLabel[s.level]||s.level})</option>)}
            </select>
          </div>
          <div><label className="label">자기 소개</label><textarea className="input min-h-[80px] resize-none" value={form.intro||""} onChange={e => set("intro",e.target.value)} placeholder="선수 소개, 강점 등을 적어주세요" /></div>
          <div><label className="label">하이라이트 영상 URL (YouTube)</label><input className="input" value={form.highlight_url||""} onChange={e => set("highlight_url",e.target.value)} placeholder="https://youtube.com/..." /></div>
          <button onClick={saveProfile} disabled={saving||!form.name} className="btn-primary w-full">
            {saving ? "저장 중..." : playerData ? "프로필 저장" : "프로필 등록"}
          </button>
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-4">
          {!playerData && (
            <div className="card p-6 text-center text-gray-400">
              <p className="text-sm">먼저 기본 정보 탭에서 프로필을 저장해주세요</p>
            </div>
          )}

          {playerData && (
            <>
              {/* 시즌 선택 */}
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
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-bold mb-0.5">📋 기록 입력 안내</p>
                <p>{minLabel}</p>
                <p className="mt-1">입력 후 <strong>자동 계산</strong> 버튼을 눌러 스탯을 확인하세요. 감독/코치가 인증하면 ✅ 인증 뱃지가 붙어요.</p>
              </div>

              {/* 원본 기록 입력 */}
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

              {/* 계산된 스탯 */}
              {Object.keys(computed).length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-extrabold text-navy mb-3">📊 계산된 스탯</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {isPitcher ? [
                      ["방어율", computed.era],
                      ["WHIP", computed.whip],
                      ["탈삼진", computed.k_count],
                      ["승", computed.wins],
                      ["패", computed.losses],
                      ["세이브", computed.saves],
                      ["이닝", computed.innings],
                    ].map(([l, v]) => (
                      <div key={l} className="text-center bg-navy/5 rounded-lg py-2 px-1">
                        <div className="text-[10px] text-gray-500">{l}</div>
                        <div className="text-base font-extrabold text-navy">{v ?? "-"}</div>
                      </div>
                    )) : [
                      ["타율", computed.avg],
                      ["출루율", computed.obp],
                      ["장타율", computed.slg],
                      ["OPS", computed.ops],
                      ["홈런", computed.hr],
                      ["타점", computed.rbi],
                      ["도루", computed.sb],
                      ["타수", computed.ab],
                      ["안타", computed.h],
                    ].map(([l, v]) => (
                      <div key={l} className="text-center bg-navy/5 rounded-lg py-2 px-1">
                        <div className="text-[10px] text-gray-500">{l}</div>
                        <div className="text-base font-extrabold text-navy">{v ?? "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
