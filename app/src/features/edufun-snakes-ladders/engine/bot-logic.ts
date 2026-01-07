/**
 * Bot Logic for Snakes and Ladders
 * Handles AI opponents with personality, animations, and RNG manipulation
 */

import {
  rollDice,
  rollDiceWithBias,
  findSafeDiceValue,
  shouldApplyMercyRule,
  calculatePositionGap,
  DiceResult,
} from './rules'

/**
 * Bot personality types
 */
export type BotPersonality = 'si_gesit' | 'si_bijak'

/**
 * Bot reaction types
 */
export type BotReaction =
  | 'laugh' // Tertawa
  | 'cheer' // Semangat
  | 'surprised' // Kaget
  | 'sad' // Sedih
  | 'celebrate' // Merayakan
  | 'thinking' // Berpikir
  | 'none'

export type Emoticon = '😂' | '💪' | '😮' | '😢' | '🎉' | '🤔' | ''

/**
 * Bot configuration
 */
export interface BotConfig {
  id: number
  name: string
  personality: BotPersonality
  avatarId: string
  difficulty: 'santai' | 'tantangan'
}

/**
 * Bot state
 */
export interface BotState {
  id: number
  position: number
  isThinking: boolean
  currentReaction: BotReaction
  lastDiceValue: number
}

/**
 * Bot action result
 */
export interface BotActionResult {
  diceValue: number
  reaction: BotReaction
  emoticon: Emoticon
  animationSpeed: 'fast' | 'normal' | 'slow'
  thinkingDuration: number // ms
  message: string
}

/**
 * Game context for bot decision making
 */
export interface GameContext {
  humanPosition: number
  botPositions: number[]
  consecutiveSnakeHits: Record<number, number>
  snakes: Record<number, number>
  ladders: Record<number, number>
  totalSquares: number
}

/**
 * RNG Manipulation thresholds
 */
const RUBBER_BAND_GAP_THRESHOLD = 30 // Activate rubber banding if human is 30+ squares behind
const MERCY_RULE_THRESHOLD = 3 // Apply mercy after 3 consecutive snake hits

/**
 * Bot personality configurations
 */
const BOT_PERSONALITIES: Record<
  BotPersonality,
  {
    name: string
    thinkingDurationMin: number
    thinkingDurationMax: number
    animationSpeed: 'fast' | 'normal' | 'slow'
    reactionOnPlayerSnake: BotReaction
    reactionOnOwnLadder: BotReaction
    reactionOnOwnSnake: BotReaction
    reactionOnWin: BotReaction
  }
> = {
  si_gesit: {
    name: 'Si Gesit',
    thinkingDurationMin: 300,
    thinkingDurationMax: 800,
    animationSpeed: 'fast',
    reactionOnPlayerSnake: 'laugh', // Tertawa jika pemain turun ular
    reactionOnOwnLadder: 'celebrate',
    reactionOnOwnSnake: 'surprised',
    reactionOnWin: 'celebrate',
  },
  si_bijak: {
    name: 'Si Bijak',
    thinkingDurationMin: 800,
    thinkingDurationMax: 1500,
    animationSpeed: 'normal',
    reactionOnPlayerSnake: 'cheer', // Mengirim emotikon "Semangat" jika pemain terkena ular
    reactionOnOwnLadder: 'thinking',
    reactionOnOwnSnake: 'thinking',
    reactionOnWin: 'cheer',
  },
}

/**
 * Map reaction to emoticon
 */
export function reactionToEmoticon(reaction: BotReaction): Emoticon {
  switch (reaction) {
    case 'laugh':
      return '😂'
    case 'cheer':
      return '💪'
    case 'surprised':
      return '😮'
    case 'sad':
      return '😢'
    case 'celebrate':
      return '🎉'
    case 'thinking':
      return '🤔'
    default:
      return ''
  }
}

/**
 * Get bot personality config
 */
export function getBotPersonality(personality: BotPersonality) {
  return BOT_PERSONALITIES[personality]
}

/**
 * Generate random thinking duration based on personality
 */
export function generateThinkingDuration(personality: BotPersonality): number {
  const config = BOT_PERSONALITIES[personality]
  const range = config.thinkingDurationMax - config.thinkingDurationMin
  return config.thinkingDurationMin + Math.floor(Math.random() * range)
}

/**
 * Determine if rubber banding should apply
 * Rubber banding: If human is far behind, bot gets worse dice rolls
 */
export function shouldApplyRubberBanding(
  humanPosition: number,
  botPosition: number,
  gapThreshold: number = RUBBER_BAND_GAP_THRESHOLD,
): boolean {
  const gap = botPosition - humanPosition
  return gap >= gapThreshold
}

/**
 * Calculate bot dice result with potential manipulation
 * This implements the hidden RNG mechanics for player retention
 */
export function calculateBotDiceRoll(
  botId: number,
  botPosition: number,
  context: GameContext,
  difficulty: 'santai' | 'tantangan',
): DiceResult {
  // Standard bot (santai difficulty) uses normal dice
  if (difficulty === 'santai') {
    // Check rubber banding
    if (shouldApplyRubberBanding(context.humanPosition, botPosition)) {
      // Subtle bias towards lower numbers
      return rollDiceWithBias('low')
    }
    return rollDice()
  }

  // Smart bot (tantangan difficulty) - still apply rubber banding but less obvious
  if (shouldApplyRubberBanding(context.humanPosition, botPosition)) {
    // Less aggressive bias for smart bot
    const rand = Math.random()
    if (rand < 0.4) {
      return rollDiceWithBias('low')
    }
  }

  return rollDice()
}

/**
 * Calculate human dice result with potential mercy rule
 * Mercy Rule: After 3 consecutive snake hits, guarantee a safe roll
 */
