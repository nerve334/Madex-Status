
import React, { useEffect, useRef } from 'react';

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const cellSize = 12;
    let cols = Math.floor(width / cellSize);
    let rows = Math.floor(height / cellSize);

    let grid = createGrid();
    let nextGrid = createGrid();

    function createGrid() { return new Uint8Array(cols * rows); }

    function randomize() {
      for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.random() > 0.92 ? 1 : 0;
      }
    }

    randomize();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      const newCols = Math.floor(width / cellSize);
      const newRows = Math.floor(height / cellSize);
      if (newCols !== cols || newRows !== rows) {
        cols = newCols;
        rows = newRows;
        grid = createGrid();
        nextGrid = createGrid();
        randomize();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const getIdx = (c: number, r: number) => {
      const col = (c + cols) % cols;
      const row = (r + rows) % rows;
      return row * cols + col;
    };

    const countNeighbors = (c: number, r: number) => {
      let sum = 0;
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          if (i === 0 && j === 0) continue;
          sum += grid[getIdx(c + i, r + j)];
        }
      }
      return sum;
    };

    const update = () => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const state = grid[getIdx(c, r)];
          const neighbors = countNeighbors(c, r);
          const idx = getIdx(c, r);
          if (state === 1 && (neighbors < 2 || neighbors > 3)) {
            nextGrid[idx] = 0;
          } else if (state === 0 && neighbors === 3) {
            nextGrid[idx] = 1;
          } else {
            nextGrid[idx] = state;
          }
        }
      }
      grid.set(nextGrid);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#028D86';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[getIdx(c, r)] === 1) {
            ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
          }
        }
      }
    };

    let frame = 0;
    const animate = () => {
      if (frame % 6 === 0) update();
      draw();
      frame++;
      requestAnimationFrame(animate);
    };

    const disturb = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      for(let i = -3; i <= 3; i++) {
        for(let j = -3; j <= 3; j++) {
           if (Math.random() > 0.4) grid[getIdx(c + i, r + j)] = 1;
        }
      }
    };

    window.addEventListener('mousemove', disturb);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', disturb);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-auto opacity-[0.1] z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default InteractiveBackground;
