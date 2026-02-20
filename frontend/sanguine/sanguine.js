// sanguine.js - Game logic for Sanguine strategy card game

// Card definitions with influence grids
const CARD_DECK = [
    { name: "Knight", cost: 1, value: 3, grid: ["XXXXX","XXIXX","XXCXX","XXIXX","XXXXX"] },
    { name: "Pekka", cost: 1, value: 4, grid: ["XXXXX","XIXXI","XXCXX","XIXXI","XXXXX"] },
    { name: "Barbarian", cost: 2, value: 5, grid: ["XXXXX","XXIXX","XICIX","XXIXX","XXXXX"] },
    { name: "Witch", cost: 2, value: 6, grid: ["XXIXX","XXIXX","XXCXX","XXIXX","XXIXX"] },
    { name: "Musketeer", cost: 2, value: 8, grid: ["XIXIX","IXIXI","XXCXX","IXIXI","XIXIX"] },
    { name: "Archer", cost: 1, value: 2, grid: ["XXXXX","XIIII","XXCXX","XIIII","XXXXX"] },
    { name: "Giant", cost: 3, value: 7, grid: ["XIIIX","XIIIX","IICII","XIIIX","XIIIX"] },
    { name: "Wizard", cost: 2, value: 5, grid: ["IIXII","IIXII","XXCXX","IIXII","IIXII"] },
    { name: "Healer", cost: 1, value: 3, grid: ["XXXXX","XXXXX","IICII","XXXXX","XXXXX"] },
    { name: "Dragon", cost: 3, value: 10, grid: ["IIIII","IIIII","IICII","IIIII","IIIII"] },
    { name: "Goblin", cost: 1, value: 1, grid: ["XXXXX","XXXXX","XXCXX","XXXXX","XXXXX"] },
    { name: "Valkyrie", cost: 2, value: 4, grid: ["XIIII","XXXXX","XXCXX","XXXXX","XIIII"] },
    { name: "Golem", cost: 3, value: 6, grid: ["XXXXX","IIXII","IICII","IIXII","XXXXX"] },
    { name: "Miner", cost: 1, value: 2, grid: ["XXXXX","XXXIX","XXCXX","XXXIX","XXXXX"] },
    { name: "Prince", cost: 2, value: 5, grid: ["XXXXX","IXXXI","XICIX","IXXXI","XXXXX"] }
];

// Display names for players
const PLAYER_NAMES = {
    'RED': 'PINK',
    'BLUE': 'TEAL'
};

// Game state
let gameState = {
    board: [],
    redHand: [],
    blueHand: [],
    redDeck: [],
    blueDeck: [],
    currentPlayer: 'RED',
    selectedCard: null,
    consecutivePasses: 0,
    gameOver: false,
    mode: 'pvp'
};

// Initialize the game
function initGame() {
    gameState.board = [];
    gameState.consecutivePasses = 0;
    gameState.gameOver = false;
    gameState.selectedCard = null;
    gameState.currentPlayer = 'RED';

    // Create board (3 rows, 5 columns)
    for (let row = 0; row < 3; row++) {
        gameState.board[row] = [];
        for (let col = 0; col < 5; col++) {
            gameState.board[row][col] = {
                owner: null,
                pawns: 0,
                card: null
            };
        }
    }

    // Initialize starting pawns
    for (let row = 0; row < 3; row++) {
        gameState.board[row][0].owner = 'RED';
        gameState.board[row][0].pawns = 1;
        gameState.board[row][4].owner = 'BLUE';
        gameState.board[row][4].pawns = 1;
    }

    // Shuffle and distribute cards
    const shuffledDeck = [...CARD_DECK].sort(() => Math.random() - 0.5);
    gameState.redDeck = shuffledDeck.map(c => ({...c}));
    gameState.blueDeck = [...CARD_DECK].sort(() => Math.random() - 0.5).map(c => ({...c}));
    
    gameState.redHand = [];
    gameState.blueHand = [];
    
    // Deal 5 cards to each player
    for (let i = 0; i < 5; i++) {
        if (gameState.redDeck.length > 0) {
            gameState.redHand.push(gameState.redDeck.shift());
        }
        if (gameState.blueDeck.length > 0) {
            gameState.blueHand.push(gameState.blueDeck.shift());
        }
    }

    renderGame();
    hideMessage();

    if (gameState.mode === 'eve') {
        setTimeout(aiTurn, 500);
    }
}

