// lightemall.js - Light-Em-All puzzle game logic

// =============================================================================
// GAME STATE
// =============================================================================

const gameState = {
    width: 6,
    height: 6,
    board: [],
    nodes: [],
    powerRow: 0,
    powerCol: 0,
    moves: 0,
    startTime: Date.now(),
    gameWon: false,
    difficulty: 1, // 1=Easy, 2=Medium, 3=Hard
    showRadius: false,
    radius: 0,
    hexMode: false
};

// =============================================================================
// GAME PIECE CLASS
// =============================================================================

class GamePiece {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.left = false;
        this.right = false;
        this.top = false;
        this.bottom = false;
        this.powered = false;
        this.powerStation = false;
        // Hex mode diagonals
        this.topLeft = false;
        this.topRight = false;
        this.bottomLeft = false;
        this.bottomRight = false;
    }

    rotate() {
        if (!gameState.hexMode) {
            const temp = this.top;
            this.top = this.left;
            this.left = this.bottom;
            this.bottom = this.right;
            this.right = temp;
        } else {
            const tempTop = this.top;
            const tempTopRight = this.topRight;
            this.top = this.topLeft;
            this.topLeft = this.left;
            this.left = this.bottomLeft;
            this.bottomLeft = this.bottom;
            this.bottom = this.bottomRight;
            this.bottomRight = this.right;
            this.right = tempTopRight;
            this.topRight = tempTop;
        }
    }

    isConnectedTo(other) {
        if (!gameState.hexMode) {
            if (other.col === this.col - 1 && other.row === this.row) {
                return this.left && other.right;
            }
            if (other.col === this.col + 1 && other.row === this.row) {
                return this.right && other.left;
            }
            if (other.row === this.row - 1 && other.col === this.col) {
                return this.top && other.bottom;
            }
            if (other.row === this.row + 1 && other.col === this.col) {
                return this.bottom && other.top;
            }
        } else {
            // Standard 4 directions
            if (other.col === this.col - 1 && other.row === this.row) return this.left && other.right;
            if (other.col === this.col + 1 && other.row === this.row) return this.right && other.left;
            if (other.row === this.row - 1 && other.col === this.col) return this.top && other.bottom;
            if (other.row === this.row + 1 && other.col === this.col) return this.bottom && other.top;
            // Diagonals
            if (other.row === this.row - 1 && other.col === this.col - 1) return this.topLeft && other.bottomRight;
            if (other.row === this.row - 1 && other.col === this.col + 1) return this.topRight && other.bottomLeft;
            if (other.row === this.row + 1 && other.col === this.col - 1) return this.bottomLeft && other.topRight;
            if (other.row === this.row + 1 && other.col === this.col + 1) return this.bottomRight && other.topLeft;
        }
        return false;
    }
}

// =============================================================================
// UNION-FIND FOR KRUSKAL'S
// =============================================================================

class UnionFind {
    constructor(pieces) {
        this.parent = new Map();
        this.rank = new Map();
        for (const piece of pieces) {
            this.parent.set(piece, piece);
            this.rank.set(piece, 0);
        }
    }

    find(piece) {
        if (this.parent.get(piece) !== piece) {
            this.parent.set(piece, this.find(this.parent.get(piece)));
        }
        return this.parent.get(piece);
    }

    union(x, y) {
        const xRoot = this.find(x);
        const yRoot = this.find(y);
        if (xRoot === yRoot) return false;

        const xRank = this.rank.get(xRoot);
        const yRank = this.rank.get(yRoot);

        if (xRank < yRank) {
            this.parent.set(xRoot, yRoot);
        } else if (xRank > yRank) {
            this.parent.set(yRoot, xRoot);
        } else {
            this.parent.set(yRoot, xRoot);
            this.rank.set(xRoot, xRank + 1);
        }
        return true;
    }
}

// =============================================================================
// MAZE GENERATION (KRUSKAL'S ALGORITHM)
// =============================================================================

function initializeBoard() {
    gameState.board = [];
    gameState.nodes = [];

    for (let col = 0; col < gameState.width; col++) {
        const column = [];
        for (let row = 0; row < gameState.height; row++) {
            const piece = new GamePiece(row, col);
            column.push(piece);
            gameState.nodes.push(piece);
        }
        gameState.board.push(column);
    }

    generateMaze();
}

function getPieceAt(col, row) {
    if (col < 0 || col >= gameState.width || row < 0 || row >= gameState.height) {
        return null;
    }
    return gameState.board[col][row];
}

