import { useViamClients } from './lib/contexts/ViamClientContext'
import { useEnvironment } from './lib/contexts/EnvironmentContext'
import AppInterface from './AppInterface'
import NewAppInterface from './NewAppInterface'
import { useFiles } from './lib/contexts/FilesContext'
import { usePass } from './lib/contexts/PassContext'
import { usePagination, DAYS_PER_PAGE } from './lib/contexts/PaginationContext'

function App() {
  const { machineId, machineName } = useViamClients()
  const { legacy } = useEnvironment()
  const { fetchFiles, fetchTimestamp, files, videoFiles, imageFiles } =
    useFiles()
  const {
    partId,
    passNotes,
    passSummaries,
    passDiagnoses,
    setPassNotes,
    setPassDiagnoses,
    fetchingNotes,
  } = usePass()
  const {
    currentPage,
    changePage,
    totalPages,
    currentPassSummaries,
    sortedDays,
    currentNumDaysDisplayed,
  } = usePagination()

  if (legacy) {
    return (
      <AppInterface
        machineName={machineName}
        passSummaries={currentPassSummaries}
        files={files}
        videoFiles={videoFiles}
        imageFiles={imageFiles}
        fetchVideos={fetchFiles}
        fetchTimestamp={fetchTimestamp}
        machineId={machineId}
        partId={partId}
        passNotes={passNotes}
        onNotesUpdate={setPassNotes}
        passDiagnoses={passDiagnoses}
        onDiagnosesUpdate={setPassDiagnoses}
        fetchingNotes={fetchingNotes}
        pagination={{
          currentPage,
          totalPages,
          itemsPerPage: DAYS_PER_PAGE,
          totalItems: sortedDays.length,
          totalEntries: passSummaries.length,
          onPageChange: changePage,
          currentDaysDisplayed: currentNumDaysDisplayed,
          daysPerPage: true,
        }}
      />
    )
  } else {
    return (
      <NewAppInterface
        passSummaries={currentPassSummaries}
        files={files}
        videoFiles={videoFiles}
        imageFiles={imageFiles}
        fetchVideos={fetchFiles}
        fetchTimestamp={fetchTimestamp}
        partId={partId}
        passNotes={passNotes}
        onNotesUpdate={setPassNotes}
        passDiagnoses={passDiagnoses}
        onDiagnosesUpdate={setPassDiagnoses}
        fetchingNotes={fetchingNotes}
      />
    )
  }
}

export default App
