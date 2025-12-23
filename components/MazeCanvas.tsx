
import React, { useRef, useEffect } from 'react';
import { CellType, GenerationResult } from '../types';

interface MazeCanvasProps {
  maze: GenerationResult | null;
  displayScale: number;
}

const MazeCanvas: React.FC<MazeCanvasProps> = ({ maze, displayScale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!maze || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { grid, width, height } = maze;
    
    // Set logical canvas size to exactly the maze dimensions (1 pixel per cell)
    canvas.width = width;
    canvas.height = height;

    // Clear background (Walls)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw paths (Ground)
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === CellType.PATH) {
          // Draw exactly 1x1 pixel
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }, [maze]);

  if (!maze) {
    return (
      <div className="w-full h-96 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center">
        <p className="text-slate-500 font-medium">Click "Generate" to create a maze</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto bg-slate-900 rounded-lg border border-slate-700 p-4 shadow-2xl max-h-[70vh] flex justify-center items-start">
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          className="block rounded shadow-inner"
          style={{ 
            imageRendering: 'pixelated',
            width: `${maze.width * displayScale}px`,
            height: `${maze.height * displayScale}px`,
          }}
        />
        <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-slate-500 uppercase tracking-widest">
          Resolution: {maze.width} x {maze.height} px
        </div>
      </div>
    </div>
  );
};

export default MazeCanvas;