function calculateWeight() {
    const d = gameState.difficulty;
    if (d === 1) return Math.floor(Math.random() * 50);
    if (d === 3) return Math.floor(Math.random() * 150) + 50;
    return Math.floor(Math.random() * 100);
}

function generateMaze() {
    const edges = [];

    for (let col = 0; col < gameState.width; col++) {
        for (let row = 0; row < gameState.height; row++) {
            const current = getPieceAt(col, row);

            // Right neighbor
            if (col < gameState.width - 1) {
                edges.push({ from: current, to: getPieceAt(col + 1, row), weight: calculateWeight() });
            }
            // Bottom neighbor
            if (row < gameState.height - 1) {
                edges.push({ from: current, to: getPieceAt(col, row + 1), weight: calculateWeight() });
            }

            if (gameState.hexMode) {
                // Diagonal neighbors
                if (col > 0 && row > 0) {
                    edges.push({ from: current, to: getPieceAt(col - 1, row - 1), weight: calculateWeight() });
                }
                if (col < gameState.width - 1 && row > 0) {
                    edges.push({ from: current, to: getPieceAt(col + 1, row - 1), weight: calculateWeight() });
                }
            }
        }
    }

    // Sort by weight
    edges.sort((a, b) => a.weight - b.weight);

    // Kruskal's algorithm
    const uf = new UnionFind(gameState.nodes);

    for (const edge of edges) {
        if (uf.union(edge.from, edge.to)) {
            connectPieces(edge.from, edge.to);
        }
    }
}

function connectPieces(from, to) {
    // Vertical connections
    if (from.col === to.col && from.row === to.row - 1) {
        from.bottom = true;
        to.top = true;
    } else if (from.col === to.col && from.row === to.row + 1) {
        from.top = true;
        to.bottom = true;
    }
    // Horizontal connections
    else if (from.row === to.row && from.col === to.col - 1) {
        from.right = true;
        to.left = true;
    } else if (from.row === to.row && from.col === to.col + 1) {
        from.left = true;
        to.right = true;
    }
    // Diagonal connections (hex mode)
    else if (gameState.hexMode) {
        if (from.row < to.row && from.col < to.col) {
            from.bottomRight = true;
            to.topLeft = true;
        } else if (from.row < to.row && from.col > to.col) {
            from.bottomLeft = true;
            to.topRight = true;
        } else if (from.row > to.row && from.col < to.col) {
            from.topRight = true;
            to.bottomLeft = true;
        } else if (from.row > to.row && from.col > to.col) {
            from.topLeft = true;
            to.bottomRight = true;
        }
    }
}

function randomizeBoard() {
    for (const piece of gameState.nodes) {
        const rotations = Math.floor(Math.random() * (gameState.hexMode ? 8 : 4));
        for (let i = 0; i < rotations; i++) {
            piece.rotate();
        }
    }
}

// =============================================================================
// POWER PROPAGATION (BFS)
// =============================================================================

function getConnectedNeighbors(piece) {
    const neighbors = [];
    const directions = [
        { dc: -1, dr: 0, from: 'left', to: 'right' },
        { dc: 1, dr: 0, from: 'right', to: 'left' },
        { dc: 0, dr: -1, from: 'top', to: 'bottom' },
        { dc: 0, dr: 1, from: 'bottom', to: 'top' }
    ];

    if (gameState.hexMode) {
        directions.push(
            { dc: -1, dr: -1, from: 'topLeft', to: 'bottomRight' },
            { dc: 1, dr: -1, from: 'topRight', to: 'bottomLeft' },
            { dc: -1, dr: 1, from: 'bottomLeft', to: 'topRight' },
            { dc: 1, dr: 1, from: 'bottomRight', to: 'topLeft' }
        );
    }

    for (const dir of directions) {
        const neighbor = getPieceAt(piece.col + dir.dc, piece.row + dir.dr);
        if (neighbor && piece[dir.from] && neighbor[dir.to]) {
            neighbors.push(neighbor);
        }
    }

    return neighbors;
}

function updatePower() {
    // Reset all power
    for (const piece of gameState.nodes) {
        piece.powered = false;
    }

    const powerSource = getPieceAt(gameState.powerCol, gameState.powerRow);
    if (!powerSource) return;

    const distances = new Map();
    const queue = [powerSource];
    distances.set(powerSource, 0);

    while (queue.length > 0) {
        const current = queue.shift();
        const dist = distances.get(current);

        // Power if within radius or radius disabled
        if (!gameState.showRadius || dist <= gameState.radius) {
            current.powered = true;
        }

        for (const neighbor of getConnectedNeighbors(current)) {
            if (!distances.has(neighbor)) {
                distances.set(neighbor, dist + 1);
                queue.push(neighbor);
            }
        }
    }
}

