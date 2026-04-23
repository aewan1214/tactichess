import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './useGame';
import type { PieceType, Player, Position, GameMode, AIDifficulty } from './types';
import { computeAIMove } from './ai';
import { sounds } from './sounds';
import './index.css';

const PieceIcon = ({ type }: { type: PieceType }) => {
  if (type === 'king') return <>♚</>;
  if (type === 'rook') return <>♜</>;
  if (type === 'bishop') return <>♝</>;
  return null;
};

function App() {
  const [view, setView] = useState<'menu' | 'game'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [aiGoesFirst, setAiGoesFirst] = useState(false);
  
  const { gameState, deployPiece, movePiece, resetGame, isValidMove } = useGame();
  
  const aiPlayer = gameMode === 'ai' ? (aiGoesFirst ? 'player1' : 'player2') : null;
  
  // Selection states
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedBoardPos, setSelectedBoardPos] = useState<Position | null>(null);

  // AI Hook
  useEffect(() => {
    if (view === 'game' && gameMode === 'ai' && gameState.currentTurn === aiPlayer && gameState.gameStatus === 'ongoing') {
      const timer = setTimeout(() => {
        const move = computeAIMove(gameState, difficulty);
        if (move) {
          if (move.type === 'deploy') {
            deployPiece(move.pieceId, move.position);
            sounds.playMove();
          } else {
            movePiece(move.from, move.to);
            sounds.playMove();
          }
        }
      }, 700); // Slight delay for human readability
      return () => clearTimeout(timer);
    }
  }, [view, gameMode, gameState, difficulty, deployPiece, movePiece, aiPlayer]);

  // Win Hook
  useEffect(() => {
    if (gameState.gameStatus === 'player1_wins' || gameState.gameStatus === 'player2_wins') {
      sounds.playWin();
    }
  }, [gameState.gameStatus]);

  const handleCellClick = (r: number, c: number) => {
    if (gameMode === 'ai' && gameState.currentTurn === aiPlayer) return;
    const clickedCell = gameState.board[r][c];

    if (gameState.phase === 'deployment') {
      if (selectedPieceId && !clickedCell) {
        deployPiece(selectedPieceId, [r, c]);
        setSelectedPieceId(null);
        sounds.playMove();
      } else if (selectedPieceId && clickedCell) {
        sounds.playError();
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
          sounds.playMove();
        } else if (clickedCell && clickedCell.owner === gameState.currentTurn) {
          // Select a different piece
          setSelectedBoardPos([r, c]);
          sounds.playClick();
        } else {
          // Deselect
          setSelectedBoardPos(null);
          if (clickedCell && clickedCell.owner !== gameState.currentTurn) {
            sounds.playError();
          } else {
            sounds.playClick();
          }
        }
      } else {
        if (clickedCell && clickedCell.owner === gameState.currentTurn) {
          setSelectedBoardPos([r, c]);
          sounds.playClick();
        } else if (clickedCell) {
          sounds.playError();
        }
      }
    }
  };

  const handleUndeployedClick = (id: string, owner: Player) => {
    if (gameMode === 'ai' && gameState.currentTurn === aiPlayer) return;
    if (gameState.phase !== 'deployment' || owner !== gameState.currentTurn) {
      if (owner !== gameState.currentTurn || gameState.phase !== 'deployment') {
        sounds.playError();
      }
      return;
    }
    sounds.playClick();
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
                <div className={`piece ${player} ${piece.deployed ? '' : 'undeployed'}`} style={{ fontSize: '3rem', filter: 'none', width: '50px', height: '50px', margin: 0 }}>
                  <PieceIcon type={piece.type} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (view === 'menu') {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem', boxSizing: 'border-box' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '2rem 3rem', textAlign: 'center', maxWidth: '650px', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '0.05em', background: 'linear-gradient(to right, #60a5fa, #c084fc, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem', textShadow: '0 0 30px rgba(192, 132, 252, 0.4)' }}>
            TACTICHESS
          </h1>
          <p style={{ fontSize: '1rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
            A strategic 3x3 hybrid game combining chess movement with tic-tac-toe win conditions.
          </p>
          
          <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', fontSize: '1.1rem' }}>How to Play</h3>
            <ul style={{ color: '#cbd5e1', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0, fontSize: '0.9rem' }}>
              <li><strong>Deployment:</strong> Alternate turns placing your 3 pieces (King, Rook, Bishop) onto empty tiles.</li>
              <li><strong>Movement:</strong> Once all 6 pieces are placed, move them following standard Chess rules.</li>
              <li><strong>No Capturing:</strong> You cannot capture pieces or jump over them.</li>
              <li><strong>Win Condition:</strong> Align all 3 of your pieces horizontally, vertically, or diagonally.</li>
              <li><strong>Blocked:</strong> If you are completely blocked and have no valid moves on your turn, you lose instantly.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '350px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className={`mode-btn ${gameMode === 'pvp' ? 'active' : ''}`} onClick={() => { sounds.playClick(); setGameMode('pvp'); }}>Player vs Player</button>
              <button className={`mode-btn ${gameMode === 'ai' ? 'active' : ''}`} onClick={() => { sounds.playClick(); setGameMode('ai'); }}>Player vs AI</button>
            </div>
            
            <AnimatePresence>
              {gameMode === 'ai' && (
                <motion.div initial={{ height: 0, opacity: 0, scale: 0.9 }} animate={{ height: 'auto', opacity: 1, scale: 1 }} exit={{ height: 0, opacity: 0, scale: 0.9 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={`diff-btn ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => { sounds.playClick(); setDifficulty('easy'); }}>Easy</button>
                    <button className={`diff-btn ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => { sounds.playClick(); setDifficulty('medium'); }}>Medium</button>
                    <button className={`diff-btn ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => { sounds.playClick(); setDifficulty('hard'); }}>Hard</button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={`diff-btn ${!aiGoesFirst ? 'active' : ''}`} onClick={() => { sounds.playClick(); setAiGoesFirst(false); }}>You First</button>
                    <button className={`diff-btn ${aiGoesFirst ? 'active' : ''}`} onClick={() => { sounds.playClick(); setAiGoesFirst(true); }}>AI First</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="play-button" onClick={() => { sounds.playClick(); setView('game'); }} style={{ marginTop: '1.5rem' }}>Start Game</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '1rem', boxSizing: 'border-box' }}>
      
      {/* Game Area */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div className="glass-panel status-bar">
        <h2>TACTICHESS</h2>
        <div className="turn-indicator">
          <span className={`dot ${gameState.currentTurn}`}></span>
          {gameState.gameStatus === 'ongoing' ? (
            <span style={{ letterSpacing: '0.05em' }}>
              <strong>{gameState.currentTurn === 'player1' ? (aiPlayer === 'player1' ? 'AI' : 'Player 1') : (aiPlayer === 'player2' ? 'AI' : 'Player 2')}'s Turn</strong>
              <span style={{ opacity: 0.7, marginLeft: '8px' }}>— {gameState.phase === 'deployment' ? 'Deployment Phase' : 'Movement Phase'}</span>
            </span>
          ) : (
            <span>Game Over!</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        
        {renderPlayerSidebar('player1', aiPlayer === 'player1' ? `AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})` : 'Player 1')}

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
                  {gameState.gameStatus === 'player1_wins' && (aiPlayer === 'player1' ? 'AI Wins!' : 'Player 1 Wins!')}
                  {gameState.gameStatus === 'player2_wins' && (aiPlayer === 'player2' ? 'AI Wins!' : 'Player 2 Wins!')}
                  {gameState.gameStatus === 'draw' && 'Draw!'}
                </h2>
                <button className="reset-btn" onClick={() => {
                  sounds.playClick();
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

        {renderPlayerSidebar('player2', aiPlayer === 'player2' ? `AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})` : 'Player 2')}

        </div>
      </div>

      {/* Rules Panel */}
      <div className="glass-panel rules-sidebar" style={{ width: '100%', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', flex: 1, fontSize: '0.8rem', lineHeight: '1.3' }}>
          <div>
            <h4 style={{ margin: '0 0 0.35rem', color: '#60a5fa' }}>Deployment Phase</h4>
            <p style={{ margin: 0, color: '#cbd5e1' }}>Alternate placing your King, Rook, and Bishop onto any empty tiles. Ends when all 6 pieces are deployed.</p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 0.35rem', color: '#c084fc' }}>Movement Phase</h4>
            <p style={{ margin: 0, color: '#cbd5e1' }}>Move pieces following chess rules. <strong style={{ color: '#fff' }}>No capturing</strong> and no jumping over other pieces.</p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 0.35rem', color: '#f472b6' }}>Win & Loss Conditions</h4>
            <p style={{ margin: 0, color: '#cbd5e1' }}>Align all 3 of your pieces in a row to win. If you have no valid moves on your turn, you instantly lose.</p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 0.35rem', color: '#a78bfa' }}>Piece Movements</h4>
            <ul style={{ margin: 0, paddingLeft: '1rem', color: '#cbd5e1' }}>
              <li><strong>♚ King:</strong> 1 step any direction</li>
              <li><strong>♜ Rook:</strong> Straight lines</li>
              <li><strong>♝ Bishop:</strong> Diagonals</li>
            </ul>
          </div>
        </div>
        
        <button 
          onClick={() => {
            sounds.playClick();
            setView('menu');
            resetGame();
            setSelectedPieceId(null);
            setSelectedBoardPos(null);
          }}
          style={{ padding: '0.5rem 1.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', cursor: 'pointer', transition: 'background 0.2s', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          Quit
        </button>
      </div>

    </div>
  );
}

export default App;
