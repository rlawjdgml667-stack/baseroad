import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import FacilityBadge from "./FacilityBadge";

const levelLabel = { little:"리틀", elementary:"초등", middle:"중등", high:"고등", college:"대학" };

export default function SchoolCard({ school }) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const facilities = [
    { label:"전용구장", value: school.has_stadium },
    { label:"실내연습장", value: school.has_indoor },
    { label:"웨이트", value: school.has_weight },
    { label:"기숙사", value: school.has_dormitory },
    { label:"트레이너", value: school.has_trainer },
  ];

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("target_id", school.id).eq("target_type", "school").maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, school.id]);

  async function toggleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", school.id).eq("target_type", "school");
      setIsFav(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, target_id: school.id, target_type: "school" });
      setIsFav(true);
    }
  }

  return (
    <Link to={`/schools/${school.id}`} className="card block hover:shadow-md transition overflow-hidden">
      <div className="relative h-32 bg-navy overflow-hidden">
        {school.main_image_url
          ? <img src={school.main_image_url} alt={school.name} className="w-full h-full object-cover opacity-80" />
          : <div className="w-full h-full flex items-center justify-center text-5xl opacity-10">⚾</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-3 text-white">
          <span className="badge-navy text-[10px] mr-1">{levelLabel[school.level]||school.level}</span>
          <div className="font-extrabold text-sm mt-0.5">{school.name}</div>
          <div className="text-white/60 text-[10px]">{school.region}</div>
        </div>
        {school.monthly_fee && (
          <div className="absolute top-2 right-2 bg-gold/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{school.monthly_fee}</div>
        )}
        {user && (
          <button onClick={toggleFav} className="absolute top-2 left-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 transition">
            <Heart size={13} fill={isFav ? "#f43f5e" : "none"} className={isFav ? "text-red-400" : "text-white"} />
          </button>
        )}
      </div>
      <div className="p-3">
        {school.director_name && <div className="text-xs text-gray-500 mb-2">감독: {school.director_name}</div>}
        <div className="flex flex-wrap gap-1">
          {facilities.map(f => <FacilityBadge key={f.label} label={f.label} value={f.value} />)}
        </div>
      </div>
    </Link>
  );
}