function calculateRadius() {
    // Find diameter via two BFS passes
    const start = getPieceAt(gameState.powerCol, gameState.powerRow);
    const furthest1 = bfsFurthest(start);
    const furthest2 = bfsFurthest(furthest1);
    const diameter = getDistance(furthest1, furthest2);
    return Math.floor(diameter / 2) + 1;
}

function bfsFurthest(start) {
    const distances = new Map();
    const queue = [start];
    distances.set(start, 0);
    let furthest = start;
    let maxDist = 0;

    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of getConnectedNeighbors(current)) {
            if (!distances.has(neighbor)) {
                const dist = distances.get(current) + 1;
                distances.set(neighbor, dist);
                queue.push(neighbor);
                if (dist > maxDist) {
                    maxDist = dist;
                    furthest = neighbor;
                }
            }
        }
    }
    return furthest;
}

function getDistance(from, to) {
    const distances = new Map();
    const queue = [from];
    distances.set(from, 0);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current === to) return distances.get(current);

        for (const neighbor of getConnectedNeighbors(current)) {
            if (!distances.has(neighbor)) {
                distances.set(neighbor, distances.get(current) + 1);
                queue.push(neighbor);
            }
        }
    }
    return -1;
}

// =============================================================================
// GAME LOGIC
// =============================================================================

function isGameWon() {
    return gameState.nodes.every(piece => piece.powered);
}

function movePowerStation(newCol, newRow) {
    const current = getPieceAt(gameState.powerCol, gameState.powerRow);
    const target = getPieceAt(newCol, newRow);

    if (target && current.isConnectedTo(target)) {
        current.powerStation = false;
        target.powerStation = true;
        gameState.powerCol = newCol;
        gameState.powerRow = newRow;
        gameState.moves++;
        updatePower();
        checkWin();
    }
}

function checkWin() {
    if (isGameWon() && !gameState.gameWon) {
        gameState.gameWon = true;
        renderGame();
        showMessage(`◆ PUZZLE SOLVED! (${gameState.moves} moves)`, 'win');
    }
}

function initGame() {
    gameState.moves = 0;
    gameState.startTime = Date.now();
    gameState.gameWon = false;
    gameState.powerRow = 0;
    gameState.powerCol = 0;

    initializeBoard();

    const powerPiece = getPieceAt(gameState.powerCol, gameState.powerRow);
    powerPiece.powerStation = true;

    gameState.radius = calculateRadius();
    randomizeBoard();
    updatePower();

    hideMessage();
    renderGame();
}

// =============================================================================
// RENDERING
// =============================================================================

function renderGame() {
    renderBoard();
    renderStats();
}

function renderBoard() {
    const boardGrid = document.getElementById('board-grid');
    if (!boardGrid) return;

    boardGrid.innerHTML = '';
    boardGrid.style.gridTemplateColumns = `repeat(${gameState.width}, 1fr)`;

    // Calculate dynamic cell size based on viewport and grid dimensions
    const container = document.querySelector('.lea-container');
    const maxBoardWidth = container ? container.clientWidth - 32 : 400; // padding
    const maxCellSize = Math.floor(maxBoardWidth / gameState.width) - 4; // gap
    const cellSize = Math.min(60, Math.max(30, maxCellSize));

    for (let row = 0; row < gameState.height; row++) {
        for (let col = 0; col < gameState.width; col++) {
            const piece = getPieceAt(col, row);
            const cell = document.createElement('div');
            cell.className = 'lea-cell';
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;

            if (piece.powered) {
                cell.classList.add('powered');
            }

            // Build wire SVG
            const wireColor = piece.powered ? '#FFD700' : '#555';
            let svg = `<svg viewBox="0 0 100 100" class="wire-svg">`;

            // Center dot
            svg += `<circle cx="50" cy="50" r="8" fill="${wireColor}"/>`;

            // Wires
            if (piece.top) svg += `<line x1="50" y1="50" x2="50" y2="0" stroke="${wireColor}" stroke-width="8"/>`;
            if (piece.bottom) svg += `<line x1="50" y1="50" x2="50" y2="100" stroke="${wireColor}" stroke-width="8"/>`;
            if (piece.left) svg += `<line x1="50" y1="50" x2="0" y2="50" stroke="${wireColor}" stroke-width="8"/>`;
            if (piece.right) svg += `<line x1="50" y1="50" x2="100" y2="50" stroke="${wireColor}" stroke-width="8"/>`;

            if (gameState.hexMode) {
                if (piece.topLeft) svg += `<line x1="50" y1="50" x2="10" y2="10" stroke="${wireColor}" stroke-width="6"/>`;
                if (piece.topRight) svg += `<line x1="50" y1="50" x2="90" y2="10" stroke="${wireColor}" stroke-width="6"/>`;
                if (piece.bottomLeft) svg += `<line x1="50" y1="50" x2="10" y2="90" stroke="${wireColor}" stroke-width="6"/>`;
                if (piece.bottomRight) svg += `<line x1="50" y1="50" x2="90" y2="90" stroke="${wireColor}" stroke-width="6"/>`;
            }

            // Power station
            if (piece.powerStation) {
                svg += `<polygon points="50,20 58,40 80,40 62,52 70,75 50,60 30,75 38,52 20,40 42,40" fill="#00FFFF" stroke="#FF8000" stroke-width="2"/>`;
            }

            svg += `</svg>`;
            cell.innerHTML = svg;

            cell.addEventListener('click', () => {
                if (gameState.gameWon) return;
                piece.rotate();
                gameState.moves++;
                updatePower();
                renderGame();
                checkWin();
            });

            boardGrid.appendChild(cell);
        }
    }
}

