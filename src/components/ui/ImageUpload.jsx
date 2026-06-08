import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Upload, X } from "lucide-react";
import toast from "react-hot-toast";

export default function ImageUpload({ bucket, path, currentUrl, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("20MB 이하 이미지만 업로드 가능합니다"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = path + "." + ext;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
    if (error) { toast.error("업로드 실패: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    setPreview(data.publicUrl);
    onUpload(data.publicUrl);
    setUploading(false);
    toast.success("이미지가 업로드됐습니다");
  }

  return (
    <div className="space-y-2">
      {preview && (
        <div className="relative w-32 h-32">
          <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl border border-gray-200" />
          <button onClick={() => { setPreview(null); onUpload(""); }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
            <X size={10}/>
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 hover:border-navy transition w-fit">
        <Upload size={16} className="text-gray-400"/>
        <span className="text-sm text-gray-500">{uploading ? "업로드 중..." : "이미지 선택 (최대 5MB)"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      <p className="text-[10px] text-amber-600">📷 본인이 직접 촬영한 사진만 업로드 가능합니다. 방송·중계 캡처 등 타인의 저작물은 업로드가 금지됩니다.</p>
    </div>
  );
}