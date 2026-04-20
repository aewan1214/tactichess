import type { GameState, Position, AIDifficulty, Player, Board, Piece } from './types';
import { isValidMove, checkWin } from './useGame';

export type AIMove = 
  | { type: 'deploy'; pieceId: string; position: Position }
  | { type: 'move'; from: Position; to: Position };

function getEmptyTiles(board: Board): Position[] {
  const empty: Position[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === null) empty.push([r, c]);
    }
  }
  return empty;
}

function getAllValidMoves(board: Board, player: Player): AIMove[] {
  const moves: AIMove[] = [];
  for (let r1 = 0; r1 < 3; r1++) {
    for (let c1 = 0; c1 < 3; c1++) {
      const cell = board[r1][c1];
      if (cell && cell.owner === player) {
        for (let r2 = 0; r2 < 3; r2++) {
          for (let c2 = 0; c2 < 3; c2++) {
            if (isValidMove(cell, [r1, c1], [r2, c2], board)) {
              moves.push({ type: 'move', from: [r1, c1], to: [r2, c2] });
            }
          }
        }
      }
    }
  }
  return moves;
}

function evaluateBoard(board: Board, aiPlayer: Player): number {
  const humanPlayer = aiPlayer === 'player1' ? 'player2' : 'player1';
  if (checkWin(board, aiPlayer)) return 1000;
  if (checkWin(board, humanPlayer)) return -1000;
  
  let score = 0;
  // Center control
  if (board[1][1]?.owner === aiPlayer) score += 10;
  if (board[1][1]?.owner === humanPlayer) score -= 10;
  
  return score;
}

function applyMove(board: Board, move: AIMove, player: Player, pieceToDeploy?: Piece): Board {
  const newBoard = board.map(row => [...row]);
  if (move.type === 'deploy' && pieceToDeploy) {
    newBoard[move.position[0]][move.position[1]] = { ...pieceToDeploy, owner: player, position: move.position, deployed: true };
  } else if (move.type === 'move') {
    const cell = newBoard[move.from[0]][move.from[1]]!;
    newBoard[move.from[0]][move.from[1]] = null;
    newBoard[move.to[0]][move.to[1]] = { ...cell, position: move.to };
  }
  return newBoard;
}

function minimax(board: Board, depth: number, isMaximizing: boolean, aiPlayer: Player, alpha: number, beta: number): number {
  const humanPlayer = aiPlayer === 'player1' ? 'player2' : 'player1';
  
  if (checkWin(board, aiPlayer)) return 1000 + depth;
  if (checkWin(board, humanPlayer)) return -1000 - depth;
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  const currentPlayer = isMaximizing ? aiPlayer : humanPlayer;
  const moves = getAllValidMoves(board, currentPlayer);
  
  if (moves.length === 0) {
    // If blocked, current player loses
    return isMaximizing ? -1000 - depth : 1000 + depth;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move, currentPlayer);
      const ev = minimax(newBoard, depth - 1, false, aiPlayer, alpha, beta);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move, currentPlayer);
      const ev = minimax(newBoard, depth - 1, true, aiPlayer, alpha, beta);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function computeAIMove(gameState: GameState, difficulty: AIDifficulty): AIMove | null {
  const aiPlayer = gameState.currentTurn;
  const humanPlayer = aiPlayer === 'player1' ? 'player2' : 'player1';
  const board = gameState.board;
  
  // Phase 1: Deployment
  if (gameState.phase === 'deployment') {
    const undeployedPieces = gameState.players[aiPlayer].pieces.filter(p => !p.deployed);
    if (undeployedPieces.length === 0) return null;
    
    const pieceToDeploy = undeployedPieces[0];
    const emptyTiles = getEmptyTiles(board);
    
    if (emptyTiles.length === 0) return null;

    if (difficulty === 'easy') {
      const randomTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      return { type: 'deploy', pieceId: pieceToDeploy.id, position: randomTile };
    }
    
    // Medium & Hard: Check if we can win immediately or block opponent win
    // Note: Winning during deployment requires 3 pieces.
    // Try each empty tile.
    let bestScore = -Infinity;
    let bestMove: AIMove = { type: 'deploy', pieceId: pieceToDeploy.id, position: emptyTiles[0] };
    
    for (const pos of emptyTiles) {
      const move: AIMove = { type: 'deploy', pieceId: pieceToDeploy.id, position: pos };
      const newBoard = applyMove(board, move, aiPlayer, pieceToDeploy);
      
      // If this wins immediately
      if (checkWin(newBoard, aiPlayer)) return move;
      
      // Block opponent win
      const oppPiece = gameState.players[humanPlayer].pieces.find(p => !p.deployed);
      if (oppPiece) {
        const oppBoard = applyMove(board, { type: 'deploy', pieceId: oppPiece.id, position: pos }, humanPlayer, oppPiece);
        if (checkWin(oppBoard, humanPlayer)) {
          return move; // Must block!
        }
      }
      
      const score = evaluateBoard(newBoard, aiPlayer);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    // Add some randomness to medium
    if (difficulty === 'medium' && Math.random() > 0.5) {
       return { type: 'deploy', pieceId: pieceToDeploy.id, position: emptyTiles[Math.floor(Math.random() * emptyTiles.length)] };
    }
    
    return bestMove;
  }

  // Phase 2: Movement
  const validMoves = getAllValidMoves(board, aiPlayer);
  if (validMoves.length === 0) return null;

  if (difficulty === 'easy') {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  if (difficulty === 'medium') {
    // 1-ply lookahead
    for (const move of validMoves) {
      const newBoard = applyMove(board, move, aiPlayer);
      if (checkWin(newBoard, aiPlayer)) return move; // Win if possible
    }
    
    // Block opponent win by checking their next turn responses
    // For medium, we just pick a move that doesn't immediately lead to a loss, or random.
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // Hard: Minimax depth 3
  let bestScore = -Infinity;
  let bestMoves: AIMove[] = [];
  
  for (const move of validMoves) {
    const newBoard = applyMove(board, move, aiPlayer);
    const score = minimax(newBoard, 3, false, aiPlayer, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || validMoves[0];
}