export function calculateHumanDiceRoll(
  playerId: number,
  position: number,
  context: GameContext,
): DiceResult {
  // Check mercy rule
  if (shouldApplyMercyRule(playerId, context.consecutiveSnakeHits, MERCY_RULE_THRESHOLD)) {
    // Find a dice value that doesn't land on a snake
    const safeValue = findSafeDiceValue(position, context.snakes, context.totalSquares)
    return { value: safeValue }
  }

  // Normal roll
  return rollDice()
}

/**
 * Determine bot reaction based on game event
 */
export function determineBotReaction(
  botPersonality: BotPersonality,
  event:
    | 'player_snake'
    | 'player_ladder'
    | 'bot_snake'
    | 'bot_ladder'
    | 'bot_win'
    | 'player_win'
    | 'none',
): { reaction: BotReaction; emoticon: Emoticon } {
  const config = BOT_PERSONALITIES[botPersonality]
  let reaction: BotReaction = 'none'

  switch (event) {
    case 'player_snake':
      reaction = config.reactionOnPlayerSnake
      break
    case 'bot_ladder':
      reaction = config.reactionOnOwnLadder
      break
    case 'bot_snake':
      reaction = config.reactionOnOwnSnake
      break
    case 'bot_win':
      reaction = config.reactionOnWin
      break
    case 'player_ladder':
      reaction = 'surprised'
      break
    case 'player_win':
      reaction = 'sad'
      break
    default:
      reaction = 'none'
  }

  return {
    reaction,
    emoticon: reactionToEmoticon(reaction),
  }
}

/**
 * Execute bot turn
 * Returns all necessary information for animation and game state update
 */
export function executeBotTurn(
  bot: BotConfig,
  botPosition: number,
  context: GameContext,
): BotActionResult {
  const personality = getBotPersonality(bot.personality)

  // Calculate dice roll with potential manipulation
  const diceResult = calculateBotDiceRoll(bot.id, botPosition, context, bot.difficulty)

  // Determine thinking duration
  const thinkingDuration = generateThinkingDuration(bot.personality)

  return {
    diceValue: diceResult.value,
    reaction: 'none', // Initial reaction, will be updated after move resolves
    emoticon: '',
    animationSpeed: personality.animationSpeed,
    thinkingDuration,
    message: `${bot.name} sedang berpikir...`,
  }
}

/**
 * Create bot configurations for solo mode
 */
export function createBotConfigs(
  count: number,
  difficulty: 'santai' | 'tantangan',
  startingId: number = 1,
): BotConfig[] {
  const bots: BotConfig[] = []
  const personalities: BotPersonality[] = ['si_gesit', 'si_bijak']
  const names = ['Bot Oky', 'Bot Luna', 'Bot Bima']

  for (let i = 0; i < count && i < 3; i++) {
    bots.push({
      id: startingId + i,
      name: names[i] || `Bot ${i + 1}`,
      personality: personalities[i % personalities.length],
      avatarId: `bot_avatar_${i + 1}`,
      difficulty,
    })
  }

  return bots
}

/**
 * Get bot message based on situation
 */
export function getBotMessage(
  botName: string,
  personality: BotPersonality,
  event: 'thinking' | 'rolling' | 'moving' | 'landed' | 'snake' | 'ladder' | 'win',
): string {
  const messages: Record<BotPersonality, Record<string, string[]>> = {
    si_gesit: {
      thinking: ['Hmm...', 'Sebentar ya!', 'Aku siap!'],
      rolling: ['Yuk lempar!', 'Ayo!', 'Hiyaaa!'],
      moving: ['Maju terus!', 'Ayo ayo!', 'Cepat!'],
      landed: ['Sampai!', 'Hehe!', 'Yes!'],
      snake: ['Aduh!', 'Yah!', 'Oops!'],
      ladder: ['Wohoo!', 'Asik!', 'Mantap!'],
      win: ['Aku menang!', 'Hore!', 'Yeay!'],
    },
    si_bijak: {
      thinking: ['Hmm, mari kita lihat...', 'Baiklah...', 'Tenang...'],
      rolling: ['Bismillah...', 'Semoga beruntung...', 'Aku lempar ya...'],
      moving: ['Pelan-pelan saja...', 'Maju...', 'Melangkah...'],
      landed: ['Alhamdulillah...', 'Baik...', 'Oke...'],
      snake: ['Tidak apa-apa...', 'Sabar...', 'Bagian dari permainan...'],
      ladder: ['Alhamdulillah...', 'Rezeki...', 'Bersyukur...'],
      win: ['Alhamdulillah, aku menang...', 'Terima kasih...', 'Senang sekali...'],
    },
  }

  const options = messages[personality][event] || ['...']
  return `${botName}: "${options[Math.floor(Math.random() * options.length)]}"`
}

/**
 * Calculate delay between bot actions for natural feel
 */
export function calculateBotActionDelays(
  personality: BotPersonality,
): {
  beforeRoll: number
  afterRoll: number
  betweenMoves: number
  afterSpecial: number
} {
  if (personality === 'si_gesit') {
    return {
      beforeRoll: 400,
      afterRoll: 300,
      betweenMoves: 100,
      afterSpecial: 500,
    }
  }

  // si_bijak - more deliberate
  return {
    beforeRoll: 800,
    afterRoll: 600,
    betweenMoves: 200,
    afterSpecial: 1000,
  }
}

/**
 * Check if it's a bot's turn
 */
export function isBotTurn(currentPlayerId: number, botIds: number[]): boolean {
  return botIds.includes(currentPlayerId)
}

/**
 * Get reaction message for display
 */
export function getReactionMessage(
  botName: string,
  reaction: BotReaction,
  emoticon: Emoticon,
): string {
  if (reaction === 'none') return ''

  return `${botName} ${emoticon}`
}
