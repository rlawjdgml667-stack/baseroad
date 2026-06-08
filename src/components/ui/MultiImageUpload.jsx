import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Upload, X } from "lucide-react";
import toast from "react-hot-toast";

export default function MultiImageUpload({ bucket, pathPrefix, currentUrls = [], onUpdate, maxCount = 8 }) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(currentUrls);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= maxCount) { toast.error("최대 " + maxCount + "장까지 업로드 가능합니다"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("20MB 이하 이미지만 업로드 가능합니다"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = pathPrefix + "-" + Date.now() + "." + ext;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
    if (error) { toast.error("업로드 실패: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const newImages = [...images, data.publicUrl];
    setImages(newImages);
    onUpdate(newImages);
    setUploading(false);
    toast.success("사진이 추가됐습니다");
  }

  function remove(idx) {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    onUpdate(newImages);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative aspect-square">
            <img src={url} alt={"시설 " + (i+1)} className="w-full h-full object-cover rounded-xl border border-gray-200" />
            <button onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
              <X size={10}/>
            </button>
          </div>
        ))}
        {images.length < maxCount && (
          <label className="aspect-square flex flex-col items-center justify-center cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl hover:border-navy transition">
            <Upload size={18} className="text-gray-400 mb-1"/>
            <span className="text-[10px] text-gray-400">{uploading ? "업로드 중..." : "사진 추가"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        )}
      </div>
      <p className="text-[10px] text-gray-400">{images.length}/{maxCount}장 · 최대 20MB</p>
    </div>
  );
}
