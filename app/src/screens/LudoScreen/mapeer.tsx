import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native'
import { Canvas, Circle, Group, Image as SkImage, useImage } from '@shopify/react-native-skia'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

type Color = 'red' | 'blue' | 'yellow' | 'green' | 'purple'
type NPt = { x: number; y: number } // normalized 0..1

type Mode =
  | 'track'
  | `lane-${Color}`
  | `base-${Color}`
  | 'safe'
  | 'star'
  | 'q'

const COLORS: Color[] = ['red', 'blue', 'yellow', 'green', 'purple']

const modeColor: Record<string, string> = {
  track: '#60a5fa',
  safe: '#fde68a',
  star: '#f59e0b',
  q: '#22c55e',
  'lane-red': '#ef4444',
  'lane-blue': '#3b82f6',
  'lane-yellow': '#f59e0b',
  'lane-green': '#22c55e',
  'lane-purple': '#a855f7',
  'base-red': '#ef4444',
  'base-blue': '#3b82f6',
  'base-yellow': '#f59e0b',
  'base-green': '#22c55e',
  'base-purple': '#a855f7',
}

function dist2(a: NPt, b: NPt) {
    'worklet'
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function nearestTrackIndex(track: NPt[], p: NPt) {
    'worklet'
  if (track.length === 0) return -1
  let best = 0
  let bestD = dist2(track[0], p)
  for (let i = 1; i < track.length; i++) {
    const d = dist2(track[i], p)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

function isCloseEnough(track: NPt[], idx: number, p: NPt, threshold = 0.03) {
    'worklet'
  if (idx < 0) return false
  const d = Math.sqrt(dist2(track[idx], p))
  return d <= threshold
}

export default function LudoBoardMapper({ size = 360 }: { size?: number }) {
  const img = useImage(require('./ludo-board.png'))

  const [mode, setMode] = useState<Mode>('track')

  const [track, setTrack] = useState<NPt[]>([])
  const [lanes, setLanes] = useState<Record<Color, NPt[]>>({
    red: [],
    blue: [],
    yellow: [],
    green: [],
    purple: [],
  })
  const [bases, setBases] = useState<Record<Color, NPt[]>>({
    red: [],
    blue: [],
    yellow: [],
    green: [],
    purple: [],
  })

  const [safe, setSafe] = useState<number[]>([])
  const [star, setStar] = useState<number[]>([])
  const [q, setQ] = useState<number[]>([])

  const pushPoint = useCallback(
    (nx: number, ny: number) => {
      const p: NPt = { x: nx, y: ny }

      if (mode === 'track') {
        setTrack((v) => [...v, p])
        return
      }

      if (mode.startsWith('lane-')) {
        const c = mode.split('-')[1] as Color
        setLanes((prev) => ({ ...prev, [c]: [...prev[c], p] }))
        return
      }

      if (mode.startsWith('base-')) {
        const c = mode.split('-')[1] as Color
        setBases((prev) => ({ ...prev, [c]: [...prev[c], p] }))
        return
      }

      // safe/star/q => nearest track index
      const idx = nearestTrackIndex(track, p)
      if (!isCloseEnough(track, idx, p)) return

      if (mode === 'safe') setSafe((v) => (v.includes(idx) ? v : [...v, idx]))
      if (mode === 'star') setStar((v) => (v.includes(idx) ? v : [...v, idx]))
      if (mode === 'q') setQ((v) => (v.includes(idx) ? v : [...v, idx]))
    },
    [mode, track],
  )

  const tapGesture = useMemo(() => {
    // onEnd di UI thread => wajib runOnJS
    return Gesture.Tap().onEnd((e) => {
      const nx = e.x / size
      const ny = e.y / size
      runOnJS(pushPoint)(nx, ny)
    })
  }, [pushPoint, size])

  const undo = () => {
    if (mode === 'track') return setTrack((v) => v.slice(0, -1))
    if (mode.startsWith('lane-')) {
      const c = mode.split('-')[1] as Color
      return setLanes((prev) => ({ ...prev, [c]: prev[c].slice(0, -1) }))
    }
    if (mode.startsWith('base-')) {
      const c = mode.split('-')[1] as Color
      return setBases((prev) => ({ ...prev, [c]: prev[c].slice(0, -1) }))
    }
    if (mode === 'safe') return setSafe((v) => v.slice(0, -1))
    if (mode === 'star') return setStar((v) => v.slice(0, -1))
    if (mode === 'q') return setQ((v) => v.slice(0, -1))
  }

  const exportJSON = () => {
    const json = { track, lanes, bases, safe, special: { star, q } }
    console.log('LUDO_BOARD_MAP =', JSON.stringify(json, null, 2))
  }

  const px = (p: NPt) => ({ x: p.x * size, y: p.y * size })
  const overlayR = size * 0.012

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ludo Board Mapper</Text>
      <Text style={styles.sub}>
        mode={mode} | track={track.length} | safe={safe.length} | star={star.length} | q={q.length}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={styles.row}>
          {(['track', 'safe', 'star', 'q'] as Mode[]).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.btn, mode === m && styles.btnOn]}>
              <Text style={styles.btnText}>{m}</Text>
            </Pressable>
          ))}
          {COLORS.map((c) => (
            <Pressable
              key={`lane-${c}`}
              onPress={() => setMode(`lane-${c}`)}
              style={[styles.btn, mode === `lane-${c}` && styles.btnOn]}
            >
              <Text style={styles.btnText}>{`lane-${c}`}</Text>
            </Pressable>
          ))}
          {COLORS.map((c) => (
            <Pressable
              key={`base-${c}`}
              onPress={() => setMode(`base-${c}`)}
              style={[styles.btn, mode === `base-${c}` && styles.btnOn]}
            >
              <Text style={styles.btnText}>{`base-${c}`}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.row}>
        <Pressable onPress={undo} style={styles.btn}>
          <Text style={styles.btnText}>UNDO</Text>
        </Pressable>
        <Pressable onPress={exportJSON} style={styles.btn}>
          <Text style={styles.btnText}>EXPORT JSON</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={tapGesture}>
        <View style={[styles.boardWrap, { width: size, height: size }]}>
          <Canvas style={{ width: size, height: size }}>
            {img && <SkImage image={img} x={0} y={0} width={size} height={size} fit="contain" />}

            {/* track points */}
            {track.map((p, i) => {
              const pp = px(p)
              return <Circle key={`t-${i}`} cx={pp.x} cy={pp.y} r={overlayR} color={modeColor.track} />
            })}

            {/* lanes */}
            {COLORS.map((c) =>
              lanes[c].map((p, i) => {
                const pp = px(p)
                return (
                  <Circle key={`lane-${c}-${i}`} cx={pp.x} cy={pp.y} r={overlayR} color={modeColor[`lane-${c}`]} />
                )
              }),
            )}

            {/* bases */}
            {COLORS.map((c) =>
              bases[c].map((p, i) => {
                const pp = px(p)
                return (
                  <Circle key={`base-${c}-${i}`} cx={pp.x} cy={pp.y} r={overlayR} color={modeColor[`base-${c}`]} />
                )
              }),
            )}

            {/* markers on track */}
            {safe.map((idx) => {
              const p = track[idx]
              if (!p) return null
              const pp = px(p)
              return <Circle key={`safe-${idx}`} cx={pp.x} cy={pp.y} r={overlayR * 1.6} color={modeColor.safe} />
            })}
            {star.map((idx) => {
              const p = track[idx]
              if (!p) return null
              const pp = px(p)
              return <Circle key={`star-${idx}`} cx={pp.x} cy={pp.y} r={overlayR * 1.6} color={modeColor.star} />
            })}
            {q.map((idx) => {
              const p = track[idx]
              if (!p) return null
              const pp = px(p)
              return <Circle key={`q-${idx}`} cx={pp.x} cy={pp.y} r={overlayR * 1.6} color={modeColor.q} />
            })}
          </Canvas>
        </View>
      </GestureDetector>

      <Text style={styles.help}>
        Tips: tap TRACK dulu searah jarum jam. Setelah track lengkap, baru tandain SAFE/STAR/Q (biar bisa “nearest index”).
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220', padding: 12 },
  title: { color: '#e5e7eb', fontWeight: '900', fontSize: 18, marginBottom: 6 },
  sub: { color: '#94a3b8', marginBottom: 10 },
  boardWrap: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnOn: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  btnText: { color: '#e5e7eb', fontWeight: '900', fontSize: 12 },
  help: { marginTop: 10, color: '#94a3b8', fontSize: 12, lineHeight: 16 },
})