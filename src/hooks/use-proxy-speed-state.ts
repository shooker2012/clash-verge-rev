import { useCallback, useSyncExternalStore } from 'react'
import speedManager, { type SpeedUpdate } from '@/services/speed'
import type { ResolvedProxyMember } from '@/types/proxy-view'

const initial: SpeedUpdate = { speed: -1, updatedAt: 0 }

export function useProxySpeedState(member: ResolvedProxyMember, group: string) {
  const name = member.ref.name
  return useSyncExternalStore(
    useCallback(
      (notify) => speedManager.subscribeNode(name, group, notify),
      [name, group],
    ),
    () => speedManager.getUpdate(name, group) ?? initial,
  )
}
