import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Heart, ChevronLeft, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

function ytId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const CUR_YEAR = new Date().getFullYear();

export default function PlayerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [selSeason, setSelSeason] = useState(CUR_YEAR);
  const [relatedPlayers, setRelatedPlayers] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from("players").select("*, schools(name, region, level)").eq("id", id).single(),
      supabase.from("player_season_stats").select("*").eq("player_id", id).order("season", { ascending: false }),
    ]).then(async ([p, s]) => {
      const playerData = p.data;
      setPlayer(playerData);
      const sd = s.data || [];
      setSeasons(sd);
      if (sd.length > 0) setSelSeason(sd[0].season);
      setLoading(false);
      // 관련 선수 로드 (같은 학교 or 같은 포지션)
      if (playerData) {
        let query = supabase.from("players").select("id,name,position,profile_image_url,schools(name)").eq("status","active").neq("id", id).limit(4);
        if (playerData.school_id) {
          query = query.eq("school_id", playerData.school_id);
        } else {
          query = query.eq("position", playerData.position);
        }
        const { data: rel } = await query;
        if (rel && rel.length > 0) { setRelatedPlayers(rel); }
        else if (playerData.position) {
          const { data: rel2 } = await supabase.from("players").select("id,name,position,profile_image_url,schools(name)").eq("status","active").eq("position", playerData.position).neq("id", id).limit(4);
          setRelatedPlayers(rel2||[]);
        }
      }
    });
    if (user) {
      supabase.from("favorites").select("id").eq("user_id", user.id).eq("target_type","player").eq("target_id", id).single()
        .then(({ data }) => setIsFav(!!data));
    }
  }, [id, user]);

  async function toggleFav() {
    if (!user) { toast.error("로그인이 필요합니다"); return; }
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_type","player").eq("target_id", id);
      setIsFav(false); toast.success("관심 선수에서 제거됐습니다");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, target_type:"player", target_id: id });
      setIsFav(true); toast.success("관심 선수에 추가됐습니다 ❤️");
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!player) return <div className="text-center py-20 text-gray-400">선수를 찾을 수 없습니다</div>;

  const levelLabel = { little:"리틀", elementary:"초등", middle:"중학", high:"고등", college:"대학" };
  const vid = ytId(player.highlight_url);
  const curSeason = seasons.find(s => s.season === selSeason);
  const computed = curSeason?.computed_stats || {};
  const isPitcher = player.position === "투수";

  const pitcherStats = [
    ["방어율", computed.era], ["WHIP", computed.whip], ["탈삼진", computed.k_count],
    ["승", computed.wins], ["패", computed.losses], ["세이브", computed.saves], ["이닝", computed.innings],
  ];
  const batterStats = [
    ["타율", computed.avg], ["출루율", computed.obp], ["장타율", computed.slg],
    ["OPS", computed.ops], ["홈런", computed.hr], ["타점", computed.rbi],
    ["도루", computed.sb], ["타수", computed.ab], ["안타", computed.h],
  ];
  const statEntries = isPitcher ? pitcherStats : batterStats;

  return (
    <div className="space-y-4">
      <Link to="/players" className="inline-flex items-center gap-1 text-sm font-bold text-navy/70 hover:text-navy">
        <ChevronLeft size={16}/>선수 목록
      </Link>

      {/* 선수 기본 정보 */}
      <div className="card p-5">
        <div className="flex gap-4 items-start">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-navy/10 flex-shrink-0">
            {player.profile_image_url
              ? <img src={player.profile_image_url} alt={player.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-navy/20">{player.name?.[0]}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="badge-navy text-[10px]">{player.position}</span>
                  {player.dominant_hand && <span className="badge-gray text-[10px]">{player.dominant_hand}</span>}
                </div>
                <h1 className="text-2xl font-extrabold text-navy">{player.name}</h1>
                {player.birth_year && <div className="text-xs text-gray-400">{player.birth_year}년생</div>}
                <div className="flex items-center gap-2 mt-1">
                  {player.height && <span className="text-xs text-gray-500">{player.height}cm</span>}
                  {player.weight && <span className="text-xs text-gray-500">{player.weight}kg</span>}
                </div>
              </div>
              <button onClick={toggleFav} className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-red-50 transition flex-shrink-0">
                <Heart size={18} fill={isFav?"#f43f5e":"none"} className={isFav?"text-red-400":"text-gray-400"} />
              </button>
            </div>
            {player.schools && (
              <Link to={"/schools/"+player.school_id} className="inline-flex items-center gap-1 text-xs text-navy font-semibold mt-2 hover:underline">
                🏫 {player.schools.name} ({levelLabel[player.schools.level]||""})
              </Link>
            )}
          </div>
        </div>
        {player.intro && <p className="mt-4 text-sm text-gray-700 leading-relaxed border-t pt-4 border-gray-100">{player.intro}</p>}
      </div>

      {/* 시즌 기록 */}
      {seasons.length > 0 ? (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">시즌 기록</h2>
            <div className="flex items-center gap-2">
              {curSeason?.stats_verified
                ? <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12}/> 코치 인증</span>
                : <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-50 px-2 py-1 rounded-full"><Clock size={12}/> 미인증</span>
              }
            </div>
          </div>

          {/* 시즌 탭 */}
          {seasons.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
              {seasons.map(s => (
                <button key={s.season} onClick={() => setSelSeason(s.season)}
                  className={"flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition " + (selSeason===s.season ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200")}>
                  {s.season}년
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {statEntries.map(([l, v]) => (
              <div key={l} className="text-center bg-navy/5 rounded-lg py-3 px-2">
                <div className="text-[10px] text-gray-500 mb-0.5">{l}</div>
                <div className="text-lg font-extrabold text-navy">{v ?? <span className="text-gray-300 text-sm">-</span>}</div>
              </div>
            ))}
          </div>

          {!curSeason?.stats_verified && (
            <p className="text-[10px] text-gray-400 text-center mt-2">※ 선수 본인 입력 기록 · 감독/코치 인증 전</p>
          )}
        </div>
      ) : (
        <div className="card p-6 text-center text-gray-400">
          <p className="text-sm">등록된 시즌 기록이 없습니다</p>
        </div>
      )}

      {/* 관련 선수 추천 */}
      {relatedPlayers.length > 0 && (
        <div>
          <h2 className="section-title">{player.school_id ? "같은 학교 선수" : "같은 포지션 선수"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {relatedPlayers.map(p => (
              <Link key={p.id} to={"/players/"+p.id} className="card p-3 flex items-center gap-2 hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
                  {p.profile_image_url ? <img src={p.profile_image_url} className="w-full h-full object-cover" alt={p.name}/> : <div className="w-full h-full flex items-center justify-center font-bold text-navy/30 text-sm">{p.name?.[0]}</div>}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{p.name}</div>
                  <div className="text-[10px] text-gray-400">{p.position}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 하이라이트 영상 */}
      {vid && (
        <div className="card overflow-hidden">
          <div className="p-4 pb-2"><h2 className="section-title">하이라이트 영상</h2></div>
          <div className="aspect-video">
            <iframe src={"https://www.youtube.com/embed/"+vid} className="w-full h-full" allowFullScreen title="하이라이트" />
          </div>
        </div>
      )}
    </div>
  );
}
