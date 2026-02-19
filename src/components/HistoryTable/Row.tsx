import { useNavigate } from 'react-router-dom'
import { CollapsedRow } from './CollapsedRow'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'

const Row = () => {
  const navigate = useNavigate()
  const { pass } = useSinglePass()

  const handleRowClick = () => {
    navigate(`/passes/${pass.pass_id}`)
  }

  return (
    <CollapsedRow isExpanded={false} toggleRowExpansion={handleRowClick} />
  )
}

export default Row
