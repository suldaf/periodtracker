import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'
import { Canvas, Circle, Line, Rect, Group } from '@shopify/react-native-skia'
import { ScreenComponent } from '../../navigation/RootNavigator'

/**
 * LudoScreen – Skia starter
 *
 * Notes:
 * - This is an “init” screen: draws a simple 15x15 board and animates one token along a demo path.
 * - Replace `buildDemoPath()` with the real Ludo 52-step track + home paths when you’re ready.
 */

type Cell = { x: number; y: number }
type Color = 'red' | 'blue' | 'yellow' | 'green'

const TRACK_LEN = 52
const SAFE_GLOBAL_TRACK_INDEX = new Set([0, 13, 26, 39]) // safe squares by global index  [oai_citation:3‡GitHub](https://github.com/bocaletto-luca/Ludo)

// mapping start offset (global) — urutan ini umum dipakai: Red, Blue, Yellow, Green  [oai_citation:4‡GitHub](https://github.com/bocaletto-luca/Ludo)
const START_OFFSET: Record<Color, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
}

// progress model
// -1 = base
//  0..51 = track
// 52..56 = home lane
// 57 = finish
const GOAL_PROGRESS = 57
const LANE_START = 52
const LANE_END = 56

const GRID = 15

function clamp(n: number, min: number, max: number) {
  'worklet'
  return Math.max(min, Math.min(max, n))
}
function computeNextProgress(curr: number, dice: number): number | null {
  'worklet'
  // token di base: cuma bisa keluar kalau 6  [oai_citation:5‡Wikipedia](https://en.wikipedia.org/wiki/Ludo?utm_source=chatgpt.com)
  if (curr === -1) return dice === 6 ? 0 : null

  const next = curr + dice

  // tidak boleh lewat finish (harus pas / exact roll untuk masuk finish)  [oai_citation:6‡Wikipedia](https://en.wikipedia.org/wiki/Ludo?utm_source=chatgpt.com)
  if (next > GOAL_PROGRESS) return null

  return next
}

function isOnTrack(progress: number) {
  'worklet'
  return progress >= 0 && progress <= 51
}

function isOnLane(progress: number) {
  'worklet'
  return progress >= LANE_START && progress <= LANE_END
}

function isFinished(progress: number) {
  'worklet'
  return progress === GOAL_PROGRESS
}
function toGlobalTrackIndex(color: Color, progress: number): number | null {
  'worklet'
  if (!isOnTrack(progress)) return null
  return (START_OFFSET[color] + progress) % TRACK_LEN
}

function isSafeSquare(color: Color, progress: number): boolean {
  'worklet'
  const gi = toGlobalTrackIndex(color, progress)
  return gi != null && SAFE_GLOBAL_TRACK_INDEX.has(gi)
}
type Token = {
  id: string
  color: Color
  slot: 0 | 1 | 2 | 3
  progress: number // -1..57
}

type MoveResult = {
  moved: Token
  capturedTokenIds: string[]
}

function applyMove(params: {
  tokens: Token[]
  tokenId: string
  dice: number
}): { tokens: Token[]; result: MoveResult } | null {
  'worklet'
  const { tokens, tokenId, dice } = params

  const idx = tokens.findIndex((t) => t.id === tokenId)
  if (idx < 0) return null

  const token = tokens[idx]
  const nextProgress = computeNextProgress(token.progress, dice)
  if (nextProgress == null) return null

  const moved: Token = { ...token, progress: nextProgress }

  const capturedIds: string[] = []

  // capture cuma mungkin kalau mendarat di track (bukan lane/finish), dan target bukan safe  [oai_citation:7‡Wikipedia](https://en.wikipedia.org/wiki/Ludo?utm_source=chatgpt.com)
  if (isOnTrack(moved.progress) && !isSafeSquare(moved.color, moved.progress)) {
    const movedGI = toGlobalTrackIndex(moved.color, moved.progress)!

    for (let i = 0; i < tokens.length; i++) {
      if (i === idx) continue

      const other = tokens[i]
      if (other.color === moved.color) continue // teman sendiri aman… untuk sekarang (block bisa ditambah nanti)

      const otherGI = toGlobalTrackIndex(other.color, other.progress)
      if (otherGI == null) continue

      if (otherGI === movedGI) {
        // ketemu musuh di kotak yang sama -> balik ke base
        capturedIds.push(other.id)
      }
    }
  }

  const nextTokens = tokens.map((t, i) => {
    if (i === idx) return moved
    if (capturedIds.includes(t.id)) return { ...t, progress: -1 }
    return t
  })

  return { tokens: nextTokens, result: { moved, capturedTokenIds: capturedIds } }
}
function resolveLandingCapture(
  tokens: Token[],
  movedTokenId: string,
): { tokens: Token[]; capturedIds: string[] } {
  'worklet'
  const moved = tokens.find((t) => t.id === movedTokenId)
  if (!moved) return { tokens, capturedIds: [] }

  // Capture only when landing on the main track and the landing square is not safe.
  if (!isOnTrack(moved.progress) || isSafeSquare(moved.color, moved.progress)) {
    return { tokens, capturedIds: [] }
  }

  const movedGI = toGlobalTrackIndex(moved.color, moved.progress)
  if (movedGI == null) return { tokens, capturedIds: [] }

  const capturedIds: string[] = []

  for (const other of tokens) {
    if (other.id === moved.id) continue
    if (other.color === moved.color) continue

    const otherGI = toGlobalTrackIndex(other.color, other.progress)
    if (otherGI == null) continue

    if (otherGI === movedGI) capturedIds.push(other.id)
  }

  if (capturedIds.length === 0) return { tokens, capturedIds: [] }

  const nextTokens = tokens.map((t) => (capturedIds.includes(t.id) ? { ...t, progress: -1 } : t))
  return { tokens: nextTokens, capturedIds }
}
type Pt = { x: number; y: number }

