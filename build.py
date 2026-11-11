"""Builds the published index.html from src/.

The game ships as one file so it opens anywhere (GitHub Pages, the classroom dashboard, a double-clicked copy)
with nothing else to fetch. The parts are kept apart in src/ so each game can be edited on its own:

  src/index.template.html   page skeleton and HTML
  src/css/style.css         all styles
  src/vendor/qrcode.js      QR code library
  src/js/*.js               the game code, joined in the order below into ONE script.
                            They share one scope, so a name made in core.js is usable in every later file.
  src/assets/...            pictures, sounds and fonts, embedded as base64 where @@B64:path@@ appears

Usage:
  python3 build.py           write index.html
  python3 build.py --check   only check that index.html matches src/ (exit 1 if not)
Needs only Python 3, no packages.
"""
import base64, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, 'index.html')

MAIN_JS = [
    'js/core.js',             # setup, characters, shared state
    'js/audio.js',            # sound effects and music
    'js/party/page1.js',      # party games, first page (and their pictures)
    'js/party/page2.js',
    'js/party/page3.js',
    'js/rhythm.js',           # rhythm games
    'js/menu-background.js',  # seasonal museum scene behind the menu
    'js/selection.js',        # character and stage selection
    'js/hockey.js',           # air hockey, and entering/leaving games, fullscreen
    'js/othello.js',
    'js/gomoku.js',
    'js/bubble.js',
    'js/bakery.js',           # bungeoppang shop
    'js/stairs.js',
    'js/volleyball.js',
    'js/tictactoe.js',
    'js/germ.js',
    'js/jump.js',             # Hoja jump
    'js/keyboard.js',
    'js/hall-of-fame.js',
    'js/coins.js',            # play limits, dashboard coins, class setup screens
    'js/controls.js',         # menu buttons, start-up, #debug hook (window.__hoja)
]


def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8', newline='') as f:
        return f.read()


def embed(text):
    def one(m):
        path = os.path.join(SRC, m.group(1))
        if not os.path.isfile(path):
            sys.exit('missing asset: ' + m.group(1))
        with open(path, 'rb') as f:
            return base64.b64encode(f.read()).decode('ascii')
    return re.sub(r'@@B64:([^@\s]+)@@', one, text)


def build():
    page = read('index.template.html')
    main = ''.join(read(p) for p in MAIN_JS)
    page = re.sub(r'@@INCLUDE:([^@\s]+)@@', lambda m: read(m.group(1)), page)
    page = page.replace('@@MAIN_JS@@', main)
    page = embed(page)
    if '@@' in page:
        sys.exit('unreplaced marker: ' + page[page.index('@@'):page.index('@@') + 80])
    return page


if __name__ == '__main__':
    html = build()
    if '--check' in sys.argv:
        with open(OUT, encoding='utf-8', newline='') as f:
            same = f.read() == html
        print('index.html is up to date' if same else 'index.html differs from src/ - run: python3 build.py')
        sys.exit(0 if same else 1)
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    print('index.html %.2f MB' % (len(html.encode('utf-8')) / 1e6))
