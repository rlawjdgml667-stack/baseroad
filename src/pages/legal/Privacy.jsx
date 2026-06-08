export default function Privacy() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      <h1 className="text-xl font-extrabold text-navy">개인정보처리방침</h1>

      <div className="card p-5 space-y-5 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-extrabold text-navy mb-2">1. 수집하는 개인정보 항목</h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-navy/5">
                <th className="text-left p-2 font-bold">구분</th>
                <th className="text-left p-2 font-bold">필수</th>
                <th className="text-left p-2 font-bold">선택</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["공통","이름, 이메일","연락처"],
                ["선수","포지션, 소속학교","출생연도, 키, 체중, 프로필 사진, 기록"],
                ["감독·코치","소속학교","경력"],
                ["학부모","-","관심 학교·선수"],
              ].map(([g,r,o]) => (
                <tr key={g} className="border-t border-gray-100">
                  <td className="p-2 font-bold">{g}</td>
                  <td className="p-2">{r}</td>
                  <td className="p-2 text-gray-400">{o}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">2. 만 14세 미만 아동 개인정보 처리</h2>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
            <ul className="list-disc list-inside space-y-1 text-red-700 text-xs">
              <li>만 14세 미만 아동의 개인정보는 법정대리인의 동의 하에만 수집됩니다.</li>
              <li>법정대리인은 아동의 개인정보 수집·이용·제공에 대한 동의를 철회할 수 있습니다.</li>
              <li>법정대리인의 요청 시 해당 아동의 모든 개인정보를 열람·정정·삭제합니다.</li>
              <li>문의: 관리자에게 직접 연락하여 삭제 요청 가능합니다.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">3. 개인정보 보유 및 이용 기간</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>회원 탈퇴 시 즉시 삭제 (단, 관계 법령에 따라 보존 필요한 경우 해당 기간 보관)</li>
            <li>선수 기록 정보: 본인 요청 시 삭제</li>
          </ul>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">4. 개인정보 제3자 제공</h2>
          <p>이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의한 요청이 있는 경우는 예외입니다.</p>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">5. 이용자 권리</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>개인정보 열람, 정정, 삭제, 처리 정지 요청 가능</li>
            <li>만 14세 미만 아동의 법정대리인도 동일한 권리 행사 가능</li>
          </ul>
        </section>

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">시행일: 2026년 1월 1일</p>
      </div>
    </div>
  );
}
