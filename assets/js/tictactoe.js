// Enhanced Tic-Tac-Toe Game with Random Elements
(function() {
  'use strict';


  // Game State
  let board = ['', '', '', '', '', '', '', '', ''];
  let currentPlayer = 'X';
  let gameActive = true;
  let scores = {
    player: 0,
    ai: 0,
    draws: 0
  };

  // Fun random elements
  const playerShapes = ['X', '★', '♦', '●', '■', '▲'];
  const aiShapes = ['O', '○', '◇', '☆', '□', '△'];
  const colors = ['color-purple', 'color-green', 'color-orange', 'color-pink', 'color-teal'];

  // DOM Elements
  const cells = document.querySelectorAll('.cell');
  const turnIndicator = document.getElementById('turn-indicator');
  const gameMessage = document.getElementById('game-message');
  const resetBtn = document.getElementById('reset-btn');
  const resetScoreBtn = document.getElementById('reset-score-btn');
  const playerScore = document.getElementById('player-score');
  const aiScore = document.getElementById('ai-score');
  const drawScore = document.getElementById('draw-score');

  // Winning combinations
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  // Initialize game
  function init() {
    loadScores();
    updateScoreDisplay();
    cells.forEach((cell, index) => {
      cell.addEventListener('click', () => handleCellClick(index));
    });
    resetBtn.addEventListener('click', resetGame);
    resetScoreBtn.addEventListener('click', resetScores);
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
    board[index] = player;
    cells[index].textContent = shape;
    cells[index].classList.add(player === 'X' ? 'player-x' : 'player-o');

    // Check for two in a row and apply special effects
    if (!checkWin(player)) {
      checkTwoInRow(player);
    }

    if (checkWin(player)) {
      endGame(player === 'X' ? 'You win! 🎉' : 'AI wins! 🤖');
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
    winningCombinations.forEach(combination => {
      const values = combination.map(index => board[index]);
      const playerMoves = values.filter(v => v === player).length;
      const emptySpaces = values.filter(v => v === '').length;

      // If player has 2 in a row with 1 empty space
      if (playerMoves === 2 && emptySpaces === 1) {
        // Add random color to the two cells
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
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
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

  // End game
  function endGame(message) {
    gameActive = false;
    gameMessage.textContent = message;
    gameMessage.classList.add('show');
    turnIndicator.textContent = 'Game Over';
  }

  // Reset game
  function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    gameMessage.classList.remove('show');
    gameMessage.textContent = '';

    cells.forEach(cell => {
      cell.textContent = '';
      cell.classList.remove('player-x', 'player-o', ...colors, 'two-in-row');
    });

    updateTurnIndicator();
  }

  // Update turn indicator
  function updateTurnIndicator() {
    if (gameActive) {
      turnIndicator.textContent = currentPlayer === 'X' ? 'Your Turn (X)' : "AI's Turn (O)";
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
