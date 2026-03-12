import React from 'react'
import { Dimensions, ScaledSize } from 'react-native'
import { useResponsiveDebug } from '../contexts/ResponsiveDebugContext'

export const useScreenDimensions = () => {
  const [dimensions, setDimensions] = React.useState(Dimensions.get('screen'))
  const { testDimensions, isEnabled } = useResponsiveDebug()

  const handleDimensionsChange = ({ screen }: { screen: ScaledSize }) => {
    setDimensions(screen)
  }

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', handleDimensionsChange)

    return () => {
      subscription && subscription.remove()
    }
  }, [])

  // If debug mode is enabled and we have test dimensions, use those instead
  if (isEnabled && testDimensions) {
    return {
      width: testDimensions.width,
      height: testDimensions.height,
      scale: dimensions.scale,
      fontScale: dimensions.fontScale,
    }
  }

  return dimensions
}
