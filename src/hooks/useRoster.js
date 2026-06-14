import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRoster, isAdminUser } from '../utils/roster'

function reasonToMessage(reason) {
  if (reason === 'unauthorized' || reason === 'forbidden') return '동아리 명단 접근 권한이 없습니다.'
  if (reason === 'endpoint-missing') return 'COMS 명단 API가 응답하지 않습니다.'
  if (reason === 'network') return '서버에 연결할 수 없습니다.'
  return '명단을 불러오지 못했습니다.'
}

export function useRoster(currentUser) {
  const eligible = isAdminUser(currentUser)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!eligible) {
      setMembers([])
      setError('')
      setLoaded(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const result = await fetchRoster()
    if (requestIdRef.current !== requestId) return
    setLoading(false)
    setLoaded(true)
    if (result.ok) {
      setMembers(result.members)
      return
    }
    setMembers([])
    setError(reasonToMessage(result.reason))
  }, [eligible])

  useEffect(() => {
    refresh()
    return () => { requestIdRef.current += 1 }
  }, [refresh])

  return { eligible, members, loading, error, loaded, refresh }
}
