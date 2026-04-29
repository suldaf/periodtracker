import * as React from 'react'
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { ScreenComponent } from '../../navigation/RootNavigator'
import { HelpCenterCard } from './components/HelpCenterCard'
import { useSearch } from '../../hooks/useSearch'
import { Button } from '../../components/Button'
import { useToggle } from '../../hooks/useToggle'
import { HelpFilters, HelpFiltersModal } from './components/HelpFiltersModal'
import { HelpCenter } from '../../core/types'
import { useSelector } from '../../redux/useSelector'
import {
  allHelpCentersForCurrentLocale,
  helpCenterAttributesSelector,
  savedHelpCenterIdsSelector,
} from '../../redux/selectors'
import { useDispatch } from 'react-redux'
import { setSavedHelpCenters } from '../../redux/actions'
import { SearchBar } from '../../components/SearchBar'
import { globalStyles } from '../../config/theme'
import { Screen } from '../../components/Screen'
import { Modal } from '../../components/Modal'
import { Text } from '../../components/Text'
import { useProvinceOptions } from '../../hooks/useProvinceOptions'

type HelpType = 'telemedicine' | 'telecounseling'

interface ProvinceGroup {
  uid: string
  name: string
  items: HelpCenter[]
}

const FindHelpScreen: ScreenComponent<'Help'> = () => {
  const helpCenters = useSelector(allHelpCentersForCurrentLocale)
  const helpCenterAttributes = useSelector(helpCenterAttributesSelector)
  const savedHelpCenters = useSelector(savedHelpCenterIdsSelector)
  const dispatch = useDispatch()
  const provinceOptions = useProvinceOptions('ID')

  const [filterModalVisible, toggleFilterModal] = useToggle()
  const [filters, setFilters] = React.useState<HelpFilters>({
    region: undefined,
    subRegion: undefined,
    attributes: [],
  })
  const [selectedProvince, setSelectedProvince] = React.useState<ProvinceGroup | null>(null)
  const [selectedType, setSelectedType] = React.useState<HelpType | null>(null)

  const attributeNameById = React.useMemo(() => {
    return helpCenterAttributes.reduce<Record<number, string>>((acc, item) => {
      acc[item.id] = (item.name ?? '').toLowerCase()
      return acc
    }, {})
  }, [helpCenterAttributes])

  const provinceNameByUid = React.useMemo(() => {
    return provinceOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label
      return acc
    }, {})
  }, [provinceOptions])

  const filteredResults = React.useMemo(() => {
    return helpCenters.filter((item) => {
      if (filters.region && filters.region !== item.region) {
        return false
      }

      if (filters.region && filters.subRegion) {
        const itemSubRegions = item.subRegion
          ? item.subRegion.split(',').map((s) => s.trim())
          : []

        if (!itemSubRegions.includes(filters.subRegion) && !item.isAvailableNationwide) {
          return false
        }
      }

      const hasAttributeFilter = filters.attributes.length > 0
      const primaryAttributeNotIncluded =
        item.primaryAttributeId === null ||
        !filters.attributes.includes(item?.primaryAttributeId ?? -1)

      if (hasAttributeFilter && primaryAttributeNotIncluded) {
        return false
      }

      return true
    })
  }, [helpCenters, filters])

  const { query, setQuery, results } = useSearch<HelpCenter>({
    options: filteredResults,
    keys: searchKeys,
  })

  const splitSubRegions = React.useCallback((value: string | null | undefined) => {
    return (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }, [])

  const sortedResults = React.useMemo(() => {
    return [...results].sort((a, b) => {
      const isASaved = savedHelpCenters.includes(a.id)
      const isBSaved = savedHelpCenters.includes(b.id)

      // Primary sorting by saved status
      if (isASaved && !isBSaved) {
        return -1
      }
      if (!isASaved && isBSaved) {
        return 1
      }

      // Secondary sorting by sortingKey
      const aSortingKey = a.sortingKey
      const bSortingKey = b.sortingKey

      if (aSortingKey === undefined || bSortingKey === undefined) {
        return 0
      }

      return aSortingKey - bSortingKey
    })
  }, [results, savedHelpCenters])

  const groupedByProvince = React.useMemo(() => {
    const grouped = new Map<string, HelpCenter[]>()

    sortedResults.forEach((item) => {
      const provinceUids = splitSubRegions(item.subRegion)

      if (provinceUids.length === 0) {
        const fallbackUid = '0'
        grouped.set(fallbackUid, [...(grouped.get(fallbackUid) ?? []), item])
        return
      }

      provinceUids.forEach((uid) => {
        grouped.set(uid, [...(grouped.get(uid) ?? []), item])
      })
    })

    return Array.from(grouped.entries())
      .map(([uid, items]) => ({
        uid,
        name: provinceNameByUid[uid] ?? uid,
        items,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [provinceNameByUid, sortedResults, splitSubRegions])

  const resolveTypeByPrimaryAttribute = React.useCallback(
    (item: HelpCenter): HelpType | null => {
      const primaryAttributeId = item.primaryAttributeId
      if (primaryAttributeId === null || primaryAttributeId === undefined) {
        return null
      }

      const attributeName = attributeNameById[primaryAttributeId] ?? ''

      if (
        attributeName.includes('telemedicine') ||
        attributeName.includes('kesehatan') ||
        attributeName.includes('health')
      ) {
        return 'telemedicine'
      }

      if (
        attributeName.includes('telecounsel') ||
        attributeName.includes('konseling') ||
        attributeName.includes('counsel')
      ) {
        return 'telecounseling'
      }

      return null
    },
    [attributeNameById],
  )

  const onSavePress = React.useCallback(
    (id: number) => {
      if (savedHelpCenters.includes(id)) {
        dispatch(setSavedHelpCenters(savedHelpCenters.filter((itemId) => itemId !== id)))
        return
      }

      dispatch(setSavedHelpCenters([...savedHelpCenters, id]))
    },
    [dispatch, savedHelpCenters],
  )

  const openListModal = (province: ProvinceGroup, type: HelpType) => {
    setSelectedProvince(province)
    setSelectedType(type)
  }

  const closeListModal = () => {
    setSelectedProvince(null)
    setSelectedType(null)
  }

  const modalResults = React.useMemo(() => {
    if (!selectedProvince || !selectedType) {
      return []
    }

    return selectedProvince.items.filter((item) => resolveTypeByPrimaryAttribute(item) === selectedType)
  }, [resolveTypeByPrimaryAttribute, selectedProvince, selectedType])

  const modalTitle = React.useMemo(() => {
    if (!selectedProvince || !selectedType) {
      return ''
    }

    const typeLabel = selectedType === 'telemedicine' ? 'Telemedicine' : 'Telecounseling'
    return `${selectedProvince.name} - ${typeLabel}`
  }, [selectedProvince, selectedType])

  const hasFilters = filters.region || filters.subRegion || filters.attributes.length

  return (
    <Screen>
      <View style={styles.searchRow}>
        {/* <View style={styles.filterButton}></View> */}
        <SearchBar query={query} setQuery={setQuery} style={[styles.search, globalStyles.shadow]} />
        <Button
          style={styles.filterButton}
          status={hasFilters ? 'secondary' : 'basic'}
          onPress={toggleFilterModal}
        >
          <FontAwesome size={18} name={'filter'} color={'#fff'} />
        </Button>
      </View>

      <ScrollView style={styles.scrollView}>
        {groupedByProvince.map((province) => {
          const telemedicineCount = province.items.filter(
            (item) => resolveTypeByPrimaryAttribute(item) === 'telemedicine',
          ).length
          const telecounselingCount = province.items.filter(
            (item) => resolveTypeByPrimaryAttribute(item) === 'telecounseling',
          ).length

          return (
            <View key={`province-${province.uid}`} style={[styles.provinceCard, globalStyles.shadow]}>
              <View style={styles.provinceHeader}>
                <View style={styles.provinceHeaderTextWrap}>
                  <Text style={styles.provinceTitle} enableTranslate={false}>
                    {province.name}
                  </Text>
                  <View style={styles.provinceTotalBadge}>
                    <Text style={styles.provinceTotalText} enableTranslate={false}>
                      {province.items.length} Help Center
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.provinceStatsRow}>
                <TouchableOpacity
                  style={[
                    styles.provinceStatPill,
                    styles.provinceStatPillTelemedicine,
                    telemedicineCount === 0 && styles.provinceStatPillDisabled,
                  ]}
                  onPress={() => openListModal(province, 'telemedicine')}
                  disabled={telemedicineCount === 0}
                >
                  <View style={styles.provinceStatTopRow}>
                    <Text
                      style={[styles.provinceStatLabel, styles.provinceStatLabelTelemedicine]}
                      enableTranslate={false}
                    >
                      Telemedicine
                    </Text>
                    <FontAwesome size={14} name={'arrow-right'} color={'#1d6fdc'} />
                  </View>
                  <Text style={[styles.provinceStatValue, styles.provinceStatValueTelemedicine]} enableTranslate={false}>
                    {telemedicineCount}
                  </Text>
                  <Text style={styles.provinceStatHint} enableTranslate={false}>
                    Ketuk untuk lihat daftar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.provinceStatPill,
                    styles.provinceStatPillTelecounseling,
                    telecounselingCount === 0 && styles.provinceStatPillDisabled,
                  ]}
                  onPress={() => openListModal(province, 'telecounseling')}
                  disabled={telecounselingCount === 0}
                >
                  <View style={styles.provinceStatTopRow}>
                    <Text
                      style={[styles.provinceStatLabel, styles.provinceStatLabelTelecounseling]}
                      enableTranslate={false}
                    >
                      Telecounseling
                    </Text>
                    <FontAwesome size={14} name={'arrow-right'} color={'#d97706'} />
                  </View>
                  <Text
                    style={[styles.provinceStatValue, styles.provinceStatValueTelecounseling]}
                    enableTranslate={false}
                  >
                    {telecounselingCount}
                  </Text>
                  <Text style={styles.provinceStatHint} enableTranslate={false}>
                    Ketuk untuk lihat daftar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}

        <View style={styles.spacer} />
      </ScrollView>

      <Modal
        visible={Boolean(selectedProvince && selectedType)}
        toggleVisible={closeListModal}
        style={styles.modal}
      >
        <View
          style={[
            styles.modalHeader,
            selectedType === 'telemedicine'
              ? styles.modalHeaderTelemedicine
              : styles.modalHeaderTelecounseling,
          ]}
        >
          <Text style={styles.modalTitle} enableTranslate={false}>
            {modalTitle}
          </Text>
        </View>

        <ScrollView
          style={[
            styles.modalBody,
            selectedType === 'telemedicine'
              ? styles.modalBodyTelemedicine
              : styles.modalBodyTelecounseling,
          ]}
          contentContainerStyle={styles.modalBodyContent}
        >
          {modalResults.map((item) => {
            const isSaved = savedHelpCenters.includes(item.id)

            return (
              <HelpCenterCard
                key={`help-center-modal-${item.id}`}
                helpCenter={item}
                isSaved={isSaved}
                onSavePress={() => onSavePress(item.id)}
              />
            )
          })}

          {modalResults.length === 0 && (
            <Text style={styles.emptyResultText} enableTranslate={false}>
              Belum ada layanan untuk kategori ini
            </Text>
          )}
        </ScrollView>
      </Modal>

      <HelpFiltersModal
        visible={filterModalVisible}
        toggleVisible={toggleFilterModal}
        onConfirm={setFilters}
        filters={filters}
      />
    </Screen>
  )
}

const searchKeys = [
  'title' as const,
  'caption' as const,
  'address' as const,
  'website' as const,
  // TODO: Add string of combined attribute names to HelpCenter type for use here in search
]

export default FindHelpScreen

const styles = StyleSheet.create({
  scrollView: {
    width: '100%',
    padding: 12,
  },
  searchRow: {
    flexDirection: 'row',
    padding: 12,
  },
  search: {
    flex: 1,
    marginHorizontal: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
  },
  provinceCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 20,
    marginVertical: 8,
    marginHorizontal: 8,
    padding: 20,
  },
  provinceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  provinceHeaderTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  provinceTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 6,
  },
  provinceTotalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f2f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  provinceTotalText: {
    fontSize: 12,
    color: '#4e5968',
  },
  provinceStatsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  provinceStatPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  provinceStatPillTelemedicine: {
    backgroundColor: '#eef6ff',
    borderColor: '#bfdbfe',
  },
  provinceStatPillTelecounseling: {
    backgroundColor: '#fff4eb',
    borderColor: '#fbd0a7',
  },
  provinceStatPillDisabled: {
    opacity: 0.45,
  },
  provinceStatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  provinceStatLabel: {
    fontSize: 12,
  },
  provinceStatLabelTelemedicine: {
    color: '#1d4f91',
  },
  provinceStatLabelTelecounseling: {
    color: '#9a4d00',
  },
  provinceStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  provinceStatValueTelemedicine: {
    color: '#0f4c81',
  },
  provinceStatValueTelecounseling: {
    color: '#b45309',
  },
  provinceStatHint: {
    fontSize: 11,
    color: '#6b7280',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalHeaderTelemedicine: {
    backgroundColor: '#eaf5ff',
  },
  modalHeaderTelecounseling: {
    backgroundColor: '#fff1e8',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: 12,
  },
  modalBodyTelemedicine: {
    backgroundColor: '#f7fbff',
  },
  modalBodyTelecounseling: {
    backgroundColor: '#fffaf7',
  },
  modalBodyContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyResultText: {
    paddingVertical: 24,
    textAlign: 'center',
  },
  spacer: {
    height: 200,
  },
})
