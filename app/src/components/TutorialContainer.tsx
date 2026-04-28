import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { useTutorial } from '../screens/MainScreen/TutorialContext'
import { useThrottledFunction } from '../hooks/useThrottledFunction'
import { TutorialSkip } from '../screens/MainScreen/components/TutorialSkip'
import { useLoading } from '../contexts/LoadingProvider'
import { useResponsive } from '../contexts/ResponsiveContext'
import { useColor } from '../hooks/useColor'

export interface TutorialContainerProps {
  children?: React.ReactNode
}

export const TutorialContainer = ({ children }: TutorialContainerProps) => {
  const { dispatch } = useTutorial()
  const { loading } = useLoading()
  const { UIConfig } = useResponsive()
  const { modalBackdropColor } = useColor()

  const onContinue = () => {
    dispatch({ type: 'continue' })
  }

  // Prevent double clicking
  const continueThrottled = useThrottledFunction(onContinue, 350)

  // While loading spinner is showing, render children normally so layouts get measured
  if (loading) {
    return <>{children}</>
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: modalBackdropColor,
          paddingTop: UIConfig.tutorial.paddingTop,
          paddingBottom: UIConfig.tutorial.paddingBottom,
        },
      ]}
    >
      <TutorialSkip />
      <TouchableOpacity style={styles.touchableOverlay} onPress={continueThrottled} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  touchableOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
  },
})
