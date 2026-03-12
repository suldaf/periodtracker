import 'react-native-get-random-values'
import * as React from 'react'
import RootNavigator from './src/navigation/RootNavigator'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Background } from './src/components/Background'
import { Provider } from 'react-redux'
import { store, persistor } from './src/redux/store'
import { PersistGate } from 'redux-persist/integration/react'
import { useOrientationLock } from './src/hooks/useOrientationLock'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { EncyclopediaProvider } from './src/screens/EncyclopediaScreen/EncyclopediaContext'
import { ResponsiveProvider } from './src/contexts/ResponsiveContext'
import { PredictionProvider } from './src/contexts/PredictionProvider'
import { AuthProvider } from './src/contexts/AuthContext'
import { LoadingProvider } from './src/contexts/LoadingProvider'
import { StatusBar } from 'react-native'
import { analytics } from './src/services/firebase'
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated'
import { SoundProvider } from './src/contexts/SoundProvider'
import { ResponsiveDebugProvider } from './src/contexts/ResponsiveDebugContext'
import { DebugNavigator } from './src/navigation/DebugNavigator'

function App() {
  useOrientationLock()

  React.useEffect(() => {
    analytics?.().logAppOpen()
  }, [])

  return (
    <SafeAreaProvider>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AuthProvider>
              <PredictionProvider>
                <ResponsiveDebugProvider>
                  <ResponsiveProvider>
                    <SoundProvider>
                      <EncyclopediaProvider>
                        <Background>
                          <LoadingProvider>
                            <StatusBar hidden />
                            <DebugNavigator>
                              <RootNavigator />
                            </DebugNavigator>
                          </LoadingProvider>
                        </Background>
                      </EncyclopediaProvider>
                    </SoundProvider>
                  </ResponsiveProvider>
                </ResponsiveDebugProvider>
              </PredictionProvider>
            </AuthProvider>
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

export default App
