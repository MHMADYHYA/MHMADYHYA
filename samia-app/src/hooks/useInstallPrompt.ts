import { useSyncExternalStore } from 'react'
import { getInstallState, subscribeInstallState, type InstallState } from '../lib/install'

/** حالة زر "ثبّتي التطبيق" (بتتحدث لما Chrome يجهّز التثبيت أو لما ينثبّت) */
export function useInstallPrompt(): InstallState {
  return useSyncExternalStore(subscribeInstallState, getInstallState, getInstallState)
}
