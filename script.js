const F = [
  'faces/face1.png',
  'faces/face2.png',
  'faces/face3.png',
  'faces/face4.png',
  'faces/face5.png',
  'faces/face6.png'
];

let COLS = 12, ROWS = 16, wide = false, TIME = 120, KINDS = 6, hints = 3, diff = 'Normal';

const D = {
  Easy: { k: 4, t: 150, h: 5 },
  Normal: { k: 6, t: 120, h: 3 },
  Hard: { k: 6, t: 90, h: 1 },
};

const sheetEl = document.querySelector('.sheet');
if (sheetEl && typeof F !== 'undefined' && F.length > 0) {
  sheetEl.innerHTML = F.map(u => `<img src="${u}" alt="">`).join('');
}

const board = document.querySelector('.board');
let grid, cells, score, left, timer, playing = false, start = null, cur = null;
let best = 0;

function loadBest() {
  best = 0;
  try {
    best = +localStorage.getItem('facegame3-best-' + diff) || 0;
  } catch (e) {}
  const bestValEl = document.querySelector('.best-val');
  if (bestValEl) bestValEl.textContent = best;
}
loadBest();

const isWide = () => matchMedia('(min-width:700px) and (min-aspect-ratio:1/1)').matches;

function init() {
  const cfg = D[diff];
  TIME = cfg.t;
  KINDS = cfg.k;
  hints = cfg.h;
  wide = isWide();
  COLS = wide ? 17 : 12;
  ROWS = wide ? 10 : 16;
  
  const w = document.querySelector('.wrap');
  w.className = 'wrap ' + (wide ? 'wide' : 'tall');
  
  board.style.gridTemplateColumns = 'repeat(' + COLS + ',1fr)';
  grid = [];
  cells = [];
  board.innerHTML = '';
  
  for (let i = 0; i < COLS * ROWS; i++) {
    const v = Math.floor(Math.random() * KINDS);
    grid.push(v);
    const d = document.createElement('div');
    d.className = 'c';
    d.innerHTML = `<img src="${F[v]}" alt="">`;
    board.appendChild(d);
    cells.push(d);
  }

  score = 0;
  left = TIME;
  upd();
}
function upd() {
  const scoreEl = document.querySelector('.score-val');
  const timeEl = document.querySelector('.time-val');
  const barEl = document.querySelector('.bar-fill');
  const hintBtn = document.querySelector('.hint-btn');

  if (scoreEl) scoreEl.textContent = score;
  if (timeEl) timeEl.textContent = left;
  if (barEl) barEl.style.width = (left / TIME * 100) + '%';
  if (hintBtn) {
    hintBtn.textContent = '💡Hint ' + hints;
    hintBtn.disabled = hints <= 0 || !playing;
  }
}

document.querySelector('.hint-btn').onclick = () => {
  if (!playing || hints <= 0) return;
  const m = findMove();
  if (!m) return;
  
  hints--;
  upd();
  
  const hs = [];
  for (let r = m.r1; r <= m.r2; r++) {
    for (let c = m.c1; c <= m.c2; c++) {
      const i = r * COLS + c;
      if (grid[i] >= 0) {
        cells[i].classList.add('hint');
      }
    }
  }
  
  setTimeout(() => {
    hs.forEach(i => cells[i].classList.remove('hint'));
  }, 3000);
};

function pos(e) {
  const r = board.getBoundingClientRect();
  const cs = getComputedStyle(board);
  const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
  const pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
  const w = (r.width - pl * 2) / COLS;
  const h = (r.height - pt * 2) / ROWS;
  
  return {
    c: Math.max(0, Math.min(COLS - 1, Math.floor((e.clientX - r.left - pl) / w))),
    r: Math.max(0, Math.min(ROWS - 1, Math.floor((e.clientY - r.top - pt) / h)))
  };
}

function inRect() {
  if (!start || !cur) return [];
  const c1 = Math.min(start.c, cur.c), c2 = Math.max(start.c, cur.c);
  const r1 = Math.min(start.r, cur.r), r2 = Math.max(start.r, cur.r);
  const o = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      o.push(r * COLS + c);
    }
  }
  return o;
}

function paint() {
  const s = new Set(inRect());
  cells.forEach((d, i) => d.classList.toggle('sel', s.has(i)));
}

board.addEventListener('pointerdown', e => {
  if (!playing) return;
  board.setPointerCapture(e.pointerId);
  start = cur = pos(e);
  paint();
});

board.addEventListener('pointermove', e => {
  if (!start) return;
  cur = pos(e);
  paint();
});

