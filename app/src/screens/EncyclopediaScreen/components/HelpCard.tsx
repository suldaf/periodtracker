import React from 'react'
import { Image, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native'
import { Text } from '../../../components/Text'
import { getAsset } from '../../../services/asset'
import { useSelector } from 'react-redux'
import { currentAvatarSelector, currentLocaleSelector, customAvatarConfigSelector } from '../../../redux/selectors'
import { useColor } from '../../../hooks/useColor'
import { getCustomAvatarImage } from '../../../resources/assets/customAvatarAssets'

export const HelpCard = ({ ...props }: TouchableOpacityProps) => {
  const selectedAvatar = useSelector(currentAvatarSelector)
  const customAvatarConfig = useSelector(customAvatarConfigSelector)
  const { palette } = useColor()
  const locale = useSelector(currentLocaleSelector)

  const isCustomAvatar = selectedAvatar === 'custom' && customAvatarConfig

  // Get the appropriate image source
  const getAvatarSource = () => {
    if (isCustomAvatar) {
      const customImage = getCustomAvatarImage(customAvatarConfig, 'colour')
      // Fallback to placeholder if image not found in mapping
      if (customImage) return customImage
      return require('../../../resources/assets/images/avatars/custom.png')
    }
    return getAsset(`avatars.${selectedAvatar}.stationary_colour`)
  }

  return (
    <TouchableOpacity style={styles.helpCard} {...props}>
      <Image
        resizeMode="contain"
        source={getAvatarSource()}
        style={[styles.image, isCustomAvatar && styles.customImage]}
      />
      <Text
        style={[styles.text, { color: palette.secondary.text, fontSize: locale == 'id' ? 14 : 20 }]}
      >
        find help
      </Text>
    </TouchableOpacity>
  )
}
const styles = StyleSheet.create({
  helpCard: {
    zIndex: 9999,
    position: 'absolute',
    bottom: 12,
    right: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
    fontSize: 20,
    position: 'absolute',
    textAlign: 'center',
    bottom: 12,
  },
  image: {
    width: 120,
    height: 140,
  },
  customImage: {
    width: 120,
    height: 140,
    // marginBottom: 30,
  },
})