import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'
import { Canvas, Circle, Line, Rect, Group } from '@shopify/react-native-skia'
import { ScreenComponent } from '../../navigation/RootNavigator'

type Pt = { x: number; y: number }

type Color = 'red' | 'blue' | 'yellow' | 'green' | 'purple'
type PlayerCount = 4 | 5

type Token = {
  id: string
  color: Color
  slot: 0 | 1 | 2 | 3
  progress: number // -1..goal
}

const LANE_LEN = 5

// --- Player mode config ---
const TURN_ORDER_4: Color[] = ['red', 'blue', 'yellow', 'green']
const TURN_ORDER_5: Color[] = ['red', 'blue', 'yellow', 'green', 'purple']

// 4P spacing: 52/4 = 13
const START_OFFSET_4: Record<Color, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
  purple: 0, // unused in 4P
}

// 5P pentagon spacing: 55/5 = 11
const START_OFFSET_5: Record<Color, number> = {
  red: 0,
  blue: 11,
  yellow: 22,
  green: 33,
  purple: 44,
}

// Safe squares: 4P uses classic 0/13/26/39. 5P uses each start square (pentagon variant).
const SAFE_4 = new Set([0, 13, 26, 39])
const SAFE_5 = new Set([0, 11, 22, 33, 44])

const tokenFill: Record<Color, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#f59e0b',
  green: '#22c55e',
  purple: '#a855f7',
}

function computeLaneStart(trackLen: number) {
  return trackLen
}
function computeLaneEnd(trackLen: number) {
  return trackLen + (LANE_LEN - 1)
}
function computeGoal(trackLen: number) {
  return trackLen + LANE_LEN
}

function computeNextProgress(curr: number, dice: number, goal: number): number | null {
  // token di base: cuma bisa keluar kalau 6
  if (curr === -1) return dice === 6 ? 0 : null

  const next = curr + dice
  // exact roll ke finish
  if (next > goal) return null

  return next
}

function isOnTrack(progress: number, trackLen: number) {
  return progress >= 0 && progress <= trackLen - 1
}

function isOnLane(progress: number, laneStart: number, laneEnd: number) {
  return progress >= laneStart && progress <= laneEnd
}

function isFinished(progress: number, goal: number) {
  return progress === goal
}

function toGlobalTrackIndex(
  color: Color,
  progress: number,
  startOffset: Record<Color, number>,
  trackLen: number,
): number | null {
  if (!isOnTrack(progress, trackLen)) return null
  return (startOffset[color] + progress) % trackLen
}

function isSafeSquare(
  color: Color,
  progress: number,
  startOffset: Record<Color, number>,
  trackLen: number,
  safeSet: Set<number>,
): boolean {
  const gi = toGlobalTrackIndex(color, progress, startOffset, trackLen)
  return gi != null && safeSet.has(gi)
}

function resolveLandingCapture(
  tokens: Token[],
  movedTokenId: string,
  startOffset: Record<Color, number>,
  trackLen: number,
  safeSet: Set<number>,
): { tokens: Token[]; capturedIds: string[] } {
  const moved = tokens.find((t) => t.id === movedTokenId)
  if (!moved) return { tokens, capturedIds: [] }

  if (
    !isOnTrack(moved.progress, trackLen) ||
    isSafeSquare(moved.color, moved.progress, startOffset, trackLen, safeSet)
  ) {
    return { tokens, capturedIds: [] }
  }

  const movedGI = toGlobalTrackIndex(moved.color, moved.progress, startOffset, trackLen)
  if (movedGI == null) return { tokens, capturedIds: [] }

  const capturedIds: string[] = []
  for (const other of tokens) {
    if (other.id === moved.id) continue
    if (other.color === moved.color) continue

    const otherGI = toGlobalTrackIndex(other.color, other.progress, startOffset, trackLen)
    if (otherGI == null) continue

    if (otherGI === movedGI) capturedIds.push(other.id)
  }

  if (capturedIds.length === 0) return { tokens, capturedIds: [] }

  const nextTokens = tokens.map((t) => (capturedIds.includes(t.id) ? { ...t, progress: -1 } : t))
  return { tokens: nextTokens, capturedIds }
}

// --------------------
// Layouts
// --------------------

type Layout = {
  kind: 'grid' | 'pentagon'
  trackLen: number
  path: Pt[] // pixel centers
  lanes: Record<Color, Pt[]> // pixel centers
  base: Record<Color, Pt[]> // pixel centers
  home: Pt // pixel center
  verts?: Pt[] // pentagon vertices (pixel)
}

// 4P: reuse your existing 15x15 grid track, but convert to pixel centers.
const GRID = 15

