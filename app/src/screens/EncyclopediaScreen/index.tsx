import React from 'react'
import { useDispatch } from 'react-redux'
import { StyleSheet, ScrollView, View, RefreshControl } from 'react-native'
import { Accordion } from './components/Accordion'
import { HelpCard } from './components/HelpCard'
import { CategoryPicker } from './components/CategoryPicker'
import { ScreenComponent } from '../../navigation/RootNavigator'
import { useEncyclopedia } from './EncyclopediaContext'
import { SearchBar } from '../../components/SearchBar'
import { globalStyles } from '../../config/theme'
import { Screen } from '../../components/Screen'
import { CUSTOM_HELP_CARD_ENABLED, CustomHelpCard } from '../../optional/customHelpCard'
import { useSelector } from '../../redux/useSelector'
import { currentLocaleSelector } from '../../redux/selectors'

const EncyclopediaScreen: ScreenComponent<'Encyclopedia'> = ({ navigation }) => {
  const dispatch = useDispatch()
  const locale = useSelector(currentLocaleSelector)
  const lastRefreshAtRef = React.useRef(0)

  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = React.useCallback(() => {
    const now = Date.now()

    setRefreshing(true)
    lastRefreshAtRef.current = now
    console.log('EncyclopediaScreen onRefresh, lastRefreshAt=', lastRefreshAtRef.current)
    dispatch({ type: 'FETCH_CONTENT_REQUEST', payload: { locale: locale ?? 'id' } })

    // Stop the spinner after a short delay. (If you later add a Redux loading selector,
    // replace this timeout with a proper "stop when request completes" behavior.)
    setTimeout(() => setRefreshing(false), 1200)
  }, [dispatch, locale])

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const now = Date.now()

      // Avoid spamming requests if focus fires multiple times quickly.
      console.log('EncyclopediaScreen focused, lastRefreshAt=', lastRefreshAtRef.current)
      if (now - lastRefreshAtRef.current < 10_000) return
      lastRefreshAtRef.current = now

      dispatch({ type: 'FETCH_CONTENT_REQUEST', payload: { locale: locale ?? 'id' } })
    })
    return unsubscribe
  }, [dispatch, locale, navigation])

  const { query, setQuery } = useEncyclopedia()
  const goToHelpScreen = () => navigation.navigate('Help')

  return (
    <Screen>
      {!CUSTOM_HELP_CARD_ENABLED && <HelpCard onPress={goToHelpScreen} />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SearchBar query={query} setQuery={setQuery} style={globalStyles.shadow} />
        <CategoryPicker />
        {CUSTOM_HELP_CARD_ENABLED && <CustomHelpCard onPress={goToHelpScreen} />}
        <Accordion />
        <View style={styles.spacer} />
      </ScrollView>
    </Screen>
  )
}

export default EncyclopediaScreen

const styles = StyleSheet.create({
  scrollView: {
    padding: 12,
    height: '100%',
  },
  container: {
    alignItems: 'center',
  },
  spacer: {
    height: 200,
  },
})
