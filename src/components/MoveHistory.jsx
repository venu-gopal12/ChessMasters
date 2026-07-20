// Purpose: React UI component for the Move History experience.
import React, { useEffect, useRef } from 'react';

function MoveHistory({ history, onResign, onDrawRequest, gameOver }) {
  // Create a ref for the scroll container
  const scrollContainerRef = useRef(null);
  
  // Group moves by pairs (white and black)
  const groupedMoves = [];
  for (let i = 0; i < history.length; i += 2) {
    groupedMoves.push({
      number: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || null
    });
  }
  
  // Auto-scroll to the bottom when new moves are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="bg-brand-surface rounded-lg shadow-lg p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-brand-ink mb-4 text-center border-b border-brand-accent/30 pb-2">
        Move History
      </h2>
      <div
        ref={scrollContainerRef}
        className="max-h-[60vh] overflow-y-auto mb-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#3B82F6 #14213D',
        }}
      >
        {/* Display a message when no moves have been made */}
        {groupedMoves.length === 0 ? (
          <div className="text-center text-brand-muted py-4">
            No moves yet. Game will begin with White.
          </div>
        ) : (
          <div className="space-y-2">
            {groupedMoves.map((moveGroup) => (
              <div
                key={moveGroup.number}
                className="flex items-center px-3 py-2 bg-brand-surfaceAlt rounded-lg hover:bg-brand-accentSoft transition-colors duration-200"
              >
                <span className="text-brand-muted font-medium min-w-[2rem]">
                  {moveGroup.number}.
                </span>
                <div className="grid grid-cols-2 gap-2 flex-grow">
                  {/* White's move */}
                  <div className="flex items-center space-x-2">
                    <span
                      className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-400"
                    />
                    <span className="text-brand-ink font-medium">{moveGroup.white}</span>
                  </div>
                  
                  {/* Black's move */}
                  {moveGroup.black ? (
                    <div className="flex items-center space-x-2">
                      <span
                        className="inline-block w-3 h-3 rounded-sm bg-black"
                      />
                      <span className="text-brand-ink font-medium">{moveGroup.black}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 opacity-0">
                      <span className="inline-block w-3 h-3 rounded-sm" />
                      <span>-</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!gameOver && (
        <div className="space-y-2">
          <button 
            onClick={onDrawRequest}
            className="px-4 py-2 bg-brand-action hover:bg-brand-actionHover text-white text-sm rounded-md transition-colors shadow-md w-full mb-2 disabled:bg-brand-surfaceAlt disabled:text-brand-muted disabled:cursor-not-allowed"
            disabled={history.length < 2} // Require at least one full move before offering draw
          >
            Offer Draw
          </button>
          <button 
            onClick={onResign}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors shadow-md w-full"
          >
            Resign
          </button>
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: #14213D;
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb {
          background-color: #3B82F6;
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background-color: #2563EB;
        }
      `}</style>
    </div>
  );
}

export default MoveHistory;