const pathGrid: Pt[] = [
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

const lanesGrid: Record<Color, Pt[]> = {
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
  // unused in 4P layout
  purple: [
    { x: 13, y: 7 },
    { x: 12, y: 7 },
    { x: 11, y: 7 },
    { x: 10, y: 7 },
    { x: 9, y: 7 },
  ],
}

const baseGrid: Record<Color, Pt[]> = {
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
  // unused in 4P layout
  purple: [
    { x: 11, y: 1 },
    { x: 13, y: 1 },
    { x: 11, y: 3 },
    { x: 13, y: 3 },
  ],
}

function gridCenter(pt: Pt, cell: number): Pt {
  return { x: (pt.x + 0.5) * cell, y: (pt.y + 0.5) * cell }
}

function buildGridLayout(cell: number): Layout {
  const trackLen = 52
  return {
    kind: 'grid',
    trackLen,
    path: pathGrid.map((p) => gridCenter(p, cell)),
    lanes: {
      red: lanesGrid.red.map((p) => gridCenter(p, cell)),
      blue: lanesGrid.blue.map((p) => gridCenter(p, cell)),
      yellow: lanesGrid.yellow.map((p) => gridCenter(p, cell)),
      green: lanesGrid.green.map((p) => gridCenter(p, cell)),
      purple: lanesGrid.purple.map((p) => gridCenter(p, cell)),
    },
    base: {
      red: baseGrid.red.map((p) => gridCenter(p, cell)),
      blue: baseGrid.blue.map((p) => gridCenter(p, cell)),
      yellow: baseGrid.yellow.map((p) => gridCenter(p, cell)),
      green: baseGrid.green.map((p) => gridCenter(p, cell)),
      purple: baseGrid.purple.map((p) => gridCenter(p, cell)),
    },
    home: gridCenter({ x: 7, y: 7 }, cell),
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function normalize(v: Pt): Pt {
  const len = Math.hypot(v.x, v.y) || 1
  return { x: v.x / len, y: v.y / len }
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y }
}

function mul(a: Pt, s: number): Pt {
  return { x: a.x * s, y: a.y * s }
}

function buildPentagonLayout(boardSize: number): Layout {
  const cx = boardSize / 2
  const cy = boardSize / 2

  const N = 5
  const stepsPerSide = 11 // 5 * 11 = 55 track cells
  const trackLen = N * stepsPerSide

  const R = boardSize * 0.42
  const startAngle = -Math.PI / 2

  const verts: Pt[] = Array.from({ length: N }, (_, i) => {
    const ang = startAngle + (i * 2 * Math.PI) / N
    return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) }
  })

  // Track points along edges (polyline), 55 points
  const path: Pt[] = []
  for (let i = 0; i < N; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % N]

    for (let s = 0; s < stepsPerSide; s++) {
      const t = s / stepsPerSide // 0..(10/11)
      path.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
    }
  }

  // Lanes: 5 points towards center for each color
  const lanes: Record<Color, Pt[]> = { red: [], blue: [], yellow: [], green: [], purple: [] }

  TURN_ORDER_5.forEach((color, idx) => {
    const ang = startAngle + (idx * 2 * Math.PI) / N
    const r0 = boardSize * 0.26
    const r1 = boardSize * 0.1

    const lane: Pt[] = []
    for (let i = 0; i < LANE_LEN; i++) {
      const t = (i + 1) / (LANE_LEN + 1)
      const r = lerp(r0, r1, t)
      lane.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) })
    }

    lanes[color] = lane
  })

  // Bases: 4 token spots near each vertex, slightly pushed inward
  const base: Record<Color, Pt[]> = { red: [], blue: [], yellow: [], green: [], purple: [] }

  TURN_ORDER_5.forEach((color, idx) => {
    const v = verts[idx]
    const inward = normalize({ x: cx - v.x, y: cy - v.y })
    const tangent = normalize({ x: -inward.y, y: inward.x })

    const baseCenter = add(v, mul(inward, boardSize * 0.14))
    const s = boardSize * 0.03

    base[color] = [
      add(baseCenter, add(mul(tangent, -s), mul(inward, -s))),
      add(baseCenter, add(mul(tangent, +s), mul(inward, -s))),
      add(baseCenter, add(mul(tangent, -s), mul(inward, +s))),
      add(baseCenter, add(mul(tangent, +s), mul(inward, +s))),
    ]
  })

  return {
    kind: 'pentagon',
    trackLen,
    path,
    lanes,
    base,
    home: { x: cx, y: cy },
    verts,
  }
}

