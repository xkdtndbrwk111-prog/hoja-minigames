# 호자 미니게임

교실 전자칠판과 태블릿에서 터치로 하는 미니게임 모음입니다.

- 게임: https://xkdtndbrwk111-prog.github.io/hoja-minigames/
- 항상 칠판 화면으로 열기: 주소 뒤에 `?mode=board`
- 태블릿 화면으로 열기: 주소 뒤에 `?mode=tablet`

## 고치는 방법

게임은 `index.html` 파일 하나로 배포합니다. 이 파일은 직접 고치지 않고, `src/` 폴더의 원본을 고친 뒤 다시 만듭니다.

- `src/js/` — 게임별 코드 (`othello.js`, `bakery.js`, `party/page1.js` …). 모두 한 덩어리로 이어 붙여지므로 앞 파일에서 만든 이름을 뒤 파일에서 그대로 씁니다. 이어 붙이는 순서는 `build.py`에 있습니다.
- `src/css/style.css` — 화면 꾸밈
- `src/index.template.html` — 화면 뼈대
- `src/assets/` — 그림·소리·글꼴. 코드 안의 `@@B64:경로@@` 자리에 들어갑니다.

고친 다음 아래 명령으로 `index.html`을 다시 만들고, 원본과 `index.html`을 함께 올립니다. 파이썬 3만 있으면 됩니다.

```bash
python3 build.py
```

`python3 build.py --check`는 `index.html`이 원본과 맞는지만 확인합니다.

## 새 게임: 호자와 나한상의 춤

**리듬게임** 메뉴에서 실행합니다. 1인(쉬움/보통/어려움), 2인 협동(쉬움/보통/어려움) 6가지 모드를 제공합니다.

- **캐릭터:** 게임 이름은 그대로 유지하지만, 1P와 2P 각각 호자·나한상·수막새 등 기존 **7종 캐릭터를 자유롭게 선택**할 수 있습니다. 동일 캐릭터 두 명도 허용합니다. 첫 선택은 호자+나한상이며, 다른 게임을 다녀와도 춤 게임에서 고른 조합을 유지합니다.
- **1인:** 화면 아래 가운데 버튼을 한 명이 박자마다 눌러 선택한 두 캐릭터를 교대로 회전시킵니다. 키보드 SPACE도 사용 가능합니다.
- **2인 협동:** 왼쪽은 1P(A), 오른쪽은 2P(L) 담당. 각자가 선택한 캐릭터의 차례에 **자기 버튼**을 눌러야 합니다. 두 사람의 기록은 공동 점수로 합산합니다.
- **길이:** 쉬움 약 60초, 보통 약 80초, 어려움 약 100초입니다. 곡의 BPM과 관계없이 실제 음악 시간에 맞춰 경로를 생성합니다.
- **점수:** 곡의 속도와 발판 개수가 달라도 공정하게 비교할 수 있도록 PERFECT/GREAT/MISS 결과를 **최고 300점**으로 환산합니다. 1인·2인 협동 명예의 전당은 서로 분리되고 기존 서버 규칙도 유지합니다.
- **음악:** 기존 `rhythm.js`의 자체 생성 곡 중 6곡을 선택합니다. 장거리 스테이지에서는 원곡 구절을 반복 연주합니다. 판정은 PERFECT(±75ms), GREAT(±150ms), MISS이며, 실패해도 다음 발판으로 넘어가 곡을 계속 연습할 수 있습니다.
- **전자칠판:** 기존 메뉴의 `전자칠판 보정` 저장값(`hoja-airhockey-board-lag`)을 그대로 사용하며, 터치 이벤트 시간과 오디오 시계를 기준으로 판정합니다. 이 값은 브라우저/기기별로 저장됩니다.
- **코인:** 실제 곡을 고른 시점부터 플레이 시간으로 처리합니다. 학급 연결 시 참가자의 이름을 표시합니다.
- **명예의 전당:** 1인 점수(`dance_solo`)와 2인 팀 점수(`dance_duo`, 두 학생을 하나의 팀으로 저장)를 별도로 관리합니다. 신규 기록에는 주간 자동 코인 보너스를 지급하지 않습니다.
- **코드:** `src/js/dance.js`. 원작 게임의 코드나 에셋은 사용하지 않은 독립 구현입니다.
- **시험:** `node tests/dance-logic.test.js` (곡/박자, 1·2인 입력, 판정, 일시정지, 점수 및 명예의 전당 연결)

교실에서 처음 실행할 때는 **2인 협동 · 쉬움**으로 시작하고, 실제 전자칠판의 양쪽 터치 버튼이 동시에 정상 작동하는지 확인하세요. 브라우저 시험은 실제 전자칠판의 센서 지연이나 음향 출력장치 지연을 완전히 재현하지 못합니다.

## 사용한 자료

- 효과음: Kenney (CC0)
- 음악: OpenGameArt의 "Beach Sports Theme (Loop)", "Happy Adventure (Loop)", "Happy Lullaby" (CC0)
- 호자 점프 배경: OpenGameArt의 Urban Landscape (CC0)
- 파티 게임과 필살기 그림: Kenney "Fish Pack", "Animal Pack Redux", "Shooting Gallery", "Tappy Plane", "Space Shooter Redux", "Puzzle Pack", "Boardgame Pack", "Particle Pack" (CC0, OpenGameArt)
- 아이콘과 과일: Noto Emoji 이미지, Copyright Google LLC (Apache License 2.0)
- 메뉴 배경: 호자 프로젝트의 박물관 그림
- 글꼴: Jua, Black Han Sans, 기호는 Noto Sans KR · Noto Sans Symbols · Noto Sans Math 일부 (모두 SIL Open Font License 1.1)