// Check if a move is legal
function isLegalMove(cardIndex, row, col) {
    const hand = gameState.currentPlayer === 'RED' ? gameState.redHand : gameState.blueHand;
    if (cardIndex < 0 || cardIndex >= hand.length) return false;
    
    const cell = gameState.board[row][col];
    const card = hand[cardIndex];
    
    return cell.owner === gameState.currentPlayer &&
           cell.pawns >= card.cost &&
           cell.card === null;
}

// Get influence character at position for a player
function getInfluenceAt(card, dr, dc, player) {
    const gridRow = dr + 2;
    let gridCol = dc + 2;
    if (player === 'BLUE') {
        gridCol = 4 - gridCol;
    }
    return card.grid[gridRow][gridCol];
}

// Apply influence from a placed card
function applyInfluence(row, col, card, player) {
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const r = row + dr;
            const c = col + dc;
            
            if (r < 0 || r >= 3 || c < 0 || c >= 5) continue;
            
            const influence = getInfluenceAt(card, dr, dc, player);
            if (influence === 'I') {
                addPawn(r, c, player);
            }
        }
    }
}

// Add a pawn to a cell
function addPawn(row, col, player) {
    const cell = gameState.board[row][col];
    
    if (cell.card !== null) return;
    
    if (cell.owner === null) {
        cell.owner = player;
        cell.pawns = 1;
    } else if (cell.owner === player) {
        if (cell.pawns < 3) {
            cell.pawns++;
        }
    } else {
        cell.owner = player;
        cell.pawns = 1;
    }
}

// Play a card
function playCard(cardIndex, row, col) {
    if (gameState.gameOver) return;
    if (!isLegalMove(cardIndex, row, col)) return;
    
    const hand = gameState.currentPlayer === 'RED' ? gameState.redHand : gameState.blueHand;
    const card = hand[cardIndex];
    const cell = gameState.board[row][col];
    
    cell.card = card;
    cell.owner = gameState.currentPlayer;
    cell.pawns = 0;
    
    applyInfluence(row, col, card, gameState.currentPlayer);
    hand.splice(cardIndex, 1);
    drawCard();
    
    gameState.consecutivePasses = 0;
    gameState.selectedCard = null;
    
    switchTurn();
}

// Draw a card for current player
function drawCard() {
    const deck = gameState.currentPlayer === 'RED' ? gameState.redDeck : gameState.blueDeck;
    const hand = gameState.currentPlayer === 'RED' ? gameState.redHand : gameState.blueHand;
    
    if (deck.length > 0) {
        hand.push(deck.shift());
    }
}

// Pass turn
function passTurn() {
    if (gameState.gameOver) return;
    
    gameState.consecutivePasses++;
    drawCard();
    gameState.selectedCard = null;
    switchTurn();
}

// Switch turns
function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 'RED' ? 'BLUE' : 'RED';
    
    if (checkGameOver()) {
        endGame();
    } else {
        renderGame();
        
        if (!gameState.gameOver) {
            if (gameState.mode === 'eve' || 
                (gameState.mode === 'pve' && gameState.currentPlayer === 'BLUE')) {
                setTimeout(aiTurn, 600);
            }
        }
    }
}

// Check if game is over
function checkGameOver() {
    if (gameState.consecutivePasses >= 2) return true;
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            if (gameState.board[row][col].card === null) {
                return false;
            }
        }
    }
    return true;
}

// Calculate row scores
function getRowScores(row) {
    let red = 0, blue = 0;
    
    for (let col = 0; col < 5; col++) {
        const cell = gameState.board[row][col];
        if (cell.card !== null) {
            if (cell.owner === 'RED') {
                red += cell.card.value;
            } else {
                blue += cell.card.value;
            }
        }
    }
    
    return { red, blue };
}

