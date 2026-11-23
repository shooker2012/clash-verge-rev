import { selectNodeForGroup, unfixedProxy } from 'tauri-plugin-mihomo-api'

import { commands } from '@/services/bindings'
import { type InteractableProxyMember } from '@/types/proxy-view'

export interface SpeedUpdate {
  status?:
    | 'queued'
    | 'testing'
    | 'skipDelay'
    | 'skipStopped'
    | 'failed'
    | 'measured'
  speed: number
  updatedAt: number
  error?: boolean
}

const keyOf = (name: string, group: string) => `${group}::${name}`

class SpeedManager {
  private current: { group: string; id: number; stopped: boolean } | null = null
  private sequence = crypto.getRandomValues(new Uint32Array(1))[0] % 0x7fffffff
  private observers = new Set<() => void>()
  private revisions = new Map<string, number>()
  activeGroup = () => this.current?.group ?? null
  revision(group: string) {
    return this.revisions.get(group) ?? 0
  }
  subscribe = (notify: () => void) => {
    this.observers.add(notify)
    return () => {
      this.observers.delete(notify)
    }
  }
  private progress = new Map<
    string,
    {
      total: number
      tested: number
      skipped: number
      phase: 'delay' | 'download' | 'stopping' | 'stopped' | 'finished'
    }
  >()
  private pending = new Set<string>()
  getProgress(group: string) {
    return this.progress.get(group)
  }
  private updateProgress(
    group: string,
    patch: Partial<NonNullable<ReturnType<SpeedManager['getProgress']>>>,
  ) {
    const previous = this.progress.get(group)
    if (!previous) return
    this.progress.set(group, { ...previous, ...patch })
    this.observers.forEach((notify) => notify())
  }
  private mark(
    name: string,
    group: string,
    status: NonNullable<SpeedUpdate['status']>,
  ) {
    const old = this.getUpdate(name, group)
    this.setSpeed(name, group, old?.speed ?? -1, false, status)
  }
  private settle(name: string, group: string, skipped: boolean) {
    if (!this.pending.delete(name)) return
    const progress = this.progress.get(group)!
    if (skipped) this.updateProgress(group, { skipped: progress.skipped + 1 })
    else this.updateProgress(group, { tested: progress.tested + 1 })
  }
  start(group: string, names: string[]) {
    if (this.current) return null
    this.pending = new Set(names)
    this.progress.set(group, {
      total: this.pending.size,
      tested: 0,
      skipped: 0,
      phase: 'delay',
    })
    for (const name of this.pending) this.mark(name, group, 'queued')
    this.current = { group, id: ++this.sequence, stopped: false }
    this.observers.forEach((notify) => notify())
    return this.current
  }
  async stop() {
    const run = this.current
    if (!run || run.stopped) return
    run.stopped = true
    this.updateProgress(run.group, { phase: 'stopping' })
    await commands.stopDownloadSpeed(run.id)
  }
  finish(group: string) {
    for (const name of this.pending) {
      this.mark(name, group, 'skipStopped')
    }
    const progress = this.progress.get(group)!
    const skipped = progress.skipped + this.pending.size
    this.pending.clear()
    this.updateProgress(group, {
      skipped,
      phase: this.current?.stopped ? 'stopped' : 'finished',
    })
    this.current = null
    this.revisions.set(group, this.revision(group) + 1)
    this.observers.forEach((notify) => notify())
  }
  private cache = new Map<string, SpeedUpdate>()
  private listeners = new Map<string, Set<() => void>>()

  subscribeNode(name: string, group: string, notify: () => void) {
    const key = keyOf(name, group)
    const listeners = this.listeners.get(key) ?? new Set<() => void>()
    listeners.add(notify)
    this.listeners.set(key, listeners)
    return () => {
      listeners.delete(notify)
      if (!listeners.size) this.listeners.delete(key)
    }
  }

  getUpdate(name: string, group: string) {
    return this.cache.get(keyOf(name, group))
  }

  getSortSpeed(name: string, group: string) {
    const result = this.getUpdate(name, group)
    return result?.status === 'measured' ? Math.max(result.speed, 0) : 0
  }
  setSpeed(
    name: string,
    group: string,
    speed: number,
    error = false,
    status: SpeedUpdate['status'] = error || speed === 0
      ? 'failed'
      : 'measured',
  ) {
    const update = { speed, updatedAt: Date.now(), error, status }
    const key = keyOf(name, group)
    this.cache.set(key, update)
    this.listeners.get(key)?.forEach((notify) => notify())
    return update
  }

  async checkListSpeed(
    members: InteractableProxyMember[],
    group: string,
    url: string,
    durationSecs: number,
    maxBytes: number,
    restoreName?: string,
    reachable: (name: string) => boolean = () => true,
    restoreAutomatic = false,
  ) {
    const run = this.current
    if (!run || run.stopped) return
    let selected = false
    this.updateProgress(group, { phase: 'download' })
    try {
      for (const member of members) {
        const name = member.ref.name
        if (run.stopped) break
        if (!this.pending.has(name)) continue
        if (!reachable(name)) {
          this.mark(name, group, 'skipDelay')
          this.settle(name, group, true)
          continue
        }
        this.mark(name, group, 'testing')
        try {
          await selectNodeForGroup(group, name)
          selected = true
          if (run.stopped) break
          const speed = await commands.testDownloadSpeed(
            url,
            durationSecs,
            maxBytes,
            run.id,
          )
          if (run.stopped) break
          this.setSpeed(name, group, speed)
        } catch (error) {
          if (run.stopped) break
          console.error(`[SpeedManager] 节点测速失败: ${name}`, error)
          this.setSpeed(name, group, 0, true)
        }
        this.settle(name, group, false)
      }
    } finally {
      if (selected && restoreAutomatic)
        await unfixedProxy(group).catch(() => undefined)
      else if (selected && restoreName)
        await selectNodeForGroup(group, restoreName).catch(() => undefined)
    }
  }

  formatSpeedColor(status: SpeedUpdate['status']) {
    switch (status) {
      case 'skipDelay':
      case 'failed':
        return 'error.main'
      case 'queued':
        return 'text.secondary'
      default:
        return 'info.main'
    }
  }

  formatSpeed(bytesPerSecond: number) {
    if (bytesPerSecond < 0) return 'testing'
    if (bytesPerSecond === 0) return 'Error'
    const megabits = (bytesPerSecond * 8) / 1_000_000
    return `${megabits.toFixed(megabits >= 10 ? 0 : 1)} Mbps`
  }
}

export default new SpeedManager()
