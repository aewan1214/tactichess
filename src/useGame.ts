import { useState, useCallback } from 'react';
import type { GameState, Player, PieceType, Position, Board, Piece } from './types';

const INITIAL_STATE: GameState = {
  board: Array(3).fill(null).map(() => Array(3).fill(null)),
  players: {
    player1: {
      pieces: [
        { id: 'p1-king', type: 'king', position: null, deployed: false },
        { id: 'p1-rook', type: 'rook', position: null, deployed: false },
        { id: 'p1-bishop', type: 'bishop', position: null, deployed: false }
      ]
    },
    player2: {
      pieces: [
        { id: 'p2-king', type: 'king', position: null, deployed: false },
        { id: 'p2-rook', type: 'rook', position: null, deployed: false },
        { id: 'p2-bishop', type: 'bishop', position: null, deployed: false }
      ]
    }
  },
  phase: 'deployment',
  currentTurn: 'player1',
  gameStatus: 'ongoing'
};

const winPatterns = [
  [[0,0],[0,1],[0,2]],
  [[1,0],[1,1],[1,2]],
  [[2,0],[2,1],[2,2]],
  [[0,0],[1,0],[2,0]],
  [[0,1],[1,1],[2,1]],
  [[0,2],[1,2],[2,2]],
  [[0,0],[1,1],[2,2]],
  [[0,2],[1,1],[2,0]]
];

function checkWin(board: Board, player: Player): boolean {
  for (const pattern of winPatterns) {
    if (pattern.every(([r, c]) => board[r][c] !== null && board[r][c]?.owner === player)) {
      return true;
    }
  }
  return false;
}

function isPathClear(from: Position, to: Position, board: Board, type: PieceType): boolean {
  const [r1, c1] = from;
  const [r2, c2] = to;
  const rowStep = r2 > r1 ? 1 : r2 < r1 ? -1 : 0;
  const colStep = c2 > c1 ? 1 : c2 < c1 ? -1 : 0;
  
  if (type === 'king') return true; // King moves 1 step, no path blocking

  let r = r1 + rowStep;
  let c = c1 + colStep;

  while (r !== r2 || c !== c2) {
    if (board[r][c] !== null) return false;
    r += rowStep;
    c += colStep;
  }
  return true;
}

function isValidMove(piece: Piece, from: Position, to: Position, board: Board): boolean {
  const [r1, c1] = from;
  const [r2, c2] = to;
  const rowDiff = r2 - r1;
  const colDiff = c2 - c1;
  
  if (board[r2][c2] !== null) return false; // Cannot capture or move into occupied
  
  if (piece.type === 'king') {
    return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
  }
  if (piece.type === 'rook') {
    if (rowDiff !== 0 && colDiff !== 0) return false;
    return isPathClear(from, to, board, piece.type);
  }
  if (piece.type === 'bishop') {
    if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
    return isPathClear(from, to, board, piece.type);
  }
  return false;
}

export function useGame() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  const resetGame = useCallback(() => {
    setGameState(INITIAL_STATE);
  }, []);

  const deployPiece = useCallback((pieceId: string, position: Position) => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'ongoing') return prevState;
      if (prevState.phase !== 'deployment') return prevState;
      
      const { currentTurn, players, board } = prevState;
      const playerPieces = players[currentTurn].pieces;
      const pieceIndex = playerPieces.findIndex(p => p.id === pieceId);
      const piece = playerPieces[pieceIndex];
      
      if (!piece || piece.deployed) return prevState;
      if (board[position[0]][position[1]] !== null) return prevState;

      // Deploy
      const newBoard = board.map(row => [...row]);
      newBoard[position[0]][position[1]] = { ...piece, owner: currentTurn, position, deployed: true };

      const newPieces = [...playerPieces];
      newPieces[pieceIndex] = { ...piece, position, deployed: true };

      const newPlayers = {
        ...players,
        [currentTurn]: { pieces: newPieces }
      };

      // Check transition to movement phase
      const totalDeployed = newPlayers.player1.pieces.filter(p => p.deployed).length +
                            newPlayers.player2.pieces.filter(p => p.deployed).length;
      
      const newPhase = totalDeployed === 6 ? 'movement' : 'deployment';
      const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';

      return {
        ...prevState,
        board: newBoard,
        players: newPlayers,
        phase: newPhase,
        currentTurn: nextTurn
      };
    });
  }, []);

  const movePiece = useCallback((from: Position, to: Position) => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'ongoing') return prevState;
      if (prevState.phase !== 'movement') return prevState;

      const { currentTurn, board, players } = prevState;
      const cell = board[from[0]][from[1]];

      if (!cell || cell.owner !== currentTurn) return prevState;

      if (!isValidMove(cell, from, to, board)) return prevState;

      // Move
      const newBoard = board.map(row => [...row]);
      newBoard[from[0]][from[1]] = null;
      newBoard[to[0]][to[1]] = { ...cell, position: to };

      const newPieces = [...players[currentTurn].pieces];
      const pieceIndex = newPieces.findIndex(p => p.id === cell.id);
      newPieces[pieceIndex] = { ...newPieces[pieceIndex], position: to };

      const newPlayers = {
        ...players,
        [currentTurn]: { pieces: newPieces }
      };

      // Check win
      let newStatus: GameState['gameStatus'] = prevState.gameStatus;
      if (checkWin(newBoard, currentTurn)) {
        newStatus = currentTurn === 'player1' ? 'player1_wins' : 'player2_wins';
      } else {
        // Simple draw condition: no legal moves for next player? It might be complex. Let's keep it simple for now.
      }

      return {
        ...prevState,
        board: newBoard,
        players: newPlayers,
        currentTurn: currentTurn === 'player1' ? 'player2' : 'player1',
        gameStatus: newStatus
      };
    });
  }, []);

  return { gameState, deployPiece, movePiece, resetGame, isValidMove };
}