// Calculate total scores
function getTotalScores() {
    let redTotal = 0, blueTotal = 0;
    
    for (let row = 0; row < 3; row++) {
        const scores = getRowScores(row);
        if (scores.red > scores.blue) {
            redTotal += scores.red;
        } else if (scores.blue > scores.red) {
            blueTotal += scores.blue;
        }
    }
    
    return { red: redTotal, blue: blueTotal };
}

// End the game
function endGame() {
    gameState.gameOver = true;
    const scores = getTotalScores();
    
    let message, className;
    if (scores.red > scores.blue) {
        message = `◆ PINK WINS! (${scores.red} - ${scores.blue})`;
        className = 'win-red';
    } else if (scores.blue > scores.red) {
        message = `◆ TEAL WINS! (${scores.blue} - ${scores.red})`;
        className = 'win-blue';
    } else {
        message = `◇ TIE GAME! (${scores.red} - ${scores.blue})`;
        className = 'tie';
    }
    
    showMessage(message, className);
    renderGame();
}

// AI logic - simple greedy strategy
function aiTurn() {
    if (gameState.gameOver) return;
    
    const hand = gameState.currentPlayer === 'RED' ? gameState.redHand : gameState.blueHand;
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (let cardIdx = 0; cardIdx < hand.length; cardIdx++) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                if (isLegalMove(cardIdx, row, col)) {
                    const card = hand[cardIdx];
                    const rowScores = getRowScores(row);
                    const myScore = gameState.currentPlayer === 'RED' ? rowScores.red : rowScores.blue;
                    const oppScore = gameState.currentPlayer === 'RED' ? rowScores.blue : rowScores.red;
                    
                    let score = card.value * 2;
                    if (myScore + card.value > oppScore) score += 10;
                    if (col === 2) score += 3;
                    score -= Math.abs(col - 2);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { cardIdx, row, col };
                    }
                }
            }
        }
    }
    
    if (bestMove) {
        playCard(bestMove.cardIdx, bestMove.row, bestMove.col);
    } else {
        passTurn();
    }
}

// =============================================================================
// RENDERING
// =============================================================================

function renderGame() {
    renderBoard();
    renderHands();
    renderScores();
    renderTurnIndicator();
}

function renderBoard() {
    const boardGrid = document.getElementById('board-grid');
    boardGrid.innerHTML = '';
    
    // Pawn symbols
    const PINK_PAWN = '♙';
    const TEAL_PAWN = '♟';
    
    for (let row = 0; row < 3; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        
        for (let col = 0; col < 5; col++) {
            const cell = gameState.board[row][col];
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            
            if (cell.card !== null) {
                cellDiv.classList.add('has-card');
                cellDiv.classList.add(cell.owner === 'RED' ? 'red-card' : 'blue-card');
                cellDiv.innerHTML = `
                    <div class="card-display">
                        <div class="card-name">${cell.card.name}</div>
                        <div class="card-value">${cell.card.value}</div>
                    </div>
                `;
            } else if (cell.owner !== null) {
                cellDiv.classList.add(cell.owner === 'RED' ? 'red-owned' : 'blue-owned');
                const pawnSymbol = cell.owner === 'RED' ? PINK_PAWN : TEAL_PAWN;
                const pawns = pawnSymbol.repeat(cell.pawns);
                cellDiv.innerHTML = `<div class="pawn-count">${pawns}</div>`;
                
                if (gameState.selectedCard !== null && 
                    isLegalMove(gameState.selectedCard, row, col)) {
                    cellDiv.classList.add('valid-move');
                }
            }
            
            cellDiv.addEventListener('click', () => {
                if (gameState.gameOver) return;
                if (gameState.mode === 'eve') return;
                if (gameState.mode === 'pve' && gameState.currentPlayer === 'BLUE') return;
                
                if (gameState.selectedCard !== null && isLegalMove(gameState.selectedCard, row, col)) {
                    playCard(gameState.selectedCard, row, col);
                }
            });
            
            rowDiv.appendChild(cellDiv);
        }
        
        boardGrid.appendChild(rowDiv);
    }
    
    renderRowScores();
}