board.addEventListener('pointerup', e => {
  if (!start) return;
  cur = pos(e);
  const idx = inRect().filter(i => grid[i] >= 0);
  start = cur = null;
  paint();
  
  if (idx.length < 2) return;
  const m = document.querySelector('.msg');
  
  if (idx.every(i => grid[i] === grid[idx[0]])) {
    idx.forEach(i => {
      const d = cells[i];
      d.classList.add('pop');
      grid[i] = -1;
      setTimeout(() => d.classList.add('empty'), 260);
    });
    score += idx.length;
    if (m) m.textContent = '+' + idx.length;
    upd();
    if (grid.every(v => v < 0) || !findMove()) end();
  } else {
    if (m) m.textContent = '표정이 달라요!';
    board.classList.remove('shake');
    void board.offsetWidth;
    board.classList.add('shake');
  }
});

board.addEventListener('pointercancel', () => {
  start = cur = null;
  paint();
});

function findMove() {
  let bm = null;
  for (let r1 = 0; r1 < ROWS; r1++) {
    for (let c1 = 0; c1 < COLS; c1++) {
      for (let r2 = r1; r2 < ROWS; r2++) {
        for (let c2 = c1; c2 < COLS; c2++) {
          let v = -1, n = 0, ok = true;
          for (let r = r1; r <= r2 && ok; r++) {
            for (let c = c1; c <= c2; c++) {
              const g = grid[r * COLS + c];
              if (g < 0) continue;
              if (v < 0) v = g;
              else if (g !== v) { ok = false; break; }
              n++;
            }
          }
          if (ok && n >= 2 && (!bm || n > bm.n)) bm = { r1, c1, r2, c2, n };
        }
      }
    }
  }
  return bm;
}

document.querySelector('.hint-btn').onclick = () => {
  if (!playing || hints <= 0) return;
  const m = findMove();
  if (!m) return;
  hints--;
  upd();
  const hs = [];
  for (let r = m.r1; r <= m.r2; r++) {
    for (let c = m.c1; c <= m.c2; c++) {
      const i = r * COLS + c;
      if (grid[i] >= 0) {
        cells[i].classList.add('hint');
        hs.push(i);
      }
    }
  }
  setTimeout(() => hs.forEach(i => cells[i].classList.remove('hint')), 1600);
};

const DD = {
  Easy: 'Faces 4 · 150s · Hint 5',
  Normal: 'Faces 6 · 120s · Hint 3',
  Hard: 'Faces 6 · 90s · Hint 1'
};

function setDd() {
  const ddEl = document.querySelector('.dd');
  if (ddEl) ddEl.textContent = DD[diff];
}
setDd();

  document.querySelectorAll('.dif button').forEach(b => b.onclick = () => {
  diff = b.dataset.d;

  document.querySelectorAll('.dif button').forEach(x => x.classList.toggle('on', x === b));
  setDd();
  loadBest();
});

function end() {
  playing = false;
  clearInterval(timer);
  const nb = score > best && score > 0;
  if (nb) {
    best = score;
    try { localStorage.setItem('facegame3-best-' + diff, best); } catch (e) {}
    const bestValEl = document.querySelector('.best-val');
    if (bestValEl) bestValEl.textContent = best;
  }

  document.querySelector('.intro').style.display = 'none';
  document.querySelector('.res').style.display = 'flex';
  document.querySelector('.big').textContent = score;
  document.querySelector('.best-t').textContent = diff + ' · ' + (nb ? '🎉🎉 BEST!' : 'BEST ' + best);
  document.querySelector('.go-btn').textContent = 'Replay';
  document.querySelector('.ov').classList.remove('hide');
}

  document.querySelector('.go-btn').onclick = () => {
  document.querySelector('.ov').classList.add('hide');
  document.querySelector('.intro').style.display = 'none';
  document.querySelector('.res').style.display = 'none';
  
  const msgEl = document.querySelector('.msg');
  
  if (msgEl) msgEl.textContent = '';
  
  init();
  playing = true;
  upd();

  clearInterval(timer);
  timer = setInterval(() => {
    left--;
    upd();
    if (left <= 0) end();
  }, 1000);
};

init();

addEventListener('resize', () => {
  if (!playing && isWide() !== wide) init();
});

const openInfoBtn = document.getElementById('openInfoBtn');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const infoModal = document.getElementById('infoModal');

// 설명 버튼 누르면 모달 열기
openInfoBtn.addEventListener('click', () => {
    infoModal.style.display = 'flex';
});

// X 닫기 버튼 누르면 모달 닫기
closeInfoBtn.addEventListener('click', () => {
    infoModal.style.display = 'none';
});

// 모달 바깥 빈 화면을 눌러도 닫히도록 설정
window.addEventListener('click', (e) => {
    if (e.target === infoModal) {
        infoModal.style.display = 'none';
    }
});