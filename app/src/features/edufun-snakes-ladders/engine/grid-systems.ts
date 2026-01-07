/**
 * Grid Systems for Snakes and Ladders
 * Handles coordinate mapping and zig-zag board logic
 */

// Board configuration
export const TOTAL_SQUARES = 100
export const COLS = 10
export const ROWS = 10
export const TILE_SIZE = 40 // Can be overridden based on screen size

/**
 * Board coordinate system types
 */
export interface GridPosition {
  row: number
  col: number
}

export interface PixelPosition {
  x: number
  y: number
}

export interface BoardConfig {
  totalSquares: number
  cols: number
  rows: number
  tileSize: number
  boardWidth: number
  boardHeight: number
}

/**
 * Create board configuration based on screen dimensions
 */
export function createBoardConfig(
  screenWidth: number,
  screenHeight: number,
  padding: number = 120,
): BoardConfig {
  const maxBoardSize = Math.min(screenWidth, screenHeight) - padding
  const tileSize = Math.floor(maxBoardSize / COLS)
  const boardWidth = tileSize * COLS
  const boardHeight = tileSize * ROWS

  return {
    totalSquares: TOTAL_SQUARES,
    cols: COLS,
    rows: ROWS,
    tileSize,
    boardWidth,
    boardHeight,
  }
}

/**
 * Convert square index (0-99) to grid position (row, col)
 * Implements zig-zag pattern:
 * - Even rows (0, 2, 4...): left to right
 * - Odd rows (1, 3, 5...): right to left
 */
export function indexToGridPosition(index: number): GridPosition {
  if (index < 0 || index >= TOTAL_SQUARES) {
    return { row: 0, col: 0 }
  }

  const row = Math.floor(index / COLS)
  let col = index % COLS

  // Zig-zag adjustment: odd rows go right to left
  if (row % 2 === 1) {
    col = COLS - 1 - col
  }

  return { row, col }
}

/**
 * Convert square number (1-100) to grid position
 */
export function squareToGridPosition(squareNumber: number): GridPosition {
  return indexToGridPosition(squareNumber - 1)
}

/**
 * Convert grid position to pixel coordinates
 * Origin is at bottom-left of the board
 */
export function gridToPixelPosition(
  gridPos: GridPosition,
  tileSize: number,
  boardHeight: number,
): PixelPosition {
  const x = gridPos.col * tileSize + tileSize / 2
  const y = boardHeight - (gridPos.row * tileSize + tileSize / 2)
  return { x, y }
}

/**
 * Convert square number (1-100) directly to pixel coordinates
 */
export function squareToPixelPosition(
  squareNumber: number,
  tileSize: number,
  boardHeight: number,
): PixelPosition {
  const gridPos = squareToGridPosition(squareNumber)
  return gridToPixelPosition(gridPos, tileSize, boardHeight)
}

/**
 * Convert square number to XY for rendering (for 6x7 or custom boards)
 * This is compatible with the existing index.tsx logic
 */
export function squareToXY(
  squareNumber: number,
  cols: number = COLS,
  totalSquares: number = TOTAL_SQUARES,
): { x: number; y: number } {
  const rows = Math.ceil(totalSquares / cols)

  if (squareNumber <= 0) {
    return { x: 0, y: rows - 1 }
  }

  const idx = squareNumber - 1
  const row = Math.floor(idx / cols)
  let col = idx % cols

  // Zig-zag: odd rows reverse
  if (row % 2 === 1) {
    col = cols - 1 - col
  }

  const y = rows - 1 - row
  const x = col
  return { x, y }
}

/**
 * Calculate pixel position for a player token with offset for multiple players
 */
export function calculateTokenPosition(
  squareNumber: number,
  playerId: number,
  cellSize: number,
  cols: number = COLS,
  totalSquares: number = TOTAL_SQUARES,
): { left: number; top: number } {
  const { x, y } = squareToXY(squareNumber, cols, totalSquares)

  // Offset for multiple tokens on same square
  const tokensPerRow = 3
  const col = playerId % tokensPerRow
  const row = Math.floor(playerId / tokensPerRow)
  const offsetX = col * (cellSize * 0.25)
  const offsetY = row * (cellSize * 0.25)

  const left = x * cellSize + cellSize * 0.1 + offsetX
  const top = y * cellSize + cellSize * 0.1 + offsetY

  return { left, top }
}

/**
 * Check if a square is a special square (snake head or ladder bottom)
 */
export function isSpecialSquare(
  squareNumber: number,
  snakes: Record<number, number>,
  ladders: Record<number, number>,
): { isSnake: boolean; isLadder: boolean; destination: number | null } {
  const isSnake = squareNumber in snakes
  const isLadder = squareNumber in ladders

  let destination: number | null = null
  if (isSnake) destination = snakes[squareNumber]
  if (isLadder) destination = ladders[squareNumber]

  return { isSnake, isLadder, destination }
}

/**
 * Get display label for a square
 */
export function getSquareLabel(squareNumber: number, totalSquares: number = TOTAL_SQUARES): string {
  if (squareNumber === 1) return 'START'
  if (squareNumber === totalSquares) return 'FINISH'
  return squareNumber.toString()
}
