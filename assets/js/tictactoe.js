/*
 Bad Tic Tac Toe
Features to add:
- Moves change background
- Maybe animations for buttons


(function() {
  'use strict';


  // Game State
  let board = ['', '', '', '', '', '', '', '', ''];
  let currentPlayer = 'X';
  let gameActive = true;
  let gridSize = 3; // Dynamic grid size (3, 4, or 5)
  let scores = {
    player: 0,
    ai: 0,
    draws: 0
  };

  // Fun random elements
  const playerShapes = ['X', '★', '♦', '●', '■', '▲'];
  const aiShapes = ['O', '○', '◇', '☆', '□', '△'];
  const colors = ['color-purple', 'color-green', 'color-orange', 'color-pink', 'color-teal'];
  const bgColors = ['#f0f9ff', '#fdf4ff', '#fff7ed', '#f0fdf4', '#fef2f2'];

  // DOM Elements
  const gameBoard = document.getElementById('game-board');
  const turnIndicator = document.getElementById('turn-indicator');
  const gameMessage = document.getElementById('game-message');
  const resetBtn = document.getElementById('reset-btn');
  const resetScoreBtn = document.getElementById('reset-score-btn');
  const playerScore = document.getElementById('player-score');
  const aiScore = document.getElementById('ai-score');
  const drawScore = document.getElementById('draw-score');

  // Winning combinations (will be generated dynamically)
  let winningCombinations = [];

  // Generate winning combinations based on grid size
  function generateWinningCombinations(size) {
    const combinations = [];

    // Rows
    for (let row = 0; row < size; row++) {
      const rowCombo = [];
      for (let col = 0; col < size; col++) {
        rowCombo.push(row * size + col);
      }
      combinations.push(rowCombo);
    }

    // Columns
    for (let col = 0; col < size; col++) {
      const colCombo = [];
      for (let row = 0; row < size; row++) {
        colCombo.push(row * size + col);
      }
      combinations.push(colCombo);
    }

    // Diagonal (top-left to bottom-right)
    const diagonal1 = [];
    for (let i = 0; i < size; i++) {
      diagonal1.push(i * size + i);
    }
    combinations.push(diagonal1);

    // Diagonal (top-right to bottom-left)
    const diagonal2 = [];
    for (let i = 0; i < size; i++) {
      diagonal2.push(i * size + (size - 1 - i));
    }
    combinations.push(diagonal2);

    return combinations;
  }

  // Create game board dynamically
  function createBoard(size) {
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    const totalCells = size * size;
    board = new Array(totalCells).fill('');

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.index = i;
      cell.addEventListener('click', () => handleCellClick(i));
      gameBoard.appendChild(cell);
    }

    // Random background color change (20% chance)
    if (Math.random() < 0.2) {
      changeBackgroundColor();
    }
  }

  // Change background color randomly
  function changeBackgroundColor() {
    const randomBgColor = getRandomElement(bgColors);
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.style.backgroundColor = randomBgColor;
      gameContainer.style.transition = 'background-color 0.8s ease';
    }
  }

  // Initialize game
  function init() {
    loadScores();
    updateScoreDisplay();
    resetBtn.addEventListener('click', resetGame);
    resetScoreBtn.addEventListener('click', resetScores);

    // Random grid size (70% chance 3x3, 20% chance 4x4, 10% chance 5x5)
    const rand = Math.random();
    if (rand < 0.7) {
      gridSize = 3;
    } else if (rand < 0.9) {
      gridSize = 4;
    } else {
      gridSize = 5;
    }

    winningCombinations = generateWinningCombinations(gridSize);
    createBoard(gridSize);
  }

  // Get random element from array
  function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Handle cell click
  function handleCellClick(index) {
    if (board[index] !== '' || !gameActive || currentPlayer === 'O') {
      return;
    }

    // Random chance to use a fun shape instead of X
    const useRandomShape = Math.random() < 0.3; // 30% chance
    const shape = useRandomShape ? getRandomElement(playerShapes) : 'X';

    makeMove(index, 'X', shape);

    if (gameActive) {
      // AI makes a move after a short delay
      setTimeout(() => {
        const aiMove = getBestMove();
        if (aiMove !== -1) {
          const aiUseRandomShape = Math.random() < 0.3;
          const aiShape = aiUseRandomShape ? getRandomElement(aiShapes) : 'O';
          makeMove(aiMove, 'O', aiShape);
        }
      }, 500);
    }
  }

  // Make a move
  function makeMove(index, player, shape) {
    const cells = gameBoard.querySelectorAll('.cell');
    board[index] = player;
    cells[index].textContent = shape;
    cells[index].classList.add(player === 'X' ? 'player-x' : 'player-o');

    // Random chance to change background color (15% chance)
    if (Math.random() < 0.15) {
      changeBackgroundColor();
    }

    // Check for two in a row and apply special effects
    if (!checkWin(player)) {
      checkTwoInRow(player);
    }

    if (checkWin(player)) {
      endGame(player === 'X' ? 'You win! 🎉' : 'I win! 🤖');
      if (player === 'X') {
        scores.player++;
      } else {
        scores.ai++;
      }
      saveScores();
      updateScoreDisplay();
    } else if (board.every(cell => cell !== '')) {
      endGame("It's a draw! 🤝");
      scores.draws++;
      saveScores();
      updateScoreDisplay();
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      updateTurnIndicator();
    }
  }

  // Check for two in a row and add visual effects
  function checkTwoInRow(player) {
    const cells = gameBoard.querySelectorAll('.cell');
    const threshold = gridSize - 1; // For 3x3: 2, for 4x4: 3, for 5x5: 4

    winningCombinations.forEach(combination => {
      const values = combination.map(index => board[index]);
      const playerMoves = values.filter(v => v === player).length;
      const emptySpaces = values.filter(v => v === '').length;

      // If player has (gridSize-1) in a row with 1 empty space
      if (playerMoves === threshold && emptySpaces === 1) {
        // Add random color to the cells
        const randomColor = getRandomElement(colors);
        combination.forEach(index => {
          if (board[index] === player) {
            cells[index].classList.remove(...colors);
            cells[index].classList.add(randomColor, 'two-in-row');
            // Remove animation class after it completes
            setTimeout(() => {
              cells[index].classList.remove('two-in-row');
            }, 500);
          }
        });

        // Random chance to change background color (30% chance on near-win)
        if (Math.random() < 0.3) {
          changeBackgroundColor();
        }
      }
    });
  }

  // Check for win
  function checkWin(player) {
    return winningCombinations.some(combination => {
      return combination.every(index => board[index] === player);
    });
  }

  // Get best move for AI using minimax algorithm
  function getBestMove() {
    // For larger boards, use simplified heuristic instead of full minimax
    if (gridSize > 3) {
      return getHeuristicMove();
    }

    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < board.length; i++) {
      if (board[i] === '') {
        board[i] = 'O';
        const score = minimax(board, 0, false);
        board[i] = '';

        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove;
  }

  // Heuristic move for larger boards (4x4, 5x5)
  function getHeuristicMove() {
    // Try to win
    for (let i = 0; i < board.length; i++) {
      if (board[i] === '') {
        board[i] = 'O';
        if (checkWin('O')) {
          board[i] = '';
          return i;
        }
        board[i] = '';
      }
    }

    // Block player from winning
    for (let i = 0; i < board.length; i++) {
      if (board[i] === '') {
        board[i] = 'X';
        if (checkWin('X')) {
          board[i] = '';
          return i;
        }
        board[i] = '';
      }
    }

    // Take center if available
    const center = Math.floor(board.length / 2);
    if (board[center] === '') {
      return center;
    }

    // Take random empty cell
    const emptyCells = board.map((cell, index) => cell === '' ? index : -1).filter(i => i !== -1);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  // Minimax algorithm for AI
  function minimax(board, depth, isMaximizing) {
    if (checkWin('O')) return 10 - depth;
    if (checkWin('X')) return depth - 10;
    if (board.every(cell => cell !== '')) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
          board[i] = 'O';
          const score = minimax(board, depth + 1, false);
          board[i] = '';
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
          board[i] = 'X';
          const score = minimax(board, depth + 1, true);
          board[i] = '';
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }

  // End 
  
  function endGame(message) {
    gameActive = false;
    gameMessage.textContent = message;
    gameMessage.classList.add('show');
    turnIndicator.textContent = 'Game Over';
  }

  // Reset game
  function resetGame() {
    currentPlayer = 'X';
    gameActive = true;
    gameMessage.classList.remove('show');
    gameMessage.textContent = '';

    // Random grid size for new game 
    // (70% chance 3x3, 20% chance 4x4, 10% chance 5x5)
    const rand = Math.random();
    if (rand < 0.7) {
      gridSize = 3;
    } else if (rand < 0.9) {
      gridSize = 4;
    } else {
      gridSize = 5;
    }

    winningCombinations = generateWinningCombinations(gridSize);
    createBoard(gridSize);

    // Reset background color
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.style.backgroundColor = 'white';
    }

    updateTurnIndicator();
  }

  // Update turn indicator
  function updateTurnIndicator() {
    if (gameActive) {
      turnIndicator.textContent = currentPlayer === 'X' ? 'Your Turn' : "My Turn";
    }
  }

  // Save scores to localStorage
  function saveScores() {
    localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
  }

  // Load scores from localStorage
  function loadScores() {
    const savedScores = localStorage.getItem('tictactoe_scores');
    if (savedScores) {
      scores = JSON.parse(savedScores);
    }
  }

  // Update score display
  function updateScoreDisplay() {
    playerScore.textContent = scores.player;
    aiScore.textContent = scores.ai;
    drawScore.textContent = scores.draws;
  }

  // Reset scores
  function resetScores() {
    scores = {
      player: 0,
      ai: 0,
      draws: 0
    };
    saveScores();
    updateScoreDisplay();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

*/