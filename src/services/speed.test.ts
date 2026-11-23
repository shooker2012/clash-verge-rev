import { expect, test, vi } from 'vitest'
import { selectNodeForGroup, unfixedProxy } from 'tauri-plugin-mihomo-api'
import { commands } from './bindings'
import speed from './speed'
import type { InteractableProxyMember } from '@/types/proxy-view'

vi.mock('tauri-plugin-mihomo-api', () => ({
  selectNodeForGroup: vi.fn(async () => {}),
  unfixedProxy: vi.fn(async () => {}),
}))
test('stop interrupts the current request, retains completed results and restores selection', async () => {
  const group = 'download-stop'
  const members = ['one', 'two', 'three'].map((name) => ({
    ref: { name },
  })) as InteractableProxyMember[]
  const run = speed.start(
    group,
    members.map((member) => member.ref.name),
  )!
  let cancel!: () => void
  vi.spyOn(commands, 'testDownloadSpeed')
    .mockResolvedValueOnce(500)
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          cancel = () => reject(new Error('stopped'))
        }),
    )
  const stop = vi
    .spyOn(commands, 'stopDownloadSpeed')
    .mockImplementation(async () => cancel())
  speed.setSpeed('two', group, 250)
  const batch = speed.checkListSpeed(
    members,
    group,
    'https://example.com',
    10,
    1000,
    'original',
  )
  await vi.waitFor(() =>
    expect(commands.testDownloadSpeed).toHaveBeenCalledTimes(2),
  )
  expect(speed.getProgress(group)).toMatchObject({
    phase: 'download',
    tested: 1,
    skipped: 0,
    total: 3,
  })
  expect(speed.getUpdate('three', group)?.status).toBe('queued')
  expect(speed.getUpdate('two', group)?.status).toBe('testing')
  await speed.stop()
  await batch
  speed.finish(group)
  expect(stop).toHaveBeenCalledWith(run.id)
  expect(speed.getUpdate('one', group)?.speed).toBe(500)
  expect(speed.getUpdate('two', group)?.speed).toBe(250)
  expect(speed.getUpdate('two', group)?.status).toBe('skipStopped')
  expect(speed.getUpdate('three', group)?.status).toBe('skipStopped')
  expect(speed.getProgress(group)).toMatchObject({
    phase: 'stopped',
    tested: 1,
    skipped: 2,
    total: 3,
  })
  expect(
    vi.mocked(selectNodeForGroup).mock.calls.map((call) => call[1]),
  ).toEqual(['one', 'two', 'original'])
  expect(speed.activeGroup()).toBeNull()
})

test('latency skips advance progress without issuing a download', async () => {
  const group = 'unreachable'
  const members = [{ ref: { name: 'offline' } }] as InteractableProxyMember[]
  speed.start(group, ['offline'])
  const downloads = vi.spyOn(commands, 'testDownloadSpeed')
  await speed.checkListSpeed(
    members,
    group,
    'https://example.com',
    10,
    1000,
    undefined,
    () => false,
  )
  speed.finish(group)
  expect(downloads).not.toHaveBeenCalled()
  expect(speed.getUpdate('offline', group)?.status).toBe('skipDelay')
  expect(speed.getProgress(group)).toEqual({
    phase: 'finished',
    total: 1,
    tested: 0,
    skipped: 1,
  })
})

test('testing one node in an automatic group releases the temporary selection', async () => {
  const group = 'auto-menu'
  const node = { ref: { name: 'clicked' } } as InteractableProxyMember
  const select = vi.mocked(selectNodeForGroup)
  select.mockClear()
  const download = vi
    .spyOn(commands, 'testDownloadSpeed')
    .mockResolvedValue(1000)
  speed.start(group, ['clicked'])
  await speed.checkListSpeed(
    [node],
    group,
    'https://example.com',
    10,
    1000,
    'previous',
    () => true,
    true,
  )
  speed.finish(group)
  expect(select.mock.calls).toEqual([[group, 'clicked']])
  expect(download).toHaveBeenCalledTimes(1)
  expect(unfixedProxy).toHaveBeenCalledWith(group)
  expect(speed.getProgress(group)).toMatchObject({ total: 1, tested: 1 })
})
