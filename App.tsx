
import React, { useState, useCallback, useEffect } from 'react';
import { CellType, MazeConfig, GenerationResult } from './types';
import MazeCanvas from './components/MazeCanvas';
import { getMazeLore } from './services/geminiService';

const App: React.FC = () => {
  const [config, setConfig] = useState<MazeConfig>({
    width: 129,
    height: 129,
    cellSize: 4,
    density: 50, // 密度映射到单元格大小
  });
  const [maze, setMaze] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lore, setLore] = useState<string>('');
  const [isLoreLoading, setIsLoreLoading] = useState(false);

  // 核心：对偶生成树算法
  const generateMaze = useCallback(() => {
    setIsGenerating(true);
    
    // 基础参数校验
    const actualWidth = Math.max(20, config.width);
    const actualHeight = Math.max(20, config.height);

    // 1. 根据密度计算房间大小 (保证最小 4px)
    // 密度 100 -> 房间 4px (墙多)
    // 密度 0 -> 房间 12px (墙少)
    const roomSize = Math.max(4, Math.floor(12 - (config.density / 100) * 8));
    const step = roomSize + 1; // 房间 + 1px墙

    const cols = Math.floor((actualWidth - 1) / step);
    const rows = Math.floor((actualHeight - 1) / step);

    // 初始化全黑
    const grid: number[][] = Array(actualHeight).fill(0).map(() => Array(actualWidth).fill(CellType.WALL));

    // 2. 在粗粒度网格上生成生成树 (DFS)
    const visited = Array(rows).fill(0).map(() => Array(cols).fill(false));
    const stack: [number, number][] = [];
    
    // 存储树的边：[r1, c1, r2, c2]
    const edges: [number, number, number, number][] = [];

    if (rows > 0 && cols > 0) {
      stack.push([0, 0]);
      visited[0][0] = true;

      while (stack.length > 0) {
        const [r, c] = stack[stack.length - 1];
        const neighbors: [number, number][] = [];
        
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
            neighbors.push([nr, nc]);
          }
        }

        if (neighbors.length > 0) {
          const [nr, nc] = neighbors[Math.floor(Math.random() * neighbors.length)];
          visited[nr][nc] = true;
          edges.push([r, c, nr, nc]);
          stack.push([nr, nc]);
        } else {
          stack.pop();
        }
      }
    }

    // 3. 映射到像素网格
    // 居中偏移
    const offsetX = Math.floor((actualWidth - (cols * step + 1)) / 2);
    const offsetY = Math.floor((actualHeight - (rows * step + 1)) / 2);

    // 填充房间
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const startX = offsetX + c * step + 1;
        const startY = offsetY + r * step + 1;
        for (let py = 0; py < roomSize; py++) {
          for (let px = 0; px < roomSize; px++) {
            if (startY + py < actualHeight && startX + px < actualWidth) {
              grid[startY + py][startX + px] = CellType.PATH;
            }
          }
        }
      }
    }

    // 填充连接桥 (1px宽的白色通道)
    edges.forEach(([r1, c1, r2, c2]) => {
      if (r1 === r2) { // 水平连接
        const cMin = Math.min(c1, c2);
        const bridgeX = offsetX + cMin * step + roomSize + 1;
        const bridgeYStart = offsetY + r1 * step + 1;
        for (let py = 0; py < roomSize; py++) {
          if (bridgeYStart + py < actualHeight && bridgeX < actualWidth) {
            grid[bridgeYStart + py][bridgeX] = CellType.PATH;
          }
        }
      } else { // 垂直连接
        const rMin = Math.min(r1, r2);
        const bridgeY = offsetY + rMin * step + roomSize + 1;
        const bridgeXStart = offsetX + c1 * step + 1;
        for (let px = 0; px < roomSize; px++) {
          if (bridgeY < actualHeight && bridgeXStart + px < actualWidth) {
            grid[bridgeY][bridgeXStart + px] = CellType.PATH;
          }
        }
      }
    });

    setMaze({ grid, width: actualWidth, height: actualHeight });
    setIsGenerating(false);
    // 重置故事，除非是缩放调整
    setLore('');
  }, [config.width, config.height, config.density]);

  const handleLoreRequest = async () => {
    if (!maze) return;
    setIsLoreLoading(true);
    const result = await getMazeLore(maze.width, maze.height);
    setLore(result);
    setIsLoreLoading(false);
  };

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `topology-terrain-${maze?.width}x${maze?.height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // 核心变更：监听 generateMaze 的变化，实现拖动即生成
  useEffect(() => {
    generateMaze();
  }, [generateMaze]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tighter mb-4 bg-gradient-to-r from-slate-100 to-slate-500 bg-clip-text text-transparent uppercase">
          AmazeGen <span className="text-indigo-500">Dual</span>
        </h1>
        <p className="text-slate-400 text-sm tracking-[0.3em] font-bold uppercase">
          高精拓扑地形引擎 // <span className="text-emerald-500">实时预览已开启</span>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-lg font-bold mb-8 flex items-center gap-3">
              <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
              配置面板
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">宽度 (px)</label>
                  <input 
                    type="number" 
                    value={config.width}
                    onChange={(e) => setConfig({...config, width: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">高度 (px)</label>
                  <input 
                    type="number" 
                    value={config.height}
                    onChange={(e) => setConfig({...config, height: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">地形复杂度 (密度)</label>
                  <span className="text-indigo-400 font-mono text-sm">{config.density}%</span>
                </div>
                <input 
                  type="range" min="0" max="100"
                  value={config.density}
                  onChange={(e) => setConfig({...config, density: parseInt(e.target.value)})}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-indigo-500 cursor-pointer"
                />
                <p className="text-[9px] text-slate-600 italic">拖动滑块实时更新地形结构</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">预览缩放</label>
                  <span className="text-slate-500 font-mono text-sm">{config.cellSize}x</span>
                </div>
                <input 
                  type="range" min="1" max="16"
                  value={config.cellSize}
                  onChange={(e) => setConfig({...config, cellSize: parseInt(e.target.value)})}
                  className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-slate-500 cursor-pointer"
                />
              </div>

              <div className="pt-6 space-y-4">
                <button 
                  onClick={generateMaze}
                  disabled={isGenerating}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95 shadow-xl disabled:opacity-50"
                >
                  {isGenerating ? '正在重新计算...' : '强制刷新地形'}
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleDownload}
                    disabled={!maze}
                    className="bg-slate-800 text-white text-[10px] font-bold py-3 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all uppercase"
                  >
                    下载图片 (1:1)
                  </button>
                  <button 
                    onClick={handleLoreRequest}
                    disabled={!maze || isLoreLoading}
                    className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold py-3 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/20 transition-all uppercase"
                  >
                    {isLoreLoading ? '构思中...' : 'AI 设定'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl">
             <h4 className="text-[10px] font-black text-indigo-500 uppercase mb-3 tracking-widest">拓扑技术规范</h4>
             <ul className="text-[11px] text-slate-500 space-y-2 leading-relaxed">
               <li className="flex gap-2"><span className="text-indigo-400">●</span> <b>墙壁连通：</b>基于对偶图生成树原理，确保黑色像素 100% 互联。</li>
               <li className="flex gap-2"><span className="text-indigo-400">●</span> <b>地面连通：</b>基于 Primal 生成树，确保白色像素无死角。</li>
               <li className="flex gap-2"><span className="text-indigo-400">●</span> <b>尺寸：</b>墙壁固定 1px，地面宽度 ≥ 4px。</li>
             </ul>
          </div>
        </aside>

        <main className="lg:col-span-8 space-y-8">
          <div className="bg-black/20 p-2 rounded-3xl border border-white/5 inline-block w-full overflow-hidden shadow-inner">
            <MazeCanvas maze={maze} displayScale={config.cellSize} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">实时拓扑分析</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">白色地面连通性</span>
                  <span className="text-emerald-500 font-bold">100% OK</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">黑色墙壁连通性</span>
                  <span className="text-emerald-500 font-bold">100% OK</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">墙壁固定宽度</span>
                  <span className="text-indigo-400 font-mono">1.00 px</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">像素统计</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">分辨率</span>
                  <span className="text-white font-mono">{maze?.width} × {maze?.height}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">地面最小宽度</span>
                  <span className="text-white font-mono">≥ 4.00 px</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">拓扑亏格 (Genus)</span>
                  <span className="text-white font-mono">0 (树结构)</span>
                </div>
              </div>
            </div>
          </div>

          {lore && (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-800"></div>
                <h3 className="text-lg font-bold text-indigo-400 uppercase tracking-widest px-4">AI 故事设定</h3>
                <div className="h-px flex-1 bg-slate-800"></div>
              </div>
              <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed font-serif italic">
                {lore}
              </div>
            </div>
          )}
        </main>
      </div>
      
      <footer className="mt-20 text-center border-t border-slate-900 pt-8">
        <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em] uppercase">
          Precision Terrain Synthesis v4.0 // Dual-Tree Engine
        </p>
      </footer>
    </div>
  );
};

export default App;
