import * as React from 'react'
import { Image, StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native'
import { SafeScreen } from '../../components/Screen'
import { Button } from '../../components/Button'
import { avatarNames, themeNames, AvatarName } from '../../resources/translations'
import { getAsset } from '../../services/asset'
import { CheckButton } from '../../components/CheckButton'
import { useSelector } from '../../redux/useSelector'
import { currentAvatarSelector, currentThemeSelector } from '../../redux/selectors'
import { useDispatch } from 'react-redux'
import { setAvatar, setTheme } from '../../redux/actions'
import { globalStyles } from '../../config/theme'
import { Text } from '../../components/Text'
import { analytics } from '../../services/firebase'
import { PaletteStatus, useColor } from '../../hooks/useColor'
import { useNavigation } from '@react-navigation/native'

const AvatarAndThemeScreen = () => {
  return <AvatarAndThemeSelect />
}

export default AvatarAndThemeScreen

interface AvatarAndThemeSelectProps {
  onConfirm?: () => void
}

export const AvatarAndThemeSelect = ({ onConfirm }: AvatarAndThemeSelectProps) => {
  const currentAvatar = useSelector(currentAvatarSelector)
  const currentTheme = useSelector(currentThemeSelector)
  const dispatch = useDispatch()
  const { backgroundColor, palette } = useColor()
  const navigation = useNavigation<any>()

  const [selectedAvatar, setSelectedAvatar] = React.useState(currentAvatar)
  const [selectedTheme, setSelectedTheme] = React.useState(currentTheme)

  // Sync local selection with Redux state (needed when returning from CustomAvatarScreen)
  React.useEffect(() => {
    setSelectedAvatar(currentAvatar)
  }, [currentAvatar])

  const confirm = () => {
    dispatch(setAvatar(selectedAvatar))
    dispatch(setTheme(selectedTheme))

    if (selectedAvatar !== currentAvatar) {
      analytics?.().logEvent('avatarChanged', {
        selectedAvatar,
      })
    }
    if (selectedTheme !== currentTheme) {
      analytics?.().logEvent('themeChanged', {
        selectedTheme,
      })
    }

    onConfirm?.()
  }

  const avatarChanged = currentAvatar !== selectedAvatar
  const themeChanged = currentTheme !== selectedTheme
  const hasChanged = avatarChanged || themeChanged

  const isInitialSelection = !!onConfirm
  const confirmStatus = hasChanged || isInitialSelection ? 'primary' : 'basic'

  // All avatars including custom
  const allAvatars: AvatarName[] = [...avatarNames, 'custom']

  // Get the image source for an avatar (handles custom avatar specially)
  const getAvatarImage = (avatar: AvatarName) => {
    if (avatar === 'custom') {
      // Always show the default custom avatar icon (pink silhouette) in selection screen
      return getAsset('avatars.custom.theme')
    }
    return getAsset(`avatars.${avatar}.theme`)
  }

  const renderAvatar = (avatar: AvatarName) => {
    const { showCheck, checkStatus } = getCheckStatus({
      isSelected: avatar === selectedAvatar,
      isCurrent: avatar === currentAvatar,
      changed: avatarChanged,
      isInitialSelection,
    })

    const onPress = () => {
      if (avatar === 'custom') {
        setSelectedAvatar('custom')
        navigation.navigate('CustomAvatar')
      } else {
        setSelectedAvatar(avatar)
      }
    }

    return (
      <TouchableOpacity key={avatar} onPress={onPress} style={[styles.avatar, globalStyles.shadow]}>
        <View
          style={[
            styles.avatarBody,
            { backgroundColor, borderColor: backgroundColor },
            globalStyles.elevation,
          ]}
        >
          <Image source={getAvatarImage(avatar)} style={styles.avatarImage} />
          <Text style={[styles.name, { color: palette.secondary.text }]}>{avatar}</Text>
          {showCheck && <CheckButton style={styles.check} status={checkStatus} />}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeScreen style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isInitialSelection && (
          <Text style={[styles.title, { color: palette.secondary.text }]}>
            avatar_amp_themes_login
          </Text>
        )}
        <View style={styles.avatarsContainer}>
          {allAvatars.map(renderAvatar)}
        </View>

        <View style={styles.themes}>
          {themeNames.map((theme) => {
            const { showCheck, checkStatus } = getCheckStatus({
              isSelected: theme === selectedTheme,
              isCurrent: theme === currentTheme,
              changed: themeChanged,
              isInitialSelection,
            })

            const onPress = () => {
              setSelectedTheme(theme)
            }

            return (
              <TouchableOpacity
                key={theme}
                onPress={onPress}
                style={[styles.theme, globalStyles.shadow]}
              >
                <View style={[styles.themeBody, globalStyles.elevation]}>
                  <Image
                    source={getAsset(`backgrounds.${theme}.icon`)}
                    style={[styles.themeImage, { backgroundColor, borderColor: backgroundColor }]}
                  />
                  <Text style={[styles.name, { color: palette.secondary.text }]}>{theme}</Text>
                  {showCheck && <CheckButton style={styles.check} status={checkStatus} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.buttonSpacer}>
          <Button onPress={confirm} status={confirmStatus} style={styles.confirmButton}>
            confirm
          </Button>
        </View>
      </ScrollView>
    </SafeScreen>
  )
}

const getCheckStatus = ({
  isSelected,
  isCurrent,
  changed,
  isInitialSelection,
}: {
  isSelected: boolean
  isCurrent: boolean
  changed: boolean
  isInitialSelection: boolean
}): {
  showCheck: boolean
  checkStatus: PaletteStatus
} => {
  // When making selection for the first time, indicate selection with primary (green) status
  if (isInitialSelection) {
    return {
      showCheck: isSelected,
      checkStatus: 'primary',
    }
  }

  // When editing, show current as basic and selected as secondary, to indicate unsaved changes
  return {
    showCheck: isSelected || (isCurrent && !isSelected),
    checkStatus: isSelected ? (changed ? 'secondary' : 'primary') : 'basic',
  }
}

const styles = StyleSheet.create({
  screen: {
    maxWidth: 800,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
  },
  scrollView: {
    width: '100%',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: '23%',
    aspectRatio: 1,
    marginBottom: 8,
  },
  themes: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    flexWrap: 'wrap',
  },
  buttonSpacer: {
    marginTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  confirmButton: {
    marginTop: 0,
  },
  theme: {
    minWidth: 100,
    maxWidth: 180,
    height: 100,
    flexBasis: '40%',
    margin: 8,
  },
  avatarBody: {
    borderWidth: 4,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  themeBody: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  check: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  themeImage: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    resizeMode: 'cover',
    borderWidth: 4,
    borderRadius: 20,
  },
  name: {
    position: 'absolute',
    top: 2,
    left: 0,
    width: '100%',
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