function renderRowScores() {
    const redScores = document.getElementById('red-row-scores');
    const blueScores = document.getElementById('blue-row-scores');
    
    redScores.innerHTML = '';
    blueScores.innerHTML = '';
    
    for (let row = 0; row < 3; row++) {
        const scores = getRowScores(row);
        
        const redDiv = document.createElement('div');
        redDiv.className = 'row-score row-score-red';
        redDiv.textContent = scores.red;
        if (scores.red > scores.blue) redDiv.style.fontWeight = 'bold';
        
        const blueDiv = document.createElement('div');
        blueDiv.className = 'row-score row-score-blue';
        blueDiv.textContent = scores.blue;
        if (scores.blue > scores.red) blueDiv.style.fontWeight = 'bold';
        
        redScores.appendChild(redDiv);
        blueScores.appendChild(blueDiv);
    }
}

function renderHands() {
    renderHand('red');
    renderHand('blue');
}

function renderHand(player) {
    const handDiv = document.getElementById(`${player}-hand`);
    const hand = player === 'red' ? gameState.redHand : gameState.blueHand;
    const isCurrentPlayer = gameState.currentPlayer === player.toUpperCase();
    const canInteract = !gameState.gameOver && isCurrentPlayer && 
                       (gameState.mode === 'pvp' || 
                        (gameState.mode === 'pve' && player === 'red'));
    
    handDiv.innerHTML = '';
    
    hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'hand-card';
        
        if (!canInteract) {
            cardDiv.classList.add('disabled');
        }
        
        if (gameState.selectedCard === index && isCurrentPlayer) {
            cardDiv.classList.add('selected');
        }
        
        cardDiv.innerHTML = `
            <div class="card-name">${card.name}</div>
            <div class="card-stats">Cost: ${card.cost} | Val: ${card.value}</div>
            <div class="influence-preview">
                ${renderInfluenceGrid(card, player.toUpperCase())}
            </div>
        `;
        
        if (canInteract) {
            cardDiv.addEventListener('click', () => {
                if (gameState.selectedCard === index) {
                    gameState.selectedCard = null;
                } else {
                    gameState.selectedCard = index;
                }
                renderGame();
            });
        }
        
        handDiv.appendChild(cardDiv);
    });
}

function renderInfluenceGrid(card, player) {
    let html = '<div class="influence-grid">';
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const displayCol = player === 'BLUE' ? 4 - col : col;
            const char = card.grid[row][displayCol];
            let className = 'influence-cell ';
            
            if (char === 'C') {
                className += 'center';
            } else if (char === 'I') {
                className += 'influence';
            } else {
                className += 'empty';
            }
            
            html += `<div class="${className}"></div>`;
        }
    }
    
    html += '</div>';
    return html;
}

function renderScores() {
    const scores = getTotalScores();
    document.getElementById('red-total').textContent = scores.red;
    document.getElementById('blue-total').textContent = scores.blue;
}

function renderTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    
    if (gameState.gameOver) {
        indicator.textContent = 'Game Over';
        indicator.className = 'turn-indicator';
        indicator.style.background = 'transparent';
        indicator.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        indicator.style.color = 'rgba(255, 255, 255, 0.7)';
    } else {
        const displayName = PLAYER_NAMES[gameState.currentPlayer];
        indicator.textContent = `${displayName}'s Turn`;
        indicator.className = `turn-indicator turn-${gameState.currentPlayer.toLowerCase()}`;
        indicator.style.background = '';
        indicator.style.borderColor = '';
        indicator.style.color = '';
    }
}

function showMessage(text, className) {
    const msg = document.getElementById('game-message');
    msg.textContent = text;
    msg.className = `game-message show ${className}`;
}

function hideMessage() {
    const msg = document.getElementById('game-message');
    msg.className = 'game-message';
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pass-btn').addEventListener('click', () => {
        if (gameState.gameOver) return;
        if (gameState.mode === 'eve') return;
        if (gameState.mode === 'pve' && gameState.currentPlayer === 'BLUE') return;
        passTurn();
    });

    document.getElementById('reset-btn').addEventListener('click', initGame);

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.mode = btn.dataset.mode;
            initGame();
        });
    });

    initGame();
});