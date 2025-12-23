
export enum CellType {
  WALL = 1,
  PATH = 0
}

export interface MazeConfig {
  width: number;
  height: number;
  cellSize: number;
  density: number; // 0 to 100
}

export interface GenerationResult {
  grid: number[][];
  width: number;
  height: number;
}
