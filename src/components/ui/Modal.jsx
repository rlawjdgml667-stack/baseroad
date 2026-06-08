import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <h3 className="text-base font-extrabold text-navy">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