const finalHome: Pt = { x: 7, y: 7 }

// A practical 15x15 Ludo common track (52 squares). Index 0 is the “Red” start.
// Safe squares are 0,13,26,39 (your SAFE_GLOBAL_TRACK_INDEX).
// Coords are 0..14 grid cells.
const pathCoordinates: Pt[] = [
  { x: 8, y: 13 },
  { x: 8, y: 14 },
  { x: 7, y: 14 },
  { x: 6, y: 14 },
  { x: 6, y: 13 },
  { x: 6, y: 12 },
  { x: 6, y: 11 },
  { x: 6, y: 10 },
  { x: 6, y: 9 },
  { x: 5, y: 8 },
  { x: 4, y: 8 },
  { x: 3, y: 8 },
  { x: 2, y: 8 },
  { x: 1, y: 8 },
  { x: 0, y: 8 },
  { x: 0, y: 7 },
  { x: 0, y: 6 },
  { x: 1, y: 6 },
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 6 },
  { x: 5, y: 6 },
  { x: 6, y: 5 },
  { x: 6, y: 4 },
  { x: 6, y: 3 },
  { x: 6, y: 2 },
  { x: 6, y: 1 },
  { x: 6, y: 0 },
  { x: 7, y: 0 },
  { x: 8, y: 0 },
  { x: 8, y: 1 },
  { x: 8, y: 2 },
  { x: 8, y: 3 },
  { x: 8, y: 4 },
  { x: 8, y: 5 },
  { x: 9, y: 6 },
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 12, y: 6 },
  { x: 13, y: 6 },
  { x: 14, y: 6 },
  { x: 14, y: 7 },
  { x: 14, y: 8 },
  { x: 13, y: 8 },
  { x: 12, y: 8 },
  { x: 11, y: 8 },
  { x: 10, y: 8 },
  { x: 9, y: 8 },
  { x: 8, y: 9 },
  { x: 8, y: 10 },
  { x: 8, y: 11 },
  { x: 8, y: 12 },
]

// 5 cells from common track into the center (progress 52..56). progress 57 = finalHome.
const finishingLanes: Record<Color, Pt[]> = {
  red: [
    { x: 7, y: 13 },
    { x: 7, y: 12 },
    { x: 7, y: 11 },
    { x: 7, y: 10 },
    { x: 7, y: 9 },
  ],
  blue: [
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
  ],
  yellow: [
    { x: 7, y: 1 },
    { x: 7, y: 2 },
    { x: 7, y: 3 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
  ],
  green: [
    { x: 13, y: 7 },
    { x: 12, y: 7 },
    { x: 11, y: 7 },
    { x: 10, y: 7 },
    { x: 9, y: 7 },
  ],
}

// 4 spots per base (one per token slot)
const basePositions: Record<Color, Pt[]> = {
  yellow: [
    { x: 2, y: 2 },
    { x: 4, y: 2 },
    { x: 2, y: 4 },
    { x: 4, y: 4 },
  ],
  green: [
    { x: 10, y: 2 },
    { x: 12, y: 2 },
    { x: 10, y: 4 },
    { x: 12, y: 4 },
  ],
  blue: [
    { x: 2, y: 10 },
    { x: 4, y: 10 },
    { x: 2, y: 12 },
    { x: 4, y: 12 },
  ],
  red: [
    { x: 10, y: 10 },
    { x: 12, y: 10 },
    { x: 10, y: 12 },
    { x: 12, y: 12 },
  ],
}

const tokenFill: Record<Color, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#f59e0b',
  green: '#22c55e',
}

