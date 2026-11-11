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

## 사용한 자료

- 효과음: Kenney (CC0)
- 음악: OpenGameArt의 "Beach Sports Theme (Loop)", "Happy Adventure (Loop)", "Happy Lullaby" (CC0)
- 호자 점프 배경: OpenGameArt의 Urban Landscape (CC0)
- 파티 게임과 필살기 그림: Kenney "Fish Pack", "Animal Pack Redux", "Shooting Gallery", "Tappy Plane", "Space Shooter Redux", "Puzzle Pack", "Boardgame Pack", "Particle Pack" (CC0, OpenGameArt)
- 아이콘과 과일: Noto Emoji 이미지, Copyright Google LLC (Apache License 2.0)
- 메뉴 배경: 호자 프로젝트의 박물관 그림
- 글꼴: Jua, Black Han Sans, 기호는 Noto Sans KR · Noto Sans Symbols · Noto Sans Math 일부 (모두 SIL Open Font License 1.1)
