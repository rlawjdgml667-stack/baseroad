import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Link } from "react-router-dom";
import { X, Check, Minus } from "lucide-react";

const levelLabel = { elementary:"초등", middle:"중등", high:"고등", college:"대학" };

const FACILITIES = [
  ["has_stadium","전용 야구장"],
  ["has_indoor","실내 연습장"],
  ["has_weight","웨이트 시설"],
  ["has_dormitory","기숙사"],
  ["has_pitching_machine","피칭머신"],
  ["has_trainer","트레이너 상주"],
];

export default function SchoolCompare() {
  const [allSchools, setAllSchools] = useState([]);
  const [selected, setSelected] = useState([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectingSlot, setSelectingSlot] = useState(null);

  useEffect(() => {
    supabase.from("schools").select("*").eq("status","active").order("name").then(({ data }) => {
      setAllSchools(data||[]);
      setLoading(false);
    });
  }, []);

  function selectSchool(school) {
    if (selectingSlot === null) return;
    const newSelected = [...selected];
    newSelected[selectingSlot] = school;
    setSelected(newSelected);
    setSelectingSlot(null);
    setSearch("");
  }

  function removeSchool(idx) {
    const newSelected = [...selected];
    newSelected[idx] = null;
    setSelected(newSelected);
  }

  const activeSchools = selected.filter(Boolean);
  const searchResults = search ? allSchools.filter(s => s.name.includes(search) || (s.region||"").includes(search)).slice(0, 8) : [];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/schools" className="text-sm text-navy font-bold hover:underline">← 학교 목록</Link>
      </div>
      <h1 className="text-xl font-extrabold text-navy">학교 비교</h1>
      <p className="text-xs text-gray-400">최대 3개 학교를 나란히 비교할 수 있습니다.</p>

      {/* 학교 선택 슬롯 */}
      <div className="grid grid-cols-3 gap-2">
        {[0,1,2].map(idx => (
          <div key={idx} className="relative">
            {selected[idx] ? (
              <div className="card p-2.5 text-center relative">
                <button onClick={() => removeSchool(idx)} className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200">
                  <X size={10} className="text-red-500"/>
                </button>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-navy/10 mx-auto mb-1.5">
                  {selected[idx].main_image_url
                    ? <img src={selected[idx].main_image_url} className="w-full h-full object-cover" alt=""/>
                    : <div className="w-full h-full flex items-center justify-center text-lg">🏫</div>}
                </div>
                <div className="text-xs font-extrabold text-navy leading-tight truncate">{selected[idx].name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{selected[idx].region}</div>
              </div>
            ) : (
              <button onClick={() => setSelectingSlot(idx)}
                className="card p-3 text-center w-full border-2 border-dashed border-gray-200 hover:border-navy transition bg-gray-50">
                <div className="text-xl text-gray-300 mb-1">+</div>
                <div className="text-xs text-gray-400">학교 선택</div>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 검색 */}
      {selectingSlot !== null && (
        <div className="card p-3 space-y-2 border-2 border-navy">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy">슬롯 {selectingSlot+1} 학교 선택</span>
            <button onClick={() => { setSelectingSlot(null); setSearch(""); }} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
          </div>
          <input className="input" placeholder="학교명 검색..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map(s => (
                <button key={s.id} onClick={() => selectSchool(s)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-navy/5 flex items-center gap-2 transition">
                  <span className="badge-navy text-[10px]">{levelLabel[s.level]}</span>
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.region}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 비교 테이블 */}
      {activeSchools.length >= 2 && (
        <div className="space-y-3">
          {/* 기본 정보 */}
          <div className="card overflow-hidden">
            <div className="bg-navy px-4 py-2">
              <span className="text-white text-xs font-extrabold">기본 정보</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 text-gray-400 font-bold w-20">항목</td>
                    {selected.map((s, i) => s && (
                      <td key={i} className="p-2 font-extrabold text-navy text-center">{s.name}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["지역", s => s.region||"-"],
                    ["구분", s => levelLabel[s.level]||s.level||"-"],
                    ["감독", s => s.director_name||"-"],
                    ["창단연도", s => s.founded_year ? s.founded_year+"년" : "-"],
                    ["월 회비", s => s.monthly_fee||"-"],
                    ["연락처", s => s.contact_phone||"-"],
                  ].map(([label, getter]) => (
                    <tr key={label} className="border-b border-gray-50 even:bg-gray-50/50">
                      <td className="p-2 text-gray-500 font-bold">{label}</td>
                      {selected.map((s, i) => s && (
                        <td key={i} className="p-2 text-center text-gray-700">{getter(s)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 시설 비교 */}
          <div className="card overflow-hidden">
            <div className="bg-gold px-4 py-2">
              <span className="text-white text-xs font-extrabold">시설 현황</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 text-gray-400 font-bold w-24">시설</td>
                    {selected.map((s, i) => s && (
                      <td key={i} className="p-2 font-extrabold text-navy text-center">{s.name}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FACILITIES.map(([key, label]) => (
                    <tr key={key} className="border-b border-gray-50 even:bg-gray-50/50">
                      <td className="p-2 text-gray-500 font-bold">{label}</td>
                      {selected.map((s, i) => s && (
                        <td key={i} className="p-2 text-center">
                          {s[key]
                            ? <Check size={14} className="text-green-500 mx-auto"/>
                            : <Minus size={14} className="text-gray-300 mx-auto"/>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <td className="p-2 text-gray-500 font-bold">불펜 마운드</td>
                    {selected.map((s, i) => s && (
                      <td key={i} className="p-2 text-center text-gray-700">{s.bullpen_count ? s.bullpen_count+"개" : "-"}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 학교 상세 버튼 */}
          <div className="grid grid-cols-3 gap-2">
            {selected.map((s, i) => s && (
              <Link key={i} to={"/schools/"+s.id} className="btn-outline text-xs py-2 text-center">
                {s.name} 상세보기
              </Link>
            ))}
          </div>
        </div>
      )}

      {activeSchools.length < 2 && (
        <div className="card p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">⚖️</div>
          <p className="text-sm">비교할 학교를 2개 이상 선택해주세요</p>
        </div>
      )}
    </div>
  );
}
