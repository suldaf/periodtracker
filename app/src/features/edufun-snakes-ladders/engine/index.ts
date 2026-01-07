/**
 * Snakes and Ladders Game Engine
 * Exports all game logic modules
 */

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
  DEFAULT_SNAKES_100,
  DEFAULT_LADDERS_100,
  DEFAULT_SNAKES_42,
  DEFAULT_LADDERS_42,
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
} from './bot-logic'

export type {
  BotPersonality,
  BotReaction,
  Emoticon,
  BotConfig,
  BotState,
  BotActionResult,
  GameContext,
} from './bot-logic'