function progressToPoint(token: Token, layout: Layout, startOffset: Record<Color, number>): Pt {
  const { color, progress, slot } = token
  const trackLen = layout.trackLen
  const laneStart = computeLaneStart(trackLen)
  const laneEnd = computeLaneEnd(trackLen)
  const goal = computeGoal(trackLen)

  if (progress === -1) return layout.base[color][slot]

  if (isOnTrack(progress, trackLen)) {
    const gi = toGlobalTrackIndex(color, progress, startOffset, trackLen)
    return layout.path[gi ?? 0]
  }

  if (isOnLane(progress, laneStart, laneEnd)) {
    return layout.lanes[color][progress - laneStart]
  }

  if (isFinished(progress, goal)) return layout.home

  return layout.base[color][slot]
}

const LudoScreen: ScreenComponent<'Ludo'> = () => {
  const { width: w, height: h } = Dimensions.get('window')
  const boardSize = Math.max(260, Math.min(520, Math.min(w, h) - 32))
  const cell = boardSize / GRID

  const [playerCount, setPlayerCount] = useState<PlayerCount>(5)

  const turnOrder = useMemo<Color[]>(() => (playerCount === 5 ? TURN_ORDER_5 : TURN_ORDER_4), [
    playerCount,
  ])
  const startOffset = useMemo(() => (playerCount === 5 ? START_OFFSET_5 : START_OFFSET_4), [
    playerCount,
  ])
  const safeSet = useMemo(() => (playerCount === 5 ? SAFE_5 : SAFE_4), [playerCount])

  const layout = useMemo<Layout>(() => {
    return playerCount === 5 ? buildPentagonLayout(boardSize) : buildGridLayout(cell)
  }, [playerCount, boardSize, cell])

  const trackLen = layout.trackLen
  const laneStart = computeLaneStart(trackLen)
  const laneEnd = computeLaneEnd(trackLen)
  const goal = computeGoal(trackLen)

  const [turnIdx, setTurnIdx] = useState(0)
  const currentColor = turnOrder[turnIdx]

  const [dice, setDice] = useState<number>(1)
  const [info, setInfo] = useState<string>('Tap ROLL 🎲 — token keluar hanya kalau dapat 6')

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

  const makeTokens = (colors: Color[]): Token[] => {
    const mk = (color: Color): Token[] =>
      ([0, 1, 2, 3] as const).map((slot) => ({
        id: `${color}-${slot}`,
        color,
        slot,
        progress: -1,
      }))

    return colors.flatMap((c) => mk(c))
  }

  const [tokens, setTokens] = useState<Token[]>(() => makeTokens(turnOrder))

  useEffect(() => {
    setTurnIdx(0)
    setDice(1)
    setIsAnimating(false)
    setInfo(
      playerCount === 5
        ? 'Mode 5P (Pentagon) aktif. Tap ROLL 🎲 untuk mulai.'
        : 'Mode 4P (Grid) aktif. Tap ROLL 🎲 untuk mulai.',
    )
    setTokens(makeTokens(turnOrder))
  }, [playerCount])

  useEffect(() => {
    tokensRef.current = tokens
  }, [tokens])

  const nextTurn = () => setTurnIdx((i) => (i + 1) % turnOrder.length)

  const tokenR = playerCount === 5 ? boardSize * 0.022 : cell * 0.32
  const markerR = playerCount === 5 ? boardSize * 0.012 : cell * 0.5

  const roll = () => {
    if (isAnimating) return

    const d = Math.floor(Math.random() * 6) + 1
    setDice(d)

    const myTokens = tokensRef.current.filter((t) => t.color === currentColor)
    const movable = myTokens.filter((t) => computeNextProgress(t.progress, d, goal) != null)

    if (movable.length === 0) {
      setInfo(`${currentColor.toUpperCase()} rolled ${d} → nggak ada langkah. Giliran lanjut.`)
      nextTurn()
      return
    }

    const pick = movable[0]
    const from = pick.progress
    const to = computeNextProgress(from, d, goal)

    if (to == null) {
      setInfo(`${currentColor.toUpperCase()} rolled ${d} → nggak ada langkah. Giliran lanjut.`)
      nextTurn()
      return
    }

    setIsAnimating(true)
    setInfo(`${currentColor.toUpperCase()} rolled ${d} → moving ${pick.id}...`)

    const setTokenProgress = (tokenId: string, progress: number) => {
      const nextTokens = tokensRef.current.map((t) => (t.id === tokenId ? { ...t, progress } : t))
      tokensRef.current = nextTokens
      setTokens(nextTokens)
    }

    const finishMove = () => {
      const landing = resolveLandingCapture(
        tokensRef.current,
        pick.id,
        startOffset,
        trackLen,
        safeSet,
      )
      if (landing.capturedIds.length) {
        tokensRef.current = landing.tokens
        setTokens(landing.tokens)
      }

      const capMsg = landing.capturedIds.length
        ? ` | CAPTURE: ${landing.capturedIds.join(', ')}`
        : ''
      setInfo(`${currentColor.toUpperCase()} rolled ${d} → moved ${pick.id}${capMsg}`)

      setIsAnimating(false)
      if (d !== 6) nextTurn()
    }

    if (from === -1) {
      setTokenProgress(pick.id, to)
      moveTimerRef.current = setTimeout(() => {
        moveTimerRef.current = null
        finishMove()
      }, 150)
      return
    }

    let step = from
    const hop = () => {
      if (step >= to) {
        finishMove()
        return
      }

      step += 1
      setTokenProgress(pick.id, step)

      moveTimerRef.current = setTimeout(() => {
        moveTimerRef.current = null
        hop()
      }, 170)
    }

    hop()
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>
        Ludo (Skia) — {playerCount}P — Turn: {currentColor.toUpperCase()}
      </Text>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setPlayerCount(4)}
          disabled={isAnimating}
          style={[styles.modeBtn, playerCount === 4 && styles.modeBtnActive]}
        >
          <Text style={styles.modeBtnText}>4P</Text>
        </Pressable>
        <Pressable
          onPress={() => setPlayerCount(5)}
          disabled={isAnimating}
          style={[styles.modeBtn, playerCount === 5 && styles.modeBtnActive]}
        >
          <Text style={styles.modeBtnText}>5P (Pentagon)</Text>
        </Pressable>
      </View>

      <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
        <Canvas style={{ width: boardSize, height: boardSize }}>
          <Rect x={0} y={0} width={boardSize} height={boardSize} color="#111827" />

          {layout.kind === 'grid' ? (
            <>
              <Group>
                <Rect x={0} y={0} width={cell * 6} height={cell * 6} color="#7c3aed" />
                <Rect x={cell * 9} y={0} width={cell * 6} height={cell * 6} color="#06b6d4" />
                <Rect x={0} y={cell * 9} width={cell * 6} height={cell * 6} color="#22c55e" />
                <Rect
                  x={cell * 9}
                  y={cell * 9}
                  width={cell * 6}
                  height={cell * 6}
                  color="#ef4444"
                />
              </Group>

              <Rect x={cell * 6} y={cell * 6} width={cell * 3} height={cell * 3} color="#f59e0b" />

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

              {pathGrid.map((pt, i) => {
                const safe = safeSet.has(i)
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

              {turnOrder.map((c) =>
                lanesGrid[c].map((pt, i) => (
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
            </>
          ) : (
            <>
              {layout.verts?.map((v, i) => {
                const v2 = layout.verts?.[(i + 1) % (layout.verts?.length ?? 5)]
                if (!v2) return null
                return <Line key={`edge-${i}`} p1={v} p2={v2} color="#334155" strokeWidth={2} />
              })}

              <Circle cx={layout.home.x} cy={layout.home.y} r={boardSize * 0.06} color="#0f172a" />
              <Circle
                cx={layout.home.x}
                cy={layout.home.y}
                r={boardSize * 0.06}
                color="#334155"
                style="stroke"
                strokeWidth={2}
              />

              {layout.path.map((p, i) => {
                const safe = safeSet.has(i)
                return (
                  <Group key={`p-track-${i}`}>
                    <Circle cx={p.x} cy={p.y} r={markerR} color={safe ? '#fde68a' : '#0f172a'} />
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={markerR}
                      color="#334155"
                      style="stroke"
                      strokeWidth={1}
                    />
                  </Group>
                )
              })}

              {turnOrder.map((c) =>
                layout.lanes[c].map((p, i) => (
                  <Group key={`p-lane-${c}-${i}`}>
                    <Circle cx={p.x} cy={p.y} r={markerR} color={tokenFill[c]} opacity={0.35} />
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={markerR}
                      color="#334155"
                      style="stroke"
                      strokeWidth={1}
                    />
                  </Group>
                )),
              )}
            </>
          )}

          {tokens.map((t) => {
            const pt = progressToPoint(t, layout, startOffset)
            return (
              <Group key={t.id}>
                <Circle cx={pt.x} cy={pt.y} r={tokenR} color={tokenFill[t.color]} />
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={tokenR}
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
        5P di sini pakai layout pentagon (trackLen=55, startOffset kelipatan 11) biar simetris.
        Kalau kamu punya gambar papan 5P, kita bisa geser vertices/spacing biar 100% match.
      </Text>

      <Text style={styles.debug}>
        trackLen={trackLen} laneStart={laneStart} laneEnd={laneEnd} goal={goal}
      </Text>
    </View>
  )
}

export default LudoScreen

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
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  modeBtnActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  modeBtnText: {
    color: '#e5e7eb',
    fontWeight: '800',
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
  debug: {
    marginTop: 6,
    color: '#475569',
    fontSize: 11,
  },
})
