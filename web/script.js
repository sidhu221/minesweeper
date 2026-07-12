const LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

const boardEl = document.getElementById("board");
const mineCounterEl = document.getElementById("mine-counter");
const timerEl = document.getElementById("timer");
const faceBtn = document.getElementById("face-btn");
const diffBtns = document.querySelectorAll(".diff-btn");

let level = "beginner";
let rows, cols, totalMines;
let board = [];        // true = mine
let revealed = [];
let flagged = [];
let firstClick = true;
let gameOver = false;
let flagsPlaced = 0;
let cellsRevealed = 0;
let timerInterval = null;
let seconds = 0;

function inBounds(r, c) {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function neighbors(r, c) {
  const result = [];
  for (let i = r - 1; i <= r + 1; i++) {
    for (let j = c - 1; j <= c + 1; j++) {
      if ((i !== r || j !== c) && inBounds(i, j)) result.push([i, j]);
    }
  }
  return result;
}

function nearbyMines(r, c) {
  let count = 0;
  for (const [i, j] of neighbors(r, c)) {
    if (board[i][j]) count += 1;
  }
  return count;
}

function placeMines(excludeCells) {
  board = Array.from({ length: rows }, () => Array(cols).fill(false));
  let placed = 0;
  while (placed < totalMines) {
    const i = Math.floor(Math.random() * rows);
    const j = Math.floor(Math.random() * cols);
    if (board[i][j]) continue;
    if (excludeCells.some(([er, ec]) => er === i && ec === j)) continue;
    board[i][j] = true;
    placed += 1;
  }
}

function startTimer() {
  stopTimer();
  seconds = 0;
  timerEl.textContent = "000";
  timerInterval = setInterval(() => {
    seconds = Math.min(seconds + 1, 999);
    timerEl.textContent = String(seconds).padStart(3, "0");
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function updateMineCounter() {
  const remaining = Math.max(totalMines - flagsPlaced, -99);
  mineCounterEl.textContent = String(remaining).padStart(3, remaining < 0 ? "-" : "0").slice(-3);
  if (remaining < 0) mineCounterEl.textContent = "-" + String(Math.abs(remaining)).padStart(2, "0");
}

function setFace(state) {
  faceBtn.textContent = { playing: "🙂", won: "😎", lost: "😵", pressed: "😮" }[state];
}

function buildBoard() {
  const { rows: r, cols: c, mines } = LEVELS[level];
  rows = r; cols = c; totalMines = mines;
  revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
  flagged = Array.from({ length: rows }, () => Array(cols).fill(false));
  board = Array.from({ length: rows }, () => Array(cols).fill(false));
  firstClick = true;
  gameOver = false;
  flagsPlaced = 0;
  cellsRevealed = 0;
  stopTimer();
  timerEl.textContent = "000";
  setFace("playing");
  updateMineCounter();

  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
  boardEl.style.gridTemplateRows = `repeat(${rows}, var(--cell-size))`;
  boardEl.innerHTML = "";

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.addEventListener("click", onLeftClick);
      cell.addEventListener("contextmenu", onRightClick);
      cell.addEventListener("dblclick", onChord);
      boardEl.appendChild(cell);
    }
  }
}

function cellEl(r, c) {
  return boardEl.children[r * cols + c];
}

function onLeftClick(e) {
  if (gameOver) return;
  const r = Number(e.currentTarget.dataset.row);
  const c = Number(e.currentTarget.dataset.col);
  if (flagged[r][c] || revealed[r][c]) return;

  if (firstClick) {
    placeMines(neighbors(r, c).concat([[r, c]]));
    firstClick = false;
    startTimer();
  }

  if (board[r][c]) {
    loseGame(r, c);
    return;
  }

  revealCell(r, c);
  checkWin();
}

function onRightClick(e) {
  e.preventDefault();
  if (gameOver) return;
  const r = Number(e.currentTarget.dataset.row);
  const c = Number(e.currentTarget.dataset.col);
  if (revealed[r][c]) return;

  flagged[r][c] = !flagged[r][c];
  flagsPlaced += flagged[r][c] ? 1 : -1;
  e.currentTarget.textContent = flagged[r][c] ? "🚩" : "";
  updateMineCounter();
}

function onChord(e) {
  if (gameOver) return;
  const r = Number(e.currentTarget.dataset.row);
  const c = Number(e.currentTarget.dataset.col);
  if (!revealed[r][c]) return;

  const count = nearbyMines(r, c);
  const flaggedNeighbors = neighbors(r, c).filter(([i, j]) => flagged[i][j]).length;
  if (flaggedNeighbors !== count) return;

  for (const [i, j] of neighbors(r, c)) {
    if (flagged[i][j] || revealed[i][j]) continue;
    if (board[i][j]) {
      loseGame(i, j);
      return;
    }
    revealCell(i, j);
  }
  checkWin();
}

function revealCell(r, c) {
  if (revealed[r][c] || flagged[r][c]) return;
  revealed[r][c] = true;
  cellsRevealed += 1;

  const el = cellEl(r, c);
  el.classList.add("revealed");

  const count = nearbyMines(r, c);
  if (count > 0) {
    el.textContent = count;
    el.dataset.count = count;
  } else {
    el.textContent = "";
    for (const [i, j] of neighbors(r, c)) {
      revealCell(i, j);
    }
  }
}

function loseGame(hitR, hitC) {
  gameOver = true;
  stopTimer();
  setFace("lost");
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const el = cellEl(i, j);
      if (board[i][j] && !flagged[i][j]) {
        el.classList.add("revealed");
        el.textContent = "💣";
        if (i === hitR && j === hitC) el.classList.add("mine");
      } else if (!board[i][j] && flagged[i][j]) {
        el.classList.add("revealed");
        el.textContent = "❌";
      }
    }
  }
}

function checkWin() {
  if (cellsRevealed === rows * cols - totalMines) {
    gameOver = true;
    stopTimer();
    setFace("won");
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (board[i][j] && !flagged[i][j]) {
          flagged[i][j] = true;
          flagsPlaced += 1;
          cellEl(i, j).textContent = "🚩";
        }
      }
    }
    updateMineCounter();
  }
}

faceBtn.addEventListener("click", () => buildBoard());

diffBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    diffBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    level = btn.dataset.level;
    buildBoard();
  });
});

buildBoard();
