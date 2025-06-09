const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 5;
const DRAG_THRESHOLD = 4;

const board = document.getElementById("board");
const resetBtn = document.getElementById("reset");
const settingBtn = document.getElementById("setting");
const messageElm = document.getElementById("message");

/**
 * @typedef {Object} PieceInfo
 * @property {string} id - Identifier
 * @property {number} x - X coordinate (left)
 * @property {number} y - Y coordinate (top)
 * @property {number} w - Width
 * @property {number} h - Height
 */

/**
 * @typedef {Object} DragInfo
 * @property {number} clientX - X coordinate at drag start
 * @property {number} clientY - Y coordinate at drag start
 * @property {PieceInfo} piece - Piece info being dragged
 */

/**
 * Piece definitions: initial position and size of each piece on the board
 * @type {PieceInfo[]}
 */
let pieces = [
  // { id: "pieceID", x: left, y: top, w: width, h: height }
  { id: "1", x: 1, y: 0, w: 2, h: 2 },
  { id: "2", x: 0, y: 0, w: 1, h: 2 },
  { id: "3", x: 3, y: 0, w: 1, h: 2 },
  { id: "4", x: 0, y: 2, w: 1, h: 2 },
  { id: "5", x: 1, y: 2, w: 2, h: 1 },
  { id: "6", x: 3, y: 2, w: 1, h: 2 },
  { id: "7", x: 1, y: 3, w: 1, h: 1 },
  { id: "8", x: 2, y: 3, w: 1, h: 1 },
  { id: "9", x: 0, y: 4, w: 1, h: 1 },
  { id: "a", x: 3, y: 4, w: 1, h: 1 },
];

/**
 * Save the initial state of the board as a JSON string.
 * This allows resetting to the initial state.
 * @type {string}
 */
let initialPiecesJson = JSON.stringify(pieces);

/**
 * Generate a message representing the current board state
 * @returns {string} - Message representing the current board state
 */
function createMessage() {
  if (lastMovedPieceId === null || moveCount === 0) {
    return "You can move pieces by clicking or dragging.";
  }
  if (lastMoveDirections.length === 0) {
    return `(Step ${moveCount + 1}: Cancelled)`;
  }
  let isGoalReached = pieces.some(
    (p) => p.id === "1" && p.x === 1 && p.y === 3
  );
  if (isGoalReached) {
    return `Congratulations! You reached the goal in ${moveCount} moves!`;
  }
  let dir = lastMoveDirections.map((d) => directionMessage(...d)).join(" and ");
  return `Step ${moveCount}: Move piece #${lastMovedPieceId}: ${dir}`;
}

/**
 * Generate a message representing the move direction
 * @param {number} dx - X direction delta
 * @param {number} dy - Y direction delta
 * @returns {string} - Direction message
 */
function directionMessage(dx, dy) {
  if (dx === 0) {
    return dy > 0 ? "Down" : "Up";
  } else {
    return dx > 0 ? "Right" : "Left";
  }
}

/**
 * Redraw the board based on the current state of pieces
 */
function renderBoard() {
  board.innerHTML = "";
  for (const p of pieces) {
    const div = document.createElement("div");
    div.className = p.id === "1" ? "large-piece" : "piece";
    div.style.gridColumn = `${p.x + 1} / span ${p.w}`;
    div.style.gridRow = `${p.y + 1} / span ${p.h}`;
    div.textContent = p.id;

    div.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onDragStart(e.clientX, e.clientY, p);
    });

    div.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      onDragStart(t.clientX, t.clientY, p);
    });

    board.appendChild(div);
  }
  messageElm.textContent = createMessage();
}

/**
 * Variable to hold drag start info
 * @type {DragInfo|null}
 */
let dragInfo = null;

/**
 * Record drag start info
 * @param {number} clientX - X coordinate at drag start
 * @param {number} clientY - Y coordinate at drag start
 * @param {PieceInfo} piece - Piece info being dragged
 */
