# 수업 전 미니게임 자동 종료 — 2026-11-24 후보
상태: **source candidate / 미배포**. 호자보드 책 읽어주기 변경은 포함하지 않음.

- [x] 확정된 당일 시간표와 저장된 교시 시각 사용 (호자보드의 동일 이름 feature 브랜치).
- [x] 수업 시작 60초 전 테두리 심지, 불꽃 이동, 카운트다운, BGM 감쇠, 저음 및 작은 심지 효과음.
- [x] 시작 30초 전 기존 roundClose / cancelPendingPayment / hoja-close 경로 재사용.
- [x] 7종 × 8개 대사, 기존 공식 표정 에셋, 성격별 등장 동작. 칠지도는 기존 angry → neutral 그림과 꾸벅 동작으로 근사.
- [x] 호자보드 복귀 후 캐릭터 출력, 해당 교시까지 재입장 방지. 독립 웹 미니게임에는 적용하지 않음.
- [x] parent origin/source, revision, 중복 종료 방지 및 일시정지 후 절대시각 확인.
- [x] 실제 브랜치 소스를 JavaScript mock harness에서 검사: 미니게임 81/81, 호자보드 시간표 11/11 (총 92).
- [ ] Node에서 두 시험 파일 실행 및 전체 미니게임 회귀.
- [ ] python3 build.py 및 build.py --check, 생성 index.html 정본 동기화.
- [ ] 실제 WebView/iframe 종·심지·BGM·종료 화면, 7종 애니메이션 및 85인치 칠판 확인.
- [ ] 코인 미결제/결제 중/10초 내/정상 플레이/토너먼트 중간 저장/명예의 전당 회귀 및 구버전 호환 검증.
- [ ] 호자보드 정식 R8 서명 배포 게이트와 설치·자동 업데이트 확인. 미니게임 웹 배포를 먼저 준비하고 호자보드 후보와 통합 검증.
- [ ] 운영 main 병합 및 배포 (미승인/미검증 상태에서 진행 금지).

## 브리지
신규 클라이언트는 기존 coinProtocol 4와 별도로 `hoja-break-ready` v1을 전송. 보드는 정확한 origin 및 iframe source 검증 뒤 `hoja-break-schedule` (revision, classStartAt epoch ms 또는 null, audible)를 전송한다. 클라이언트는 종료 임계점에 기존 정산 경로를 실행하고 `hoja-close`에 reason, classStartAt, dismissal을 포함한다. 호자보드는 해당 교시와 임계점을 검증한 뒤 복귀 화면을 표시한다. 응답하지 않는 구버전/중단 iframe은 보드의 독립 타이머가 닫는다. 구버전에는 심지/7종 표정 지원이 없으므로 호환 시험 후 릴리스.

테스트:
`node tests/break-deadline.test.js`
호자보드 저장소: `node tests/mini-break-schedule.test.js`

이번 단계는 실제 브라우저나 서명 릴리스 환경에서 검증 완료된 것으로 간주하지 않는다. 캔바 개발 및 main/설치 파일/공식 feed 변경 없음.
