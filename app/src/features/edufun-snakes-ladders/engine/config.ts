/**
 * Game Configuration for Snakes and Ladders
 * Contains all configuration, types, and constants for the game
 */

import { ImageSourcePropType } from 'react-native'

// ============================================
// BOARD CONFIGURATION
// ============================================

/**
 * Board configuration for 42 squares (6x7 grid)
 */
export const BOARD_CONFIG_42 = {
  TOTAL_SQUARES: 42,
  COLS: 6,
  ROWS: 7,
  PLAYABLE_SQUARES: 40,
} as const

/**
 * Board configuration for 100 squares (10x10 grid)
 */
export const BOARD_CONFIG_100 = {
  TOTAL_SQUARES: 100,
  COLS: 10,
  ROWS: 10,
  PLAYABLE_SQUARES: 100,
} as const

// ============================================
// SNAKE AND LADDER CONFIGURATIONS
// ============================================

/**
 * Default snakes for 42 squares board
 */
export const DEFAULT_SNAKES_42: Record<number, number> = {
  8: 6,
  28: 17,
  24: 14,
  39: 27,
}

/**
 * Default ladders for 42 squares board
 * All ladders are vertical (same column) to appear straight on board
 * Note: n=1 is START, n=2 displays "1", n=3 displays "2", etc.
 */
export const DEFAULT_LADDERS_42: Record<number, number> = {
  2: 14,  // Display 1 -> 13 (row 0 ke row 2, sama-sama arah kanan, lurus vertikal)
  4: 16,  // Display 3 -> 15 (row 0 ke row 2, sama-sama arah kanan, lurus vertikal)
  19: 31, // Display 18 -> 30 (row 3 ke row 5, sama-sama arah kiri, lurus vertikal)
  25: 37, // Display 24 -> 36 (row 4 ke row 6, sama-sama arah kanan, lurus vertikal)
}

/**
 * Default snakes for 100 squares board
 */
export const DEFAULT_SNAKES_100: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
}

/**
 * Default ladders for 100 squares board
 */
export const DEFAULT_LADDERS_100: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
}

// ============================================
// SNAKE ASSET CONFIGURATION
// ============================================

/**
 * Map Board Index -> Asset Array Index
 * Index 0 = ular 5, Index 1 = ular 7, Index 2 = ular 2, Index 3 = ular 8
 */
export const SNAKE_ASSET_MAP: Record<number, number> = {
  8: 3, // ular 8
  28: 1, // ular 7 (Custom Rotation)
  24: 0, // ular 5
  39: 2, // ular 2 (Custom Rotation)
}

/**
 * Rotation Offsets per Snake Image
 * Key = Asset Index (0-3), Value = Degrees to add
 */
export const SNAKE_ROTATION_OFFSETS: Record<number, number> = {
  0: -45, // ular 5 (Standard)
  1: -57, // ular 7 (Changed: Try 90 or 270 if 90 is upside down)
  2: -90, // ular 2 (Changed: Try 90 or 270 if 90 is upside down)
  3: -45, // ular 8 (Standard)
}

// ============================================
// PLAYER CUSTOMIZATION
// ============================================

/**
 * Available skin tones for player avatars
 */
export type SkinTone = 'LIGHT' | 'MEDIUM' | 'DARK'
export const SKIN_TONES: SkinTone[] = ['LIGHT', 'MEDIUM', 'DARK']

/**
 * Available token colors for players
 */
export const TOKEN_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6'] as const

// ============================================
// THEME CONFIGURATION
// ============================================

export interface ThemeColors {
  bg: string
  primary: string
  secondary: string
  text: string
  neutral: string
  square1: string
  square2: string
  start: string
  finish: string
  cardBg: string
  outline: string
  shadow: string
  snake: string
  ladder: string
  accent: string
  accentDark: string
  muted: string
  boardBg: string
}

export const THEME_COLORS: Record<'light', ThemeColors> = {
  light: {
    bg: '#FDFCF0',
    primary: '#E07A5F',
    secondary: '#81B29A',
    text: '#3D405B',
    neutral: '#D4A373',
    square1: '#DB307A',
    square2: '#FFDDDC',
    start: '#2E411E',
    finish: '#FFDDDC',
    cardBg: '#FFFFFF',
    outline: '#D4A373',
    shadow: '#3D405B',
    snake: '#E07A5F',
    ladder: '#81B29A',
    accent: '#E07A5F',
    accentDark: '#D4A373',
    muted: '#3D405B',
    boardBg: '#FDFCF0',
  },
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export type Gender = 'Female' | 'Male'

export type AvatarSpec = {
  gender: Gender
  skinTone: SkinTone
  hair?: string
  clothes?: string
  accessory?: string
  color?: string
}

export type Player = {
  id: number
  name: string
  avatar: AvatarSpec
  pos: number
  isBot?: boolean
}

export type SetupTab = 'skin' | 'hair' | 'clothes' | 'accessory'

export type Phase = 'choose' | 'setup' | 'play'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build avatar set folder path for loading avatar images
 */
export function buildAvatarPath(avatar: AvatarSpec): string | null {
  const { gender, skinTone, hair, clothes, accessory } = avatar
  if (!hair || !clothes) return null // Minimum required

  // Use 'NONE' if no accessory is selected
  const accessoryPart = accessory || 'NONE'

  if (gender === 'Male') {
    const folderName = `M-${skinTone}-${hair}-${clothes}-${accessoryPart}`
    return `Male/set/${folderName}/IDLE.svg`
  } else {
    const folderName = `F-${skinTone}-${hair}-${clothes}-${accessoryPart}`
    return `Female/set/${folderName}/IDLE.svg`
  }
}

/**
 * Create initial player avatars for setup phase
 */
export function createInitialAvatars(playerCount: number): AvatarSpec[] {
  return Array(playerCount)
    .fill(null)
    .map((_, i) => ({
      gender: 'Female' as Gender,
      skinTone: 'LIGHT' as SkinTone,
      hair: 'BRAID',
      clothes: 'BASIC',
      accessory: undefined,
      color: TOKEN_COLORS[i % TOKEN_COLORS.length],
    }))
}

/**
 * Create initial player names for setup phase
 */
export function createInitialNames(playerCount: number): string[] {
  return Array(playerCount)
    .fill(null)
    .map((_, i) => `Pemain ${i + 1}`)
}

/**
 * Calculate board dimensions based on screen size
 */
export function calculateBoardDimensions(
  screenWidth: number,
  screenHeight: number,
  boardConfig: typeof BOARD_CONFIG_42 | typeof BOARD_CONFIG_100 = BOARD_CONFIG_42,
  padding: { horizontal: number; vertical: number } = { horizontal: 32, vertical: 200 },
): {
  boardSize: number
  boardHeight: number
  cellSize: number
  rows: number
} {
  const rows = Math.ceil(boardConfig.TOTAL_SQUARES / boardConfig.COLS)
  const aspectRatio = rows / boardConfig.COLS
  const maxBoardWidth = Math.min(screenWidth - padding.horizontal, 400)
  const maxBoardHeight = Math.min(screenHeight - padding.vertical, 400)

  let boardSize = Math.min(maxBoardWidth, maxBoardHeight / aspectRatio)
  boardSize = Math.max(260, boardSize)

  const cellSize = boardSize / boardConfig.COLS
  const boardHeight = cellSize * rows

  return { boardSize, boardHeight, cellSize, rows }
}
