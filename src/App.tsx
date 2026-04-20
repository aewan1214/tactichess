import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './useGame';
import type { PieceType, Player, Position } from './types';
import './index.css';

const PieceIcon = ({ type }: { type: PieceType }) => {
  if (type === 'king') return <>♚</>;
  if (type === 'rook') return <>♜</>;
  if (type === 'bishop') return <>♝</>;
  return null;
};

function App() {
  const { gameState, deployPiece, movePiece, resetGame, isValidMove } = useGame();
  
  // Selection states
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedBoardPos, setSelectedBoardPos] = useState<Position | null>(null);

  const handleCellClick = (r: number, c: number) => {
    const clickedCell = gameState.board[r][c];

    if (gameState.phase === 'deployment') {
      if (selectedPieceId && !clickedCell) {
        deployPiece(selectedPieceId, [r, c]);
        setSelectedPieceId(null);
      }
    } else {
      // Movement Phase
      if (selectedBoardPos) {
        // Try to move
        const [sr, sc] = selectedBoardPos;
        const selectedCell = gameState.board[sr][sc];
        
        if (selectedCell && isValidMove(selectedCell, selectedBoardPos, [r, c], gameState.board)) {
          movePiece(selectedBoardPos, [r, c]);
          setSelectedBoardPos(null);
        } else if (clickedCell && clickedCell.owner === gameState.currentTurn) {
          // Select a different piece
          setSelectedBoardPos([r, c]);
        } else {
          // Deselect
          setSelectedBoardPos(null);
        }
      } else {
        if (clickedCell && clickedCell.owner === gameState.currentTurn) {
          setSelectedBoardPos([r, c]);
        }
      }
    }
  };

  const handleUndeployedClick = (id: string, owner: Player) => {
    if (gameState.phase !== 'deployment' || owner !== gameState.currentTurn) return;
    setSelectedPieceId(id === selectedPieceId ? null : id);
  };

  const isCellValidMove = (r: number, c: number) => {
    if (gameState.phase !== 'movement' || !selectedBoardPos) return false;
    const [sr, sc] = selectedBoardPos;
    const piece = gameState.board[sr][sc];
    if (!piece) return false;
    return isValidMove(piece, selectedBoardPos, [r, c], gameState.board);
  };

  const renderPlayerSidebar = (player: Player, name: string) => {
    const state = gameState.players[player];
    const isTurn = gameState.currentTurn === player && gameState.gameStatus === 'ongoing';
    
    return (
      <div className={`glass-panel player-sidebar ${isTurn ? 'active' : ''}`}>
        <h3>{name}</h3>
        <div className="undeployed-container">
          {state.pieces.map(piece => {
            const isSelected = selectedPieceId === piece.id;
            return (
              <button
                key={piece.id}
                className={`piece-button ${isSelected ? 'selected' : ''}`}
                disabled={piece.deployed || gameState.currentTurn !== player || gameState.phase !== 'deployment'}
                onClick={() => handleUndeployedClick(piece.id, player)}
              >
                <div className={`piece ${player} ${piece.deployed ? '' : 'undeployed'}`} style={{ fontSize: '2rem', filter: 'none', width: '40px', height: '40px', margin: 0 }}>
                  <PieceIcon type={piece.type} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      
      <div className="glass-panel status-bar">
        <h2>TactiChess: Deployment</h2>
        <div className="turn-indicator">
          <span className={`dot ${gameState.currentTurn}`}></span>
          {gameState.gameStatus === 'ongoing' ? (
            <span>{gameState.currentTurn === 'player1' ? 'Player 1' : 'Player 2'}'s Turn ({gameState.phase === 'deployment' ? 'Deployment' : 'Movement'})</span>
          ) : (
            <span>Game Over!</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        
        {renderPlayerSidebar('player1', 'Player 1')}

        <div style={{ position: 'relative' }}>
          <div className="glass-panel board-container">
            {gameState.board.map((row, r) =>
              row.map((cell, c) => {
                const isSelected = selectedBoardPos?.[0] === r && selectedBoardPos?.[1] === c;
                const isValid = isCellValidMove(r, c);
                
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`cell ${isSelected ? 'selected' : ''} ${isValid ? 'valid-move' : ''}`}
                    onClick={() => handleCellClick(r, c)}
                  >
                    <AnimatePresence>
                      {cell && (
                        <motion.div
                          key={cell.id}
                          layoutId={cell.id}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className={`piece ${cell.owner}`}
                        >
                          <PieceIcon type={cell.type} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          <AnimatePresence>
            {gameState.gameStatus !== 'ongoing' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="win-overlay"
              >
                <h2>
                  {gameState.gameStatus === 'player1_wins' && 'Player 1 Wins!'}
                  {gameState.gameStatus === 'player2_wins' && 'Player 2 Wins!'}
                  {gameState.gameStatus === 'draw' && 'Draw!'}
                </h2>
                <button className="reset-btn" onClick={() => {
                  resetGame();
                  setSelectedPieceId(null);
                  setSelectedBoardPos(null);
                }}>
                  Play Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {renderPlayerSidebar('player2', 'Player 2')}

      </div>
    </div>
  );
}

export default App;
