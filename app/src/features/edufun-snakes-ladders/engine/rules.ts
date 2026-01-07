/**
 * Game Rules for Snakes and Ladders
 * Handles snakes, ladders, dice logic, and game state
 */

import { TOTAL_SQUARES } from './grid-systems'

/**
 * Game configuration types
 */
export type GameMode = 'multiplayer' | 'solo'
export type Difficulty = 'santai' | 'tantangan'

export interface SnakesAndLadders {
  snakes: Record<number, number>
  ladders: Record<number, number>
}

export interface DiceResult {
  value: number
  isDouble?: boolean
}

export interface MoveResult {
  startPosition: number
  diceValue: number
  landingPosition: number
  finalPosition: number
  hitSnake: boolean
  hitLadder: boolean
  snakeFrom?: number
  snakeTo?: number
  ladderFrom?: number
  ladderTo?: number
  isWin: boolean
  canRollAgain: boolean
  message: string
}

export interface GameState {
  currentPlayerIndex: number
  isGameOver: boolean
  winnerId: number | null
  consecutiveSnakeHits: Record<number, number> // Track consecutive snake hits per player
}

/**
 * Default snakes configuration (for 100 squares board)
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
 * Default ladders configuration (for 100 squares board)
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

/**
 * Default snakes configuration (for 42 squares board)
 */
export const DEFAULT_SNAKES_42: Record<number, number> = {
  17: 5,
  21: 9,
  25: 13,
  33: 24,
  36: 30,
  39: 32,
  41: 31,
}

/**
 * Default ladders configuration (for 42 squares board)
 */
export const DEFAULT_LADDERS_42: Record<number, number> = {
  2: 12,
  4: 14,
  7: 18,
  11: 23,
  15: 26,
  19: 29,
  22: 34,
  28: 38,
}

/**
 * Roll a standard 6-sided dice
 */
export function rollDice(): DiceResult {
  const value = Math.floor(Math.random() * 6) + 1
  return { value }
}

/**
 * Roll dice with potential manipulation (for bot rubber banding)
 * @param bias - 'low' biases towards 1-3, 'high' biases towards 4-6, 'normal' is fair
 */
export function rollDiceWithBias(bias: 'low' | 'high' | 'normal' = 'normal'): DiceResult {
  if (bias === 'normal') {
    return rollDice()
  }

  const rand = Math.random()

  if (bias === 'low') {
    // 60% chance of 1-2, 30% chance of 3-4, 10% chance of 5-6
    if (rand < 0.35) return { value: 1 }
    if (rand < 0.65) return { value: 2 }
    if (rand < 0.8) return { value: 3 }
    if (rand < 0.9) return { value: 4 }
    if (rand < 0.96) return { value: 5 }
    return { value: 6 }
  }

  // high bias
  // 60% chance of 5-6, 30% chance of 3-4, 10% chance of 1-2
  if (rand < 0.05) return { value: 1 }
  if (rand < 0.12) return { value: 2 }
  if (rand < 0.25) return { value: 3 }
  if (rand < 0.45) return { value: 4 }
  if (rand < 0.7) return { value: 5 }
  return { value: 6 }
}

/**
 * Check if a position lands on a snake
 */
export function checkSnake(
  position: number,
  snakes: Record<number, number>,
): { hit: boolean; destination: number } {
  if (position in snakes) {
    return { hit: true, destination: snakes[position] }
  }
  return { hit: false, destination: position }
}

/**
 * Check if a position lands on a ladder
 */
export function checkLadder(
  position: number,
  ladders: Record<number, number>,
): { hit: boolean; destination: number } {
  if (position in ladders) {
    return { hit: true, destination: ladders[position] }
  }
  return { hit: false, destination: position }
}

/**
 * Check if a dice roll would land safely (not on a snake)
 * Used for mercy rule
 */
export function wouldLandSafely(
  currentPosition: number,
  diceValue: number,
  snakes: Record<number, number>,
  totalSquares: number = TOTAL_SQUARES,
): boolean {
  const targetPosition = currentPosition + diceValue
  if (targetPosition > totalSquares) return true // Would need to stay
  return !(targetPosition in snakes)
}

/**
 * Find a safe dice value that doesn't land on a snake
 */
