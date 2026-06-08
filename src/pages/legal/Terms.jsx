export default function Terms() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      <h1 className="text-xl font-extrabold text-navy">이용약관</h1>

      <div className="card p-5 space-y-5 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-extrabold text-navy mb-2">제1조 (목적)</h2>
          <p>본 약관은 베이스로드(이하 "서비스")가 제공하는 야구 진학 정보 플랫폼 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">제2조 (미성년자 이용 및 법정대리인 동의)</h2>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
            <p className="font-bold text-red-700">⚠️ 만 14세 미만 이용자</p>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              <li>만 14세 미만의 아동은 법정대리인(부모 또는 후견인)의 동의 없이 회원가입 및 개인정보 제공이 불가합니다.</li>
              <li>개인정보보호법 제22조에 따라 만 14세 미만 아동의 개인정보 수집 시 법정대리인의 동의를 받아야 합니다.</li>
              <li>법정대리인은 아동의 개인정보 열람, 정정, 삭제를 요청할 수 있습니다.</li>
              <li>허위로 법정대리인 동의를 표시한 경우 서비스 이용이 즉시 제한될 수 있습니다.</li>
            </ul>
          </div>
          <p className="mt-2">만 14세 이상 만 19세 미만의 미성년자도 회원가입 전 보호자에게 본 약관 내용을 고지하고 동의를 받을 것을 권장합니다.</p>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">제3조 (저작권 및 콘텐츠 정책)</h2>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
            <p className="font-bold text-amber-700">📷 사진·영상 업로드 규정</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li><strong>본인이 직접 촬영한 사진·영상만 업로드 가능합니다.</strong></li>
              <li>TV 방송, 스트리밍 중계, 유튜브 등 타인이 제작한 영상의 캡처·편집·재업로드는 저작권법 위반입니다.</li>
              <li>대회 공식 촬영 영상, 언론사 보도 사진 등 제3자 저작물 업로드는 금지됩니다.</li>
              <li>타인의 얼굴이 포함된 사진은 해당 인물의 동의를 받은 경우에만 업로드 가능합니다.</li>
            </ul>
          </div>
          <p className="mt-2">저작권법 위반 콘텐츠 발견 시 즉시 삭제 조치하며, 반복 위반 시 계정이 정지될 수 있습니다.</p>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">제4조 (개인정보 수집 및 이용)</h2>
          <p>서비스는 다음과 같은 개인정보를 수집합니다:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>필수: 이름, 이메일, 비밀번호, 가입유형</li>
            <li>선택: 연락처, 소속학교, 출생연도, 키·체중, 프로필 사진</li>
          </ul>
          <p className="mt-2">수집된 정보는 서비스 제공 목적 외 사용되지 않으며, 이용자 동의 없이 제3자에게 제공되지 않습니다.</p>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">제5조 (선수 기록 정보)</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>선수가 직접 입력한 기록은 "자기 신고 기록"으로 표시됩니다.</li>
            <li>감독·코치가 인증한 기록은 "코치 인증" 뱃지가 표시됩니다.</li>
            <li>허위 기록 입력이 확인될 경우 해당 기록 삭제 및 계정 제재가 가능합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-extrabold text-navy mb-2">제6조 (책임의 한계)</h2>
          <p>서비스는 이용자가 제공한 정보의 정확성을 보증하지 않으며, 학교·선수 정보를 바탕으로 한 진학 결정에 대한 법적 책임을 지지 않습니다. 모든 진학 관련 최종 결정은 이용자 본인의 판단과 책임 하에 이루어져야 합니다.</p>
        </section>

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">본 약관은 2026년 1월 1일부터 시행됩니다.</p>
      </div>
    </div>
  );
}