function progressToPoint(token: Token): Pt {
  const { color, progress, slot } = token

  if (progress === -1) return basePositions[color][slot]
  if (isOnTrack(progress)) return pathCoordinates[toGlobalTrackIndex(color, progress)!]
  if (isOnLane(progress)) return finishingLanes[color][progress - LANE_START]
  if (isFinished(progress)) return finalHome

  // fallback (shouldn't happen)
  return basePositions[color][slot]
}

const LudoScreen: ScreenComponent<'Ludo'> = ({ navigation }) => {
  const { width: w, height: h } = Dimensions.get('window')
  const boardSize = Math.max(260, Math.min(520, Math.min(w, h) - 32))
  const cell = boardSize / GRID

  const [dice, setDice] = useState<number>(1)
  const [info, setInfo] = useState<string>('Tap ROLL 🎲 — token keluar hanya kalau dapat 6')

  const turnOrder = useMemo<Color[]>(() => ['red', 'blue', 'yellow', 'green'], [])
  const [turnIdx, setTurnIdx] = useState(0)
  const currentColor = turnOrder[turnIdx]

  const [isAnimating, setIsAnimating] = useState(false)
  const tokensRef = useRef<Token[]>([])
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (moveTimerRef.current) {
        clearTimeout(moveTimerRef.current)
        moveTimerRef.current = null
      }
    }
  }, [])

  const [tokens, setTokens] = useState<Token[]>(() => {
    const mk = (color: Color): Token[] =>
      ([0, 1, 2, 3] as const).map((slot) => ({
        id: `${color}-${slot}`,
        color,
        slot,
        progress: -1,
      }))

    return [...mk('red'), ...mk('blue'), ...mk('yellow'), ...mk('green')]
  })
  useEffect(() => {
    tokensRef.current = tokens
  }, [tokens])

  const nextTurn = () => setTurnIdx((i) => (i + 1) % turnOrder.length)

  const roll = () => {
    if (isAnimating) return

    const d = Math.floor(Math.random() * 6) + 1
    setDice(d)

    // cari token milik currentColor yang bisa jalan
    const myTokens = tokensRef.current.filter((t) => t.color === currentColor)
    const movable = myTokens.filter((t) => computeNextProgress(t.progress, d) != null)

    if (movable.length === 0) {
      setInfo(`${currentColor.toUpperCase()} rolled ${d} → nggak ada langkah. Giliran lanjut.`)
      nextTurn()
      return
    }

    // (simple) auto-pilih token pertama yang valid
    const pick = movable[0]
    const from = pick.progress
    const to = computeNextProgress(from, d)

    if (to == null) {
      setInfo(`${currentColor.toUpperCase()} rolled ${d} → nggak ada langkah. Giliran lanjut.`)
      nextTurn()
      return
    }

    setIsAnimating(true)
    setInfo(`${currentColor.toUpperCase()} rolled ${d} → moving ${pick.id}...`)

    // Helper: update ONLY the moving token progress
    const setTokenProgress = (tokenId: string, progress: number) => {
      const nextTokens = tokensRef.current.map((t) => (t.id === tokenId ? { ...t, progress } : t))
      tokensRef.current = nextTokens
      setTokens(nextTokens)
    }

    const finishMove = () => {
      // Resolve capture on the landing square (after movement completes)
      const landing = resolveLandingCapture(tokensRef.current, pick.id)
      if (landing.capturedIds.length) {
        tokensRef.current = landing.tokens
        setTokens(landing.tokens)
      }

      const capMsg = landing.capturedIds.length
        ? ` | CAPTURE: ${landing.capturedIds.join(', ')}`
        : ''
      setInfo(`${currentColor.toUpperCase()} rolled ${d} → moved ${pick.id}${capMsg}`)

      setIsAnimating(false)

      // aturan umum: roll 6 dapat extra turn
      if (d !== 6) nextTurn()
    }

    // If token keluar dari base, versi rules kita: 6 hanya untuk keluar (jadi to=0).
    // Itu “hop” 1x aja.
    if (from === -1) {
      setTokenProgress(pick.id, to)
      moveTimerRef.current = setTimeout(() => {
        moveTimerRef.current = null
        finishMove()
      }, 150)
      return
    }

    // Move per kotak: hop 1-by-1 sampai target.
    let step = from

    const hop = () => {
      if (step >= to) {
        finishMove()
        return
      }

      step += 1
      setTokenProgress(pick.id, step)

      // small pause to feel like “loncat per kotak”
      moveTimerRef.current = setTimeout(() => {
        moveTimerRef.current = null
        hop()
      }, 170)
    }

    hop()
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Ludo (Skia) — Turn: {currentColor.toUpperCase()}</Text>

      <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
        <Canvas style={{ width: boardSize, height: boardSize }}>
          {/* Board background */}
          <Rect x={0} y={0} width={boardSize} height={boardSize} color="#111827" />

          {/* Corner “home” areas (simple placeholders) */}
          <Group>
            <Rect x={0} y={0} width={cell * 6} height={cell * 6} color="#7c3aed" />
            <Rect x={cell * 9} y={0} width={cell * 6} height={cell * 6} color="#06b6d4" />
            <Rect x={0} y={cell * 9} width={cell * 6} height={cell * 6} color="#22c55e" />
            <Rect x={cell * 9} y={cell * 9} width={cell * 6} height={cell * 6} color="#ef4444" />
          </Group>

          {/* Center */}
          <Rect x={cell * 6} y={cell * 6} width={cell * 3} height={cell * 3} color="#f59e0b" />

          {/* Grid lines */}
          {Array.from({ length: GRID + 1 }).map((_, i) => {
            const p = i * cell
            return (
              <Group key={`g-${i}`}>
                <Line
                  p1={{ x: p, y: 0 }}
                  p2={{ x: p, y: boardSize }}
                  color="#334155"
                  strokeWidth={1}
                />
                <Line
                  p1={{ x: 0, y: p }}
                  p2={{ x: boardSize, y: p }}
                  color="#334155"
                  strokeWidth={1}
                />
              </Group>
            )
          })}

          {/* Track cells */}
          {pathCoordinates.map((pt, i) => {
            const safe = SAFE_GLOBAL_TRACK_INDEX.has(i)
            return (
              <Rect
                key={`track-${i}`}
                x={pt.x * cell}
                y={pt.y * cell}
                width={cell}
                height={cell}
                color={safe ? '#fde68a' : '#0f172a'}
              />
            )
          })}

          {/* Home lanes */}
          {(['red', 'blue', 'yellow', 'green'] as const).map((c) =>
            finishingLanes[c].map((pt, i) => (
              <Rect
                key={`lane-${c}-${i}`}
                x={pt.x * cell}
                y={pt.y * cell}
                width={cell}
                height={cell}
                color={tokenFill[c]}
                opacity={0.35}
              />
            )),
          )}

          {/* Tokens */}
          {tokens.map((t) => {
            const pt = progressToPoint(t)
            const cx = (pt.x + 0.5) * cell
            const cy = (pt.y + 0.5) * cell
            return (
              <Group key={t.id}>
                <Circle cx={cx} cy={cy} r={cell * 0.32} color={tokenFill[t.color]} />
                <Circle
                  cx={cx}
                  cy={cy}
                  r={cell * 0.32}
                  color="#000000"
                  style="stroke"
                  strokeWidth={2}
                />
              </Group>
            )
          })}
        </Canvas>
      </View>

      <View style={styles.controls}>
        <Text style={styles.meta}>Dice: {dice}</Text>
        <Text style={styles.info}>{info}</Text>

        <Pressable
          onPress={roll}
          disabled={isAnimating}
          style={[styles.btn, isAnimating && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>{isAnimating ? 'MOVING…' : 'ROLL 🎲'}</Text>
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        Sekarang token sudah “nyambung” ke rules (base → track 52 → lane 5 → finish). Next upgrade:
        pilih token secara manual (tap token yang valid), animasi langkah 1-per-1, dan aturan
        block/stack.
      </Text>
    </View>
  )
}
export default LudoScreen
// export default function LudoScreen()

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 16,
    backgroundColor: '#0b1220',
  },
  title: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  boardWrap: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  controls: {
    marginTop: 14,
    gap: 8,
  },
  meta: {
    color: '#93c5fd',
    fontWeight: '600',
  },
  info: {
    color: '#cbd5e1',
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  footnote: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
})
