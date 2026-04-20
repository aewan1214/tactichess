export type PieceType = 'king' | 'rook' | 'bishop';
export type Player = 'player1' | 'player2';

export interface Piece {
  type: PieceType;
  position: [number, number] | null;
  deployed: boolean;
  id: string; // added to easily find pieces
}

export interface PlayerState {
  pieces: Piece[];
}

export type BoardCell = (Piece & { owner: Player }) | null;
export type Board = BoardCell[][];

export interface GameState {
  board: Board;
  players: {
    player1: PlayerState;
    player2: PlayerState;
  };
  phase: 'deployment' | 'movement';
  currentTurn: Player;
  gameStatus: 'ongoing' | 'player1_wins' | 'player2_wins' | 'draw';
}

export type Position = [number, number];
