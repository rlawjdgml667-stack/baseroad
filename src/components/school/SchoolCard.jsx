import { Link } from "react-router-dom";
import FacilityBadge from "./FacilityBadge";

const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };

export default function SchoolCard({ school }) {
  const facilities = [
    { label:"전용구장", value: school.has_stadium },
    { label:"실내연습장", value: school.has_indoor },
    { label:"웨이트", value: school.has_weight },
    { label:"기숙사", value: school.has_dormitory },
    { label:"트레이너", value: school.has_trainer },
  ];

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