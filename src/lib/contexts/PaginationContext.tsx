import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from 'react'
import { usePass } from './PassContext'
import { Pass } from '../types'
export const DAYS_PER_PAGE = 7

interface PaginationContextType {
  currentPage: number
  totalPages: number
  totalEntries: number
  currentNumDaysDisplayed: number
  currentPassSummaries: Pass[]
  groupedPasses: Record<string, Pass[]>
  changePage: (page: number) => void
  sortedDays: string[]
}

const PaginationContext = createContext<PaginationContextType | undefined>(
  undefined
)

export function PaginationProvider({ children }: { children: ReactNode }) {
  const { passSummariesByDay, passSummaries } = usePass()

  const [currentPassSummaries, setCurrentPassSummaries] = useState<Pass[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalEntries, setTotalEntries] = useState<number>(1)
  const [sortedDays, setSortedDays] = useState<string[]>([])
  const [currentNumDaysDisplayed, setCurrentNumDaysDisplayed] =
    useState<number>(1)

  const groupedPasses = useMemo(() => {
    return currentPassSummaries.reduce((acc: Record<string, Pass[]>, pass) => {
      // Use a consistent date key (YYYY-MM-DD)
      const dateKey = pass.start.toISOString().split('T')[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(pass)
      return acc
    }, {})
  }, [currentPassSummaries])

  useEffect(() => {
    // Get sorted day keys (dates)
    const nextSortedDays = Object.keys(passSummariesByDay).sort().reverse() // Most recent first

    // Paginate by days
    const indexOfLastDay = currentPage * DAYS_PER_PAGE
    const indexOfFirstDay = indexOfLastDay - DAYS_PER_PAGE
    const nextCurrentDays = nextSortedDays.slice(
      indexOfFirstDay,
      indexOfLastDay
    )

    const nextTotalPages = Math.ceil(nextSortedDays.length / DAYS_PER_PAGE)

    setTotalPages(nextTotalPages)
    setSortedDays(nextSortedDays)
    setTotalEntries(passSummaries.length)
    setCurrentNumDaysDisplayed(nextCurrentDays.length)
  }, [passSummariesByDay, passSummaries])

  useEffect(() => {
    const indexOfLastDay = currentPage * DAYS_PER_PAGE
    const indexOfFirstDay = indexOfLastDay - DAYS_PER_PAGE
    const currentDays = sortedDays.slice(indexOfFirstDay, indexOfLastDay)

    // Get all passes for the current days
    const currentPassSummaries = currentDays.flatMap(
      (day) => passSummariesByDay[day]
    )
    setCurrentPassSummaries(currentPassSummaries)
  }, [passSummariesByDay, currentPage, sortedDays])

  return (
    <PaginationContext.Provider
      value={{
        currentPage,
        totalPages,
        totalEntries,
        currentNumDaysDisplayed,
        currentPassSummaries,
        groupedPasses,
        changePage: setCurrentPage,
        sortedDays,
      }}
    >
      {children}
    </PaginationContext.Provider>
  )
}

export function usePagination() {
  const context = useContext(PaginationContext)
  if (context === undefined) {
    throw new Error('usePagination must be used within a PaginationProvider')
  }
  return context
}
