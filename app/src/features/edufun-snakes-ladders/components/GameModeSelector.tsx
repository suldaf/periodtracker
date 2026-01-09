/**
 * Game Mode Selector Component
 * Allows user to choose between playing against bots or with friends
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
  ImageBackground,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { assets } from '../../../resources/assets'
import {
  THEME_COLORS,
  BOARD_CONFIG_42,
  GameMode,
  Difficulty,
  BotConfig,
  createBotConfigs,
} from '../engine'

const { width: screenWidth } = Dimensions.get('window')

export interface GameModeSelection {
  mode: GameMode
  playerCount: number
  botCount: number
  difficulty: Difficulty
  bots: BotConfig[]
}

interface GameModeSelectorProps {
  onModeSelected: (selection: GameModeSelection) => void
}

type SelectorPhase = 'mode' | 'bot_count' | 'difficulty'

const themeColors = THEME_COLORS

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onModeSelected }) => {
  const insets = useSafeAreaInsets()
  const [phase, setPhase] = useState<SelectorPhase>('mode')
  const [selectedMode, setSelectedMode] = useState<GameMode>('multiplayer')
  const [botCount, setBotCount] = useState(1)
  const [difficulty, setDifficulty] = useState<Difficulty>('santai')

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode)
    if (mode === 'solo') {
      // Go to bot count selection
      setPhase('bot_count')
    } else {
      // Go directly to game setup with multiplayer mode
      onModeSelected({
        mode: 'multiplayer',
        playerCount: 2,
        botCount: 0,
        difficulty: 'santai',
        bots: [],
      })
    }
  }

  const handleBotCountSelect = (count: number) => {
    setBotCount(count)
    setPhase('difficulty')
  }

  const handleDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff)
    // Create bots and proceed
    const bots = createBotConfigs(botCount, diff, 1)
    onModeSelected({
      mode: 'solo',
      playerCount: 1 + botCount, // 1 human + bots
      botCount,
      difficulty: diff,
      bots,
    })
  }

  const handleBack = () => {
    if (phase === 'difficulty') {
      setPhase('bot_count')
    } else if (phase === 'bot_count') {
      setPhase('mode')
    }
  }

  const renderModeSelection = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Mau main dengan{'\n'}siapa hari ini?</Text>

        <View style={styles.modeGrid}>
          <Pressable
            style={[styles.modeCard, selectedMode === 'solo' && styles.modeCardSelected]}
            onPress={() => handleModeSelect('solo')}
          >
            <View style={styles.modeIconContainer}>
              <Text style={styles.modeIcon}>🤖</Text>
            </View>
            <Text style={styles.modeLabel}>Komputer</Text>
          </Pressable>

          <Pressable
            style={[styles.modeCard, selectedMode === 'multiplayer' && styles.modeCardSelected]}
            onPress={() => handleModeSelect('multiplayer')}
          >
            <View style={styles.modeIconContainer}>
              <Text style={styles.modeIcon}>👥</Text>
            </View>
            <Text style={styles.modeLabel}>Teman</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )

  const renderBotCountSelection = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Kembali</Text>
        </Pressable>

        <Text style={styles.title}>Mau main sama{'\n'}berapa komputer?</Text>
        <Text style={styles.subtitle}>Pilih jumlah lawan</Text>

        <View style={styles.countGrid}>
          {[1, 2, 3].map((count) => (
            <Pressable
              key={count}
              style={[styles.countCard, botCount === count && styles.countCardSelected]}
              onPress={() => handleBotCountSelect(count)}
            >
              <Text style={styles.countNumber}>{count}</Text>
              <Text style={styles.countLabel}>Bot{count > 1 ? 's' : ''}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  )

  const renderDifficultySelection = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Kembali</Text>
        </Pressable>

        <Text style={styles.title}>Pilih tingkat{'\n'}kesulitan</Text>

        <View style={styles.difficultyGrid}>
          <Pressable
            style={[
              styles.difficultyCard,
              difficulty === 'santai' && styles.difficultyCardSelected,
            ]}
            onPress={() => handleDifficultySelect('santai')}
          >
            <Text style={styles.difficultyEmoji}>😊</Text>
            <Text style={styles.difficultyTitle}>Santai</Text>
            <Text style={styles.difficultyDesc}>
              Bot bermain dengan santai,{'\n'}cocok untuk pemula
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.difficultyCard,
              difficulty === 'tantangan' && styles.difficultyCardSelected,
            ]}
            onPress={() => handleDifficultySelect('tantangan')}
          >
            <Text style={styles.difficultyEmoji}>🔥</Text>
            <Text style={styles.difficultyTitle}>Tantangan</Text>
            <Text style={styles.difficultyDesc}>
              Bot bermain lebih pintar,{'\n'}lebih menantang!
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: 24 + insets.top,
          paddingBottom: 16 + insets.bottom,
        },
      ]}
    >
      <ImageBackground
        source={assets.ular_tangga?.background}
        style={styles.inner}
        imageStyle={{ resizeMode: 'cover', opacity: 0.08 }}
      >
        <Image source={assets.ular_tangga?.logo} style={styles.logoImage} resizeMode="contain" />

        {phase === 'mode' && renderModeSelection()}
        {phase === 'bot_count' && renderBotCountSelection()}
        {phase === 'difficulty' && renderDifficultySelection()}

        {/* Background Footer Image */}
        {assets.ular_tangga?.background_footer && (
          <Image
            source={assets.ular_tangga.background_footer}
            style={styles.backgroundFooter}
            resizeMode="cover"
          />
        )}
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: themeColors.light.bg,
  },
  inner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 100,
    marginBottom: 24,
  },
  backgroundFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 150,
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.light.text,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.light.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    color: themeColors.light.text,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  modeGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 24,
  },
  modeCard: {
    width: screenWidth * 0.35,
    maxWidth: 140,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8ea8c2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#e2ecf5',
  },
  modeCardSelected: {
    borderColor: '#9abf44',
    backgroundColor: 'rgba(154, 191, 68, 0.08)',
  },
  modeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modeIcon: {
    fontSize: 32,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.light.text,
  },
  countGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  countCard: {
    width: 90,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8ea8c2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e2ecf5',
  },
  countCardSelected: {
    borderColor: '#9abf44',
    backgroundColor: 'rgba(154, 191, 68, 0.08)',
  },
  countNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: themeColors.light.text,
  },
  countLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.light.text,
    opacity: 0.7,
    marginTop: 4,
  },
  difficultyGrid: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 24,
    width: '100%',
  },
  difficultyCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#8ea8c2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e2ecf5',
  },
  difficultyCardSelected: {
    borderColor: '#9abf44',
    backgroundColor: 'rgba(154, 191, 68, 0.08)',
  },
  difficultyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  difficultyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.light.text,
    marginBottom: 6,
  },
  difficultyDesc: {
    fontSize: 13,
    color: themeColors.light.text,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 18,
  },
})

export default GameModeSelector