function onDragStart(clientX, clientY, piece) {
  dragInfo = { clientX, clientY, piece };
}

/**
 * Determine and execute move at drag end
 * @param {number} clientX - X coordinate at drag end
 * @param {number} clientY - Y coordinate at drag end
 */
function onDragEnd(clientX, clientY) {
  // Do nothing if no drag info
  if (!dragInfo) return;
  const dx = clientX - dragInfo.clientX;
  const dy = clientY - dragInfo.clientY;
  const piece = dragInfo.piece;

  if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) {
    // If drag distance is small, try auto move
    autoMoveIfPossible(piece);
  } else if (Math.abs(dx) > Math.abs(dy)) {
    // Move horizontally
    moveIfPossible(piece, Math.sign(dx), 0);
  } else {
    // Move vertically
    moveIfPossible(piece, 0, Math.sign(dy));
  }
  dragInfo = null;
}

/**
 * If only one direction is movable, move automatically
 * @param {PieceInfo} piece - Target piece
 */
function autoMoveIfPossible(piece) {
  // Check 4 directions
  const dirs = [
    [-1, 0], // left
    [0, -1], // up
    [1, 0], // right
    [0, 1], // down
  ];
  // Extract movable directions
  let movableDirs = dirs.filter((d) => isMovable(piece, ...d));
  if (movableDirs.length === 1) {
    // If only one direction is movable, move in that direction
    doMove(piece, ...movableDirs[0]);
  } else if (
    movableDirs.length === 2 &&
    lastMovedPieceId === piece.id &&
    lastMoveDirections.length > 0
  ) {
    // If two directions are movable and the last moved piece is the same,
    // it will move to a different position than it was in before.
    const [prevDx, prevDy] = lastMoveDirections[0];
    if (prevDx === -movableDirs[0][0] && prevDy === -movableDirs[0][1]) {
      doMove(piece, ...movableDirs[1]);
    } else {
      doMove(piece, ...movableDirs[0]);
    }
  }
}

/**
 * Move if possible in the specified direction
 * @param {PieceInfo} piece - Target piece
 * @param {number} dx - X direction delta
 * @param {number} dy - Y direction delta
 */
function moveIfPossible(piece, dx, dy) {
  if (isMovable(piece, dx, dy)) {
    doMove(piece, dx, dy);
  }
}

/**
 * Number of moves so far
 * @type {number}
 */
let moveCount = 0;

/**
 * Last moved piece ID
 * @type {string|null}
 */
let lastMovedPieceId = null;

/**
 * List of move directions for the last moved piece
 * @type {Array<[number, number]>}
 */
let lastMoveDirections = [];

/**
 * Move the piece in the specified direction and redraw the board
 * @param {PieceInfo} piece - Target piece
 * @param {number} dx - X direction delta
 * @param {number} dy - Y direction delta
 */
function doMove(piece, dx, dy) {
  piece.x += dx;
  piece.y += dy;

  if (lastMovedPieceId !== piece.id) {
    // New move for a different piece
    lastMovedPieceId = piece.id;
    lastMoveDirections = [[dx, dy]];
    moveCount++;
  } else if (
    lastMoveDirections.length == 1 &&
    lastMoveDirections[0][0] === -dx &&
    lastMoveDirections[0][1] === -dy
  ) {
    // Second move cancels the first move
    lastMovedPieceId = "?";
    lastMoveDirections = [];
    moveCount--;
  } else if (
    lastMoveDirections.length == 2 &&
    lastMoveDirections[1][0] === -dx &&
    lastMoveDirections[1][1] === -dy
  ) {
    // Third move cancels the second move
    lastMoveDirections = [lastMoveDirections[0]];
  } else {
    // Subsequent moves for the same piece do not increase move count
    lastMoveDirections.push([dx, dy]);
  }

  renderBoard();
}