function renderStats() {
    const movesEl = document.getElementById('lea-moves');
    const timeEl = document.getElementById('lea-time');

    if (movesEl) movesEl.textContent = gameState.moves;
    if (timeEl) {
        const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

function showMessage(text, type) {
    const msg = document.getElementById('lea-message');
    if (msg) {
        msg.textContent = text;
        msg.className = `lea-message show ${type}`;
    }
}

function hideMessage() {
    const msg = document.getElementById('lea-message');
    if (msg) msg.className = 'lea-message';
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    // Mode buttons (difficulty)
    document.querySelectorAll('.lea-mode-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.lea-mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            gameState.difficulty = parseInt(this.dataset.difficulty);
            initGame();
        });
    });

    // Size buttons
    document.querySelectorAll('.lea-size-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.lea-size-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const size = parseInt(this.dataset.size);
            gameState.width = size;
            gameState.height = size;
            initGame();
        });
    });

    // Reset button
    const resetBtn = document.getElementById('lea-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            initGame();
        });
    }

    // Radius toggle button
    const radiusBtn = document.getElementById('lea-radius');
    if (radiusBtn) {
        radiusBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            gameState.showRadius = !gameState.showRadius;
            this.classList.toggle('active', gameState.showRadius);
            updatePower();
            renderGame();
        });
    }

    // Hex mode toggle button
    const hexBtn = document.getElementById('lea-hex');
    if (hexBtn) {
        hexBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            gameState.hexMode = !gameState.hexMode;
            this.classList.toggle('active', gameState.hexMode);
            initGame();
        });
    }

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Don't handle if focus is on an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (gameState.gameWon) return;

        let newCol = gameState.powerCol;
        let newRow = gameState.powerRow;

        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                newRow--; break;
            case 'ArrowDown': case 's': case 'S':
                newRow++; break;
            case 'ArrowLeft': case 'a': case 'A':
                newCol--; break;
            case 'ArrowRight': case 'd': case 'D':
                newCol++; break;
            case 'r': case 'R':
                gameState.showRadius = !gameState.showRadius;
                document.getElementById('lea-radius')?.classList.toggle('active', gameState.showRadius);
                updatePower();
                renderGame();
                return;
            case 'h': case 'H':
                gameState.hexMode = !gameState.hexMode;
                document.getElementById('lea-hex')?.classList.toggle('active', gameState.hexMode);
                initGame();
                return;
            default:
                return;
        }

        if (newCol >= 0 && newCol < gameState.width && newRow >= 0 && newRow < gameState.height) {
            movePowerStation(newCol, newRow);
            renderGame();
        }
    });

    // Timer update
    setInterval(() => {
        if (!gameState.gameWon) {
            renderStats();
        }
    }, 1000);
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        initGame();
    });
} else {
    // DOM already loaded
    setupEventListeners();
    initGame();
}

// Re-render on resize for responsive board (debounced)
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (gameState.nodes.length > 0) {
            renderBoard();
        }
    }, 100);
});