import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const posColor = { "투수":"bg-red-100 text-red-700","포수":"bg-blue-100 text-blue-700","내야수":"bg-green-100 text-green-700","외야수":"bg-purple-100 text-purple-700" };

export default function PlayerCard({ player }) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const statKey = player.position === "투수" ? "max_speed" : "avg";
  const statLabel = player.position === "투수" ? "최고구속" : "타율";
  const statValue = player.stats?.[statKey];
  const school = player.schools || {};
  const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };
  const posCls = posColor[player.position] || "bg-gray-100 text-gray-600";

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("target_id", player.id).eq("target_type", "player").maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, player.id]);

  async function toggleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", player.id).eq("target_type", "player");
      setIsFav(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, target_id: player.id, target_type: "player" });
      setIsFav(true);
    }
  }

  return (
    <Link to={"/players/" + player.id} className="card flex gap-3 p-3 items-center hover:shadow-md transition relative">
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-navy/10 flex-shrink-0">
        {player.profile_image_url
          ? <img src={player.profile_image_url} alt={player.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-navy/20">{player.name?.[0]}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded-full " + posCls}>{player.position}</span>
          {player.dominant_hand && <span className="text-[10px] text-gray-400">{player.dominant_hand}</span>}
        </div>
        <div className="font-extrabold text-sm text-navy">{player.name}</div>
        {school.name && <div className="text-xs text-gray-400 truncate">{school.name}{school.level ? " (" + (levelLabel[school.level]||"") + ")" : ""}</div>}
      </div>
      {statValue && (
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-gray-400">{statLabel}</div>
          <div className="font-extrabold text-navy">{statValue}</div>
        </div>
      )}
      {user && (
        <button onClick={toggleFav} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 transition">
          <Heart size={14} fill={isFav ? "#f43f5e" : "none"} className={isFav ? "text-red-400" : "text-gray-300"} />
        </button>
      )}
    </Link>
  );
}
