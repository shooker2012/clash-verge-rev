import {
  AccessTimeRounded,
  MyLocationRounded,
  NetworkCheckRounded,
  SpeedRounded,
  SearchOffRounded,
  SearchRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  WifiTetheringRounded,
  WifiTetheringOffRounded,
  SortByAlphaRounded,
  SortRounded,
} from '@mui/icons-material'
import { Box, IconButton, TextField, type SxProps } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseSearchBox } from '@/components/base'
import StopRounded from '@mui/icons-material/StopRounded'
import DownloadRounded from '@mui/icons-material/DownloadRounded'
import { useSyncExternalStore } from 'react'
import speedManager from '@/services/speed'
import { useVerge } from '@/hooks/use-verge'
import delayManager from '@/services/delay'
import { showNotice } from '@/services/notice-service'
import { debugLog } from '@/utils/debug'
import { isValidUrl } from '@/utils/network'

import { SpeedProgress } from './speed-progress'
import type { ProxySortType } from './use-filter-sort'
import type { HeadState } from './use-head-state'

interface Props {
  sx?: SxProps
  url?: string
  groupName: string
  headState: HeadState
  onLocation: () => void
  onCheckDelay: () => void
  onCheckSpeed: () => void
  onHeadState: (val: Partial<HeadState>) => void
}

const defaultSx: SxProps = {}

export const ProxyHead = ({
  sx = defaultSx,
  url,
  groupName,
  headState,
  onHeadState,
  onLocation,
  onCheckDelay,
  onCheckSpeed,
}: Props) => {
  const {
    showType,
    sortType,
    filterText,
    textState,
    testUrl,
    filterMatchCase,
    filterMatchWholeWord,
    filterUseRegularExpression,
  } = headState

  const { t } = useTranslation()
  const [autoFocus, setAutoFocus] = useState(false)

  useEffect(() => {
    // fix the focus conflict
    const timer = setTimeout(() => setAutoFocus(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const activeGroup = useSyncExternalStore(
    speedManager.subscribe,
    speedManager.activeGroup,
  )
  const testing = activeGroup === groupName
  const { verge } = useVerge()
  const defaultLatencyUrl =
    verge?.default_latency_test?.trim() ||
    'http://cp.cloudflare.com/generate_204'

  useEffect(() => {
    delayManager.setUrl(groupName, testUrl?.trim() || url || defaultLatencyUrl)
  }, [groupName, testUrl, defaultLatencyUrl, url])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
      <IconButton
        size="small"
        color="inherit"
        title={t('proxies.page.tooltips.locate')}
        onClick={onLocation}
      >
        <MyLocationRounded />
      </IconButton>

      <IconButton
        size="small"
        color="inherit"
        disabled={activeGroup !== null && !testing}
        title={
          testing
            ? t('proxies.page.tooltips.stopSpeed')
            : t('proxies.page.tooltips.speedCheck')
        }
        onClick={testing ? () => void speedManager.stop() : onCheckSpeed}
      >
        {testing ? <StopRounded /> : <SpeedRounded />}
      </IconButton>
      <SpeedProgress group={groupName} />

      <IconButton
        size="small"
        color="inherit"
        title={t('proxies.page.tooltips.delayCheck')}
        onClick={() => {
          debugLog(`[ProxyHead] 点击延迟测试按钮，组: ${groupName}`)
          // Remind the user that it is custom test url
          if (testUrl?.trim() && textState !== 'filter') {
            debugLog(`[ProxyHead] 使用自定义测试URL: ${testUrl}`)
            onHeadState({ textState: 'url' })
          }
          if (testUrl?.trim() && !isValidUrl(testUrl)) {
            showNotice.warning('proxies.feedback.warnings.invalidTestUrl')
            return
          }
          onCheckDelay()
        }}
      >
        <NetworkCheckRounded />
      </IconButton>

      <IconButton
        size="small"
        color="inherit"
        title={
          [
            t('proxies.page.tooltips.sortDefault'),
            t('proxies.page.tooltips.sortDelay'),
            t('proxies.page.tooltips.sortName'),
            t('proxies.page.tooltips.sortSpeed'),
          ][sortType]
        }
        onClick={() =>
          onHeadState({ sortType: ((sortType + 1) % 4) as ProxySortType })
        }
      >
        {sortType === 0 && <SortRounded />}
        {sortType === 1 && <AccessTimeRounded />}
        {sortType === 3 && <DownloadRounded />}
        {sortType === 2 && <SortByAlphaRounded />}
      </IconButton>

      <IconButton
        size="small"
        color="inherit"
        title={t('proxies.page.tooltips.delayCheckUrl')}
        onClick={() =>
          onHeadState({ textState: textState === 'url' ? null : 'url' })
        }
      >
        {textState === 'url' ? (
          <WifiTetheringRounded />
        ) : (
          <WifiTetheringOffRounded />
        )}
      </IconButton>

      <IconButton
        size="small"
        color="inherit"
        title={
          showType
            ? t('proxies.page.tooltips.showBasic')
            : t('proxies.page.tooltips.showDetail')
        }
        onClick={() => onHeadState({ showType: !showType })}
      >
        {showType ? <VisibilityRounded /> : <VisibilityOffRounded />}
      </IconButton>

      <IconButton
        size="small"
        color="inherit"
        title={t('proxies.page.tooltips.filter')}
        onClick={() =>
          onHeadState({ textState: textState === 'filter' ? null : 'filter' })
        }
      >
        {textState === 'filter' ? <SearchOffRounded /> : <SearchRounded />}
      </IconButton>

      {textState === 'filter' && (
        <Box sx={{ ml: 0.5, flex: '1 1 auto' }}>
          <BaseSearchBox
            autoFocus={autoFocus}
            value={filterText}
            searchState={{
              matchCase: filterMatchCase,
              matchWholeWord: filterMatchWholeWord,
              useRegularExpression: filterUseRegularExpression,
            }}
            onSearch={(_, state) =>
              onHeadState({
                filterText: state.text,
                filterMatchCase: state.matchCase,
                filterMatchWholeWord: state.matchWholeWord,
                filterUseRegularExpression: state.useRegularExpression,
              })
            }
          />
        </Box>
      )}

      {textState === 'url' && (
        <TextField
          autoComplete="new-password"
          autoFocus={autoFocus}
          hiddenLabel
          autoSave="off"
          value={testUrl}
          size="small"
          variant="outlined"
          placeholder={t('proxies.page.placeholders.delayCheckUrl')}
          onChange={(e) => onHeadState({ testUrl: e.target.value })}
          sx={{ ml: 0.5, flex: '1 1 auto', input: { py: 0.65, px: 1 } }}
        />
      )}
    </Box>
  )
}
