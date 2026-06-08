import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Heart, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

function ytId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const STAT_FIELDS = {
  pitcher: [["height","키(cm)"],["weight","몸무게(kg)"],["pitch_type","구종"],["max_speed","최고구속(km/h)"],["avg_speed","평균구속(km/h)"],["era","평균자책"],["wins","승"],["losses","패"],["saves","세이브"],["innings","이닝"],["k_count","탈삼진"],["whip","WHIP"]],
  catcher: [["height","키(cm)"],["weight","몸무게(kg)"],["avg","타율"],["ops","OPS"],["rbi","타점"],["pop_time","팝타임(초)"],["cs_rate","도루저지율"]],
  infield: [["height","키(cm)"],["weight","몸무게(kg)"],["avg","타율"],["ops","OPS"],["hr","홈런"],["rbi","타점"],["sb","도루"],["fielding_pct","수비율"]],
  outfield: [["height","키(cm)"],["weight","몸무게(kg)"],["avg","타율"],["ops","OPS"],["hr","홈런"],["rbi","타점"],["sb","도루"],["arm_strength","어깨 구속(km/h)"]],
};
const posToGroup = { "투수":"pitcher","포수":"catcher","내야수":"infield","외야수":"outfield" };

export default function PlayerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [imgIdx, setImgIdx] = useState(null);

  useEffect(() => {
    supabase.from("players").select("*, schools(name, region, level)").eq("id", id).single().then(({ data }) => {
      setPlayer(data); setLoading(false);
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
      setIsFav(true); toast.success("관심 선수에 추가됐습니다");
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!player) return <div className="text-center py-20 text-gray-400">선수를 찾을 수 없습니다</div>;

  const group = posToGroup[player.position] || "infield";
  const fields = STAT_FIELDS[group] || [];
  const stats = player.stats || {};
  const playImgs = Array.isArray(player.play_images) ? player.play_images : [];
  const levelLabel = { elementary:"초등", middle:"중학", high:"고등", college:"대학" };
  const vid = ytId(player.highlight_url);

  return (
    <div className="space-y-4">
      <Link to="/players" className="inline-flex items-center gap-1 text-sm font-bold text-navy/70 hover:text-navy"><ChevronLeft size={16}/>선수 목록</Link>
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
              </div>
              <button onClick={toggleFav} className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-red-50 transition flex-shrink-0">
                <Heart size={18} fill={isFav?"#f43f5e":"none"} className={isFav?"text-red-400":"text-gray-400"} />
              </button>
            </div>
            {player.schools && (
              <Link to={"/schools/"+player.school_id} className="inline-flex items-center gap-1 text-xs text-navy font-semibold mt-2 hover:underline">
                {player.schools.name} ({levelLabel[player.schools.level]||""})
              </Link>
            )}
          </div>
        </div>
        {player.intro && <p className="mt-4 text-sm text-gray-700 leading-relaxed border-t pt-4 border-gray-100">{player.intro}</p>}
      </div>
      {fields.length > 0 && (
        <div className="card p-4">
          <h2 className="section-title">선수 스탯</h2>
          <div className="grid grid-cols-3 gap-3">
            {fields.map(([k,l]) => (
              <div key={k} className="text-center bg-navy/5 rounded-lg py-3 px-2">
                <div className="text-[10px] text-gray-500 mb-0.5">{l}</div>
                <div className="text-lg font-extrabold text-navy">{stats[k] || <span className="text-gray-300 text-sm">-</span>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {vid && (
        <div className="card overflow-hidden">
          <div className="p-4 pb-2"><h2 className="section-title">하이라이트 영상</h2></div>
          <div className="aspect-video">
            <iframe src={"https://www.youtube.com/embed/"+vid} className="w-full h-full" allowFullScreen title="하이라이트" />
          </div>
        </div>
      )}
      {playImgs.length > 0 && (
        <div className="card p-4">
          <h2 className="section-title">경기 사진</h2>
          <div className="grid grid-cols-2 gap-2">
            {playImgs.map((img, i) => (
              <img key={i} src={img} alt={"경기 "+(i+1)} onClick={() => setImgIdx(i)}
                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition" />
            ))}
          </div>
        </div>
      )}
      {imgIdx !== null && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={() => setImgIdx(null)}>
          <img src={playImgs[imgIdx]} alt="경기" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}