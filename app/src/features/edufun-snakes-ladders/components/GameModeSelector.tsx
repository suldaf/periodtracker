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
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { gameAssets } from '../../../screens/UlarTangga/optional/assets'
import { useSelector } from 'react-redux'
import { currentThemeSelector } from '../../../redux/selectors'
import { assets } from '../../../resources/assets'
import {
  THEME_COLORS,
  THEME_COLORS,
  BOARD_CONFIG_42,
  GameMode,
  Difficulty,
  BotConfig,
  createBotConfigs,
} from '../engine'

import FooterSvg from '../../../screens/UlarTangga/optional/assets/images/bottom_page_ular_tangga.svg'
import LogoSvg from '../../../screens/UlarTangga/optional/assets/images/EduFun_ular_tangga.svg'

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
  onBack?: () => void
}

type SelectorPhase = 'mode' | 'bot_count' | 'difficulty'

const themeColors = THEME_COLORS

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onModeSelected, onBack }) => {
  const insets = useSafeAreaInsets()
  const [phase, setPhase] = useState<SelectorPhase>('mode')
  const [selectedMode, setSelectedMode] = useState<GameMode>('multiplayer')
  const [botCount, setBotCount] = useState(1)
  const [difficulty, setDifficulty] = useState<Difficulty>('santai')
  const currentTheme = useSelector(currentThemeSelector) || 'desert'

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
    <View style={styles.phaseContainerNoCard}>
      <Text style={styles.title}>Mau main dengan{'\n'}siapa hari ini?</Text>

      <View style={styles.modeGridLarge}>
        <Pressable
          style={({ pressed }) => [
            styles.modeCardLarge,
            selectedMode === 'solo' && styles.modeCardSelected,
            pressed && styles.modeCardPressed,
          ]}
          onPress={() => handleModeSelect('solo')}
        >
          <View style={styles.modeIconContainer}>
            <Image
              source={gameAssets.komputer}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.modeLabel}>Komputer</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.modeCardLarge,
            selectedMode === 'multiplayer' && styles.modeCardSelected,
            pressed && styles.modeCardPressed,
          ]}
          onPress={() => handleModeSelect('multiplayer')}
        >
          <View style={styles.modeIconContainer}>
            <Image
              source={gameAssets.friendIcon}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.modeLabel}>Teman</Text>
        </Pressable>
      </View>
    </View>
  )

  const renderBotCountSelection = () => (
    <View style={styles.phaseContainerNoCard}>
      <Text style={styles.title}>Pilih Jumlah Pemain</Text>

      <Pressable style={styles.backButtonTop} onPress={handleBack}>
        <View style={styles.backButtonCircle}>
          <View style={styles.backButtonShadow} />
          <View style={styles.backButtonHighlight} />
          <View style={styles.backButtonBody}>
            <FontAwesome size={12} name="arrow-left" color="#fff" />
          </View>
        </View>
      </Pressable>

      <View style={styles.countGrid}>
        {[1, 2, 3].map((count) => (
          <Pressable
            key={count}
            style={({ pressed }) => [
              styles.countCard,
              botCount === count && styles.countCardSelected,
              pressed && styles.countCardPressed,
            ]}
            onPress={() => handleBotCountSelect(count)}
          >
            <Image
              source={count === 1 ? gameAssets.bot1 : count === 2 ? gameAssets.bot2 : gameAssets.bot4}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
            <Text style={styles.modeLabel}>Bot{count > 1 ? 's' : ''}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )

  const renderDifficultySelection = () => (
    <View style={styles.phaseContainer}>
      <Text style={styles.title}>Pilih tingkat{'\n'}kesulitan</Text>

      <Pressable style={styles.backButtonTop} onPress={handleBack}>
        <View style={styles.backButtonCircle}>
          <View style={styles.backButtonShadow} />
          <View style={styles.backButtonHighlight} />
          <View style={styles.backButtonBody}>
            <FontAwesome size={12} name="arrow-left" color="#fff" />
          </View>
        </View>
      </Pressable>

      <View style={styles.difficultyGrid}>
        <Pressable
          style={({ pressed }) => [
            styles.difficultyCard,
            difficulty === 'santai' && styles.difficultyCardSelected,
            pressed && styles.difficultyCardPressed,
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
          style={({ pressed }) => [
            styles.difficultyCard,
            difficulty === 'tantangan' && styles.difficultyCardSelected,
            pressed && styles.difficultyCardPressed,
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
  )

  return (
    <View style={styles.screen}>
      <View
        style={{
          flex: 1,
          width: '100%',
          backgroundColor: '#FFFFFF',
        }}
      >
        <ImageBackground
          source={assets.backgrounds[currentTheme]?.default ?? gameAssets?.background}
          style={styles.inner}
          imageStyle={{ resizeMode: 'cover', opacity: 1 }}
        >
          {/* Content Container - Handles Safe Area Padding */}
          <View style={{ flex: 1, width: '100%', paddingTop: 24 + insets.top }}>
            {/* --- FOOTER REMOVED --- */}
            {/* <View style={styles.footerContainer} pointerEvents="none">
            <FooterSvg width="100%" height={120} preserveAspectRatio="none" />
          </View> */}

            <View style={styles.contentWrapper}>
              {/* --- LOGO --- */}
              <LogoSvg
                width={400}
                height={150}
                style={styles.logoImage}
                preserveAspectRatio="xMidYMid meet"
              />

              {phase === 'mode' && renderModeSelection()}
              {phase === 'bot_count' && renderBotCountSelection()}
              {phase === 'difficulty' && renderDifficultySelection()}
            </View>

          </View>
        </ImageBackground>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: themeColors.light.bg,
  },
  inner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  logoImage: {
    width: 280,
    height: 105,
    marginBottom: 8,
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
  },
  backButtonTop: {
    position: 'absolute',
    top: 22,
    left: 22,
    zIndex: 20,
  },
  backButtonCircle: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonHighlight: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#b8d575', // Lighter green for highlight
  },
  backButtonShadow: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7a9f33', // Darker green for shadow
  },
  backButtonBody: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#9abf44', // Main green color
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 16,
    marginTop: 24,
  },
  modeCard: {
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
  modeCardLarge: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
  modeGridLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  phaseContainerNoCard: {
    width: '100%',
    maxWidth: 440,
    padding: 22,
    marginTop: 12,
    alignItems: 'center',
  },
  modeCardSelected: {
    borderColor: '#9abf44',
  },
  modeCardPressed: {
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    opacity: 0.9,
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
  },
  countCardPressed: {
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    opacity: 0.9,
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
  },
  difficultyCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    opacity: 0.9,
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
    textAlign: 'center',
    lineHeight: 18,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 120,
    zIndex: 0,
  },
  phaseContainer: {
    width: '100%',
    maxWidth: 440,
    padding: 22,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: '#8ea8c2',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2ecf5',
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
})

export default GameModeSelector
