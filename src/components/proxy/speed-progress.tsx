import { Typography } from '@mui/material'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import speedManager from '@/services/speed'

export function SpeedProgress({ group }: { group: string }) {
  const { t } = useTranslation()
  const p = useSyncExternalStore(speedManager.subscribe, () =>
    speedManager.getProgress(group),
  )
  if (!p) return null
  return (
    <Typography
      component="span"
      variant="caption"
      role="status"
      sx={{ whiteSpace: 'nowrap' }}
    >
      {t(`proxies.page.speed.${p.phase}`)} {p.tested + p.skipped}/{p.total}
      {p.skipped > 0 &&
        ` · ${t('proxies.page.speed.skippedCount', { count: p.skipped })}`}
    </Typography>
  )
}