/**
 * Check if the piece can move in the specified direction
 * @param {PieceInfo} piece - Target piece
 * @param {number} dx - X direction delta
 * @param {number} dy - Y direction delta
 * @returns {boolean} - true if movable
 */
function isMovable(piece, dx, dy) {
  // Check if the destination is out of bounds
  if (isOutOfBounds(piece, dx, dy)) {
    return false;
  }

  // Check if it overlaps with other pieces
  return pieces
    .filter((p) => p !== piece)
    .every((other) => !isOverlap(piece, dx, dy, other));
}

/**
 * Check if the piece will be out of bounds after moving
 * @param {PieceInfo} piece - Target piece
 * @param {number} dx - X direction delta
 * @param {number} dy - Y direction delta
 * @returns {boolean} - true if out of bounds
 */
function isOutOfBounds(piece, dx, dy) {
  const newX = piece.x + dx;
  const newY = piece.y + dy;

  return (
    newX < 0 ||
    newY < 0 ||
    newX + piece.w > BOARD_WIDTH ||
    newY + piece.h > BOARD_HEIGHT
  );
}

/**
 * Check if the piece will overlap with another piece after moving
 * @param {PieceInfo} piece - Target piece
 * @param {number} dx - X direction delta
 * @param {number} dy - Y direction delta
 * @param {PieceInfo} otherPiece - Other piece to compare
 * @returns {boolean} - true if overlapping
 */
function isOverlap(piece, dx, dy, otherPiece) {
  const newX = piece.x + dx;
  const newY = piece.y + dy;

  return (
    newX < otherPiece.x + otherPiece.w &&
    newX + piece.w > otherPiece.x &&
    newY < otherPiece.y + otherPiece.h &&
    newY + piece.h > otherPiece.y
  );
}

/**
 * Parse the board state from a hexadecimal string and convert it to an array of piece info
 * @param {string} hexStr - Board state as a hexadecimal string
 * @returns {PieceInfo[]} - Array of piece info
 * @throws {Error} - If the board string is invalid
 */
function parseBoard(hexStr) {
  const clearHex = hexStr.replace(/^0x/, "").replace(/_/g, "");
  const cells = clearHex.split("");
  if (cells.length !== BOARD_WIDTH * BOARD_HEIGHT) {
    throw new Error("Invalid state string length");
  }
  const grid = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const index = y * BOARD_WIDTH + x;
      row.push(cells[index]);
    }
    grid.push(row);
  }

  const pieces = {};
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (grid[y][x] === "0") {
        continue;
      }
      const id = grid[y][x];
      if (!pieces[id]) {
        pieces[id] = { id, x, y, w: 1, h: 1 };
      } else {
        pieces[id].w = Math.max(pieces[id].w, x - pieces[id].x + 1);
        pieces[id].h = Math.max(pieces[id].h, y - pieces[id].y + 1);
      }
    }
  }
  return Object.values(pieces);
}

/**
 * Reset the board to its initial state
 */
function resetBoard() {
  pieces = JSON.parse(initialPiecesJson);
  moveCount = 0;
  lastMovedPieceId = null;
  lastMoveDirections = [];
  renderBoard();
}

/**
 * Input the board state as a hexadecimal string and update the board
 */
function inputBoardState() {
  const hexStr = prompt(
    "Enter the board state as a hexadecimal string (e.g. 0x2113_2113_4556_4786_900a):",
    "0x2113_2113_4556_4786_900a"
  );
  if (!hexStr) {
    alert("Input was cancelled.");
    return;
  }

  try {
    initialPiecesJson = JSON.stringify(parseBoard(hexStr));
    resetBoard();
  } catch (error) {
    alert(`Invalid input: ${error.message}`);
    return;
  }
}

document.addEventListener("mouseup", (e) => {
  onDragEnd(e.clientX, e.clientY);
});

document.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  onDragEnd(t.clientX, t.clientY);
});

resetBtn.addEventListener("click", () => resetBoard());

settingBtn.addEventListener("click", () => inputBoardState());

renderBoard();
