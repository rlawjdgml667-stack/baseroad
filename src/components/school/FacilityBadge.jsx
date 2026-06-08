import { Check, X } from "lucide-react";

export default function FacilityBadge({ label, value }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${value ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400 line-through"}`}>
      {value ? <Check size={10} /> : <X size={10} />} {label}
    </span>
  );
}