export function findSafeDiceValue(
  currentPosition: number,
  snakes: Record<number, number>,
  totalSquares: number = TOTAL_SQUARES,
): number {
  // Try to find a safe dice value (1-6)
  const safeValues: number[] = []

  for (let d = 1; d <= 6; d++) {
    const target = currentPosition + d
    if (target <= totalSquares && !(target in snakes)) {
      safeValues.push(d)
    } else if (target > totalSquares) {
      // Staying in place is safe
      safeValues.push(d)
    }
  }

  if (safeValues.length > 0) {
    // Return a random safe value
    return safeValues[Math.floor(Math.random() * safeValues.length)]
  }

  // No safe value found, return random (shouldn't happen with proper snake placement)
  return Math.floor(Math.random() * 6) + 1
}

/**
 * Calculate the result of a move
 */
export function calculateMove(
  currentPosition: number,
  diceValue: number,
  snakes: Record<number, number>,
  ladders: Record<number, number>,
  totalSquares: number = TOTAL_SQUARES,
  playerName: string = 'Player',
): MoveResult {
  const targetPosition = currentPosition + diceValue
  let message = `${playerName} rolled ${diceValue}`

  // Check if overshooting the finish
  if (targetPosition > totalSquares) {
    return {
      startPosition: currentPosition,
      diceValue,
      landingPosition: currentPosition,
      finalPosition: currentPosition,
      hitSnake: false,
      hitLadder: false,
      isWin: false,
      canRollAgain: diceValue === 6,
      message: `${message} → needs exact number to finish!`,
    }
  }

  let finalPosition = targetPosition
  let hitSnake = false
  let hitLadder = false
  let snakeFrom: number | undefined
  let snakeTo: number | undefined
  let ladderFrom: number | undefined
  let ladderTo: number | undefined

  message += ` → moved to ${targetPosition}`

  // Check ladder first
  const ladderCheck = checkLadder(targetPosition, ladders)
  if (ladderCheck.hit) {
    hitLadder = true
    ladderFrom = targetPosition
    ladderTo = ladderCheck.destination
    finalPosition = ladderCheck.destination
    message += ` | TANGGA ${ladderFrom} → ${ladderTo}! 🎉`
  }

  // Check snake (only if didn't hit ladder)
  if (!hitLadder) {
    const snakeCheck = checkSnake(targetPosition, snakes)
    if (snakeCheck.hit) {
      hitSnake = true
      snakeFrom = targetPosition
      snakeTo = snakeCheck.destination
      finalPosition = snakeCheck.destination
      message += ` | ULAR ${snakeFrom} → ${snakeTo}! 😱`
    }
  }

  // Check for win
  const isWin = finalPosition === totalSquares
  if (isWin) {
    message = `${playerName} MENANG! 🎉🏆`
  }

  return {
    startPosition: currentPosition,
    diceValue,
    landingPosition: targetPosition,
    finalPosition,
    hitSnake,
    hitLadder,
    snakeFrom,
    snakeTo,
    ladderFrom,
    ladderTo,
    isWin,
    canRollAgain: diceValue === 6 && !isWin,
    message,
  }
}

/**
 * Get the next player index
 */
export function getNextPlayerIndex(
  currentIndex: number,
  totalPlayers: number,
  canRollAgain: boolean,
): number {
  if (canRollAgain) {
    return currentIndex
  }
  return (currentIndex + 1) % totalPlayers
}

/**
 * Update consecutive snake hits counter
 */
export function updateSnakeHitCounter(
  playerId: number,
  hitSnake: boolean,
  currentCounts: Record<number, number>,
): Record<number, number> {
  const newCounts = { ...currentCounts }

  if (hitSnake) {
    newCounts[playerId] = (newCounts[playerId] || 0) + 1
  } else {
    // Reset counter if didn't hit snake
    newCounts[playerId] = 0
  }

  return newCounts
}

/**
 * Check if mercy rule should apply
 */
export function shouldApplyMercyRule(
  playerId: number,
  consecutiveSnakeHits: Record<number, number>,
  mercyThreshold: number = 3,
): boolean {
  return (consecutiveSnakeHits[playerId] || 0) >= mercyThreshold
}

/**
 * Calculate position gap between players
 */
export function calculatePositionGap(
  playerPosition: number,
  otherPositions: number[],
): { maxGap: number; isBehind: boolean } {
  if (otherPositions.length === 0) {
    return { maxGap: 0, isBehind: false }
  }

  const maxOtherPosition = Math.max(...otherPositions)
  const gap = maxOtherPosition - playerPosition

  return {
    maxGap: Math.abs(gap),
    isBehind: gap > 0,
  }
}
