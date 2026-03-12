/**
 * Snakes and Ladders Game Engine
 * Exports all game logic modules
 */

// Configuration - Board settings, types, and constants
export {
  BOARD_CONFIG_42,
  BOARD_CONFIG_100,
  DEFAULT_SNAKES_42,
  DEFAULT_LADDERS_42,
  DEFAULT_SNAKES_100,
  DEFAULT_LADDERS_100,
  SNAKE_ASSET_MAP,
  SNAKE_ROTATION_OFFSETS,
  SKIN_TONES,
  TOKEN_COLORS,
  THEME_COLORS,
  buildAvatarPath,
  createInitialAvatars,
  createInitialNames,
  calculateBoardDimensions,
} from './config'

// Re-export snakes with alias for backward compatibility
export { DEFAULT_SNAKES_42 as DEFAULT_SNAKES } from './config'

export type { ThemeColors, SkinTone, Gender, AvatarSpec, Player, SetupTab, Phase } from './config'

// Grid Systems - Coordinate mapping and board layout
export {
  TOTAL_SQUARES,
  COLS,
  ROWS,
  TILE_SIZE,
  createBoardConfig,
  indexToGridPosition,
  squareToGridPosition,
  gridToPixelPosition,
  squareToPixelPosition,
  squareToXY,
  calculateTokenPosition,
  isSpecialSquare,
  getSquareLabel,
} from './grid-systems'

export type { GridPosition, PixelPosition, BoardConfig } from './grid-systems'

// Rules - Game mechanics, snakes/ladders, dice logic
export {
  rollDice,
  rollDiceWithBias,
  checkSnake,
  checkLadder,
  wouldLandSafely,
  findSafeDiceValue,
  calculateMove,
  getNextPlayerIndex,
  updateSnakeHitCounter,
  shouldApplyMercyRule,
  calculatePositionGap,
} from './rules'

export type {
  GameMode,
  Difficulty,
  SnakesAndLadders,
  DiceResult,
  MoveResult,
  GameState,
} from './rules'

// Bot Logic - AI opponents with personality and RNG manipulation
// Note: bot-logic.ts has been moved to screens/UlarTangga/optional/
export {
  reactionToEmoticon,
  getBotPersonality,
  generateThinkingDuration,
  shouldApplyRubberBanding,
  calculateBotDiceRoll,
  calculateHumanDiceRoll,
  determineBotReaction,
  executeBotTurn,
  createBotConfigs,
  getBotMessage,
  calculateBotActionDelays,
  isBotTurn,
  getReactionMessage,
} from '../../../screens/UlarTangga/optional/bot-logic'

export type {
  BotPersonality,
  BotReaction,
  Emoticon,
  BotConfig,
  BotState,
  BotActionResult,
  GameContext,
} from '../../../screens/UlarTangga/optional/bot-logic'
