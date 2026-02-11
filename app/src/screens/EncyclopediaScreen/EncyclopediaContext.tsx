import React from 'react'
import moment from 'moment'
import { useSearch } from '../../hooks/useSearch'
import { useSelector } from '../../redux/useSelector'
import {
  allArticlesSelector,
  allCategoriesSelector,
  allSubCategoriesSelector,
  allVideosSelector,
  currentLocaleSelector,
  currentUserSelector,
} from '../../redux/selectors'
import { Article, Category, SubCategory, VideoData } from '../../core/types'
import { canAccessContent } from '../../services/restriction'

export type EncyclopediaContext = {
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  categoryIds: string[]
  subcategoryIds: string[]
  articleIds: string[]
  selectedCategoryIds: string[]
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>
  filteredCategoryIds: string[]
  videos: VideoData[]
  selectedVideoId: string | undefined
  setSelectedVideoId: React.Dispatch<React.SetStateAction<string | undefined>>
}

interface ArticleWithParentIds extends Article {
  categoryId: string
  subCategoryId: string
}

const defaultValue: EncyclopediaContext = {
  query: '',
  setQuery: () => {},
  categoryIds: [],
  subcategoryIds: [],
  articleIds: [],
  selectedCategoryIds: [],
  setSelectedCategoryIds: () => {},
  filteredCategoryIds: [],
  videos: [],
  selectedVideoId: undefined,
  setSelectedVideoId: () => {},
}

const EncyclopediaContext = React.createContext<EncyclopediaContext>(defaultValue)

export const EncyclopediaProvider = ({ children }: React.PropsWithChildren) => {
  const currentUser = useSelector(currentUserSelector)
  const categories = useSelector(allCategoriesSelector)
  const subCategories = useSelector(allSubCategoriesSelector)
  const articles = useSelector(allArticlesSelector)
  const allVideos = useSelector(allVideosSelector)
  const locale = useSelector(currentLocaleSelector)

  const userAgeYears = React.useMemo(() => getUserAgeYears(currentUser), [currentUser])

  const liveArticles: Article[] = React.useMemo(() => {
    return articles.filter((item) => item?.live !== false)
  }, [articles])

  const articlesWithParentIds: ArticleWithParentIds[] = React.useMemo(() => {
    return getArticlesWithParentIds(liveArticles, categories, subCategories)
  }, [liveArticles, categories, subCategories])

  const moderatedArticles: ArticleWithParentIds[] = React.useMemo(() => {
    return articlesWithParentIds.filter((item) => canAccessContent(item, currentUser))
  }, [
    liveArticles,
    categories,
    subCategories,
    currentUser,
    currentUser?.metadata?.contentSelection,
  ])

  console.log('Age Filtered Articles Count:', moderatedArticles)
  const ageFilteredArticles: ArticleWithParentIds[] = React.useMemo(() => {
    return moderatedArticles.filter((item) => isContentAllowedForAge(item, userAgeYears))
  }, [moderatedArticles, userAgeYears])
  const { query, setQuery, results } = useSearch<ArticleWithParentIds>({
    options: ageFilteredArticles,
    keys: searchKeys,
  })

  const ageFilteredVideos: VideoData[] = React.useMemo(() => {
    return allVideos.filter((item) => isContentAllowedForAge(item, userAgeYears))
  }, [allVideos, userAgeYears])

  const { results: videos } = useSearch<VideoData>({
    externalQuery: query,
    options: ageFilteredVideos,
    keys: videoSearchKeys,
  })

  const { categoryIds, subcategoryIds, articleIds } = React.useMemo(() => {
    return getFilteredIds(results)
  }, [results])

  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([])

  const [selectedVideoId, setSelectedVideoId] = React.useState<string>()

  const filteredCategoryIds =
    selectedCategoryIds.length === 0
      ? categoryIds
      : categoryIds.filter((item) => selectedCategoryIds.includes(item))

  React.useEffect(() => {
    setQuery('')
    setSelectedCategoryIds([])
    setSelectedVideoId(undefined)
  }, [locale])

  return (
    <EncyclopediaContext.Provider
      value={{
        query,
        setQuery,
        selectedCategoryIds,
        setSelectedCategoryIds,
        filteredCategoryIds,
        categoryIds,
        subcategoryIds,
        articleIds,
        videos,
        selectedVideoId,
        setSelectedVideoId,
      }}
    >
      {children}
    </EncyclopediaContext.Provider>
  )
}

export const useEncyclopedia = () => {
  return React.useContext(EncyclopediaContext)
}

const searchKeys = [
  'title' as const,
  'content' as const,
  'category' as const,
  'subCategory' as const,
]

const videoSearchKeys = [
  'title' as const, //
  'assetName' as const,
]

const getArticlesWithParentIds = (
  articles: Article[],
  categories: Category[],
  subCategories: SubCategory[],
) => {
  return articles.reduce<ArticleWithParentIds[]>((acc, article) => {
    const subCategory = subCategories.find((sub) => sub.articles.includes(article.id))

    if (!subCategory) {
      return acc
    }

    const category = categories.find((cat) => cat.subCategories.includes(subCategory.id))

    if (!category) {
      return acc
    }

    const articleWithParentIds = {
      ...article,
      categoryId: category.id,
      subCategoryId: subCategory.id,
    }

    return [...acc, articleWithParentIds]
  }, [])
}

const getFilteredIds = (filteredArticles: ArticleWithParentIds[]) => {
  const articleIds = filteredArticles.map((article) => article.id)
  const categoryIds = Array.from(new Set(filteredArticles.map((article) => article.categoryId)))
  const subcategoryIds = Array.from(
    new Set(filteredArticles.map((article) => article.subCategoryId)),
  )

  return { categoryIds, subcategoryIds, articleIds }
}

type AgeRanged = {
  age_category_min_age?: number | string | null
  age_category_max_age?: number | string | null
  ageCategoryMinAge?: number | string | null
  ageCategoryMaxAge?: number | string | null
  age_category_name?: string | null
}

const toNumberOrUndefined = (v: unknown): number | undefined => {
  if (v === null || v === undefined) return undefined
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

const isContentAllowedForAge = (content: unknown, userAgeYears?: number) => {
  const c = content as AgeRanged

  const min =
    toNumberOrUndefined(c.age_category_min_age) ?? toNumberOrUndefined(c.ageCategoryMinAge)
  const max =
    toNumberOrUndefined(c.age_category_max_age) ?? toNumberOrUndefined(c.ageCategoryMaxAge)

  // If content has no age range metadata, always allow.
  if (min === undefined && max === undefined) return true

  // If user age is unknown, do not hide content (safer default for UX).
  if (userAgeYears === undefined) return true

  if (min !== undefined && userAgeYears < min) return false
  if (max !== undefined && userAgeYears > max) return false
  return true
}

const getUserAgeYears = (user: any): number | undefined => {
  if (!user) return undefined

  // Prefer explicit age if present.
  const directAge =
    toNumberOrUndefined(user.age) ??
    toNumberOrUndefined(user.metadata?.age) ??
    toNumberOrUndefined(user.profile?.age)

  if (directAge !== undefined) return directAge

  // Try common DOB fields.
  const dobRaw = user?.dateOfBirth

  if (!dobRaw) return undefined

  const dob = moment(dobRaw)
  if (!dob.isValid()) return undefined

  const age = moment().diff(dob, 'years')
  return age >= 0 ? age : undefined
}
