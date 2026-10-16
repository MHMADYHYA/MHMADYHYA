/** Hooks للبيانات فوق React Query. المفاتيح بمكان واحد عشان الإبطال يكون سهل. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  cancelAppointment,
  createAppointment,
  createClientRecord,
  fetchAppointment,
  fetchAppointmentEvents,
  fetchAppointmentMessages,
  fetchAppointmentsForClient,
  fetchAppointmentsInRange,
  fetchClient,
  fetchClients,
  fetchFollowUpSource,
  fetchOutbox,
  fetchPayable,
  fetchSettings,
  rescheduleAppointment,
  updateAppointment,
  updateClientRecord,
  updateMessage,
  updateSettings,
  type ClientInput,
  type CreateAppointmentArgs,
  type RescheduleArgs,
} from '../lib/api'
import type { AppointmentRow, OutboxMessageRow, SettingsRow } from '../lib/database.types'
import { endOfDayApp } from '../lib/dates'
import type { OutboxDraft } from '../lib/messages'
import { getSupabase } from '../lib/supabase'

export const keys = {
  settings: ['settings'] as const,
  clients: (includeArchived: boolean) => ['clients', includeArchived] as const,
  client: (id: string) => ['client', id] as const,
  appointments: (start: string, end: string) => ['appointments', start, end] as const,
  clientAppointments: (clientId: string) => ['appointments', 'client', clientId] as const,
  appointment: (id: string) => ['appointment', id] as const,
  events: (id: string) => ['events', id] as const,
  messages: (id: string) => ['messages', id] as const,
  outbox: (until: string) => ['outbox', until] as const,
  followUp: ['follow-up'] as const,
  payable: (since: string) => ['payable', since] as const,
}

export function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: fetchSettings, staleTime: 5 * 60_000 })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<SettingsRow>) => updateSettings(patch),
    onSuccess: (data) => qc.setQueryData(keys.settings, data),
  })
}

export function useClients(includeArchived = false) {
  return useQuery({ queryKey: keys.clients(includeArchived), queryFn: () => fetchClients(includeArchived) })
}

export function useClient(id: string | undefined) {
  return useQuery({ queryKey: keys.client(id ?? ''), queryFn: () => fetchClient(id!), enabled: !!id })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ClientInput) => createClientRecord(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ClientInput> }) => updateClientRecord(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['client'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useAppointmentsInRange(start: Date, end: Date) {
  const s = start.toISOString()
  const e = end.toISOString()
  return useQuery({
    queryKey: keys.appointments(s, e),
    queryFn: () => fetchAppointmentsInRange(start, end),
    placeholderData: keepPreviousData,
  })
}

export function useClientAppointments(clientId: string | undefined) {
  return useQuery({
    queryKey: keys.clientAppointments(clientId ?? ''),
    queryFn: () => fetchAppointmentsForClient(clientId!),
    enabled: !!clientId,
  })
}

export function useAppointment(id: string | undefined) {
  return useQuery({ queryKey: keys.appointment(id ?? ''), queryFn: () => fetchAppointment(id!), enabled: !!id })
}

export function useAppointmentEvents(id: string | undefined) {
  return useQuery({ queryKey: keys.events(id ?? ''), queryFn: () => fetchAppointmentEvents(id!), enabled: !!id })
}

export function useAppointmentMessages(id: string | undefined) {
  return useQuery({ queryKey: keys.messages(id ?? ''), queryFn: () => fetchAppointmentMessages(id!), enabled: !!id })
}

function invalidateAppointmentData(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['appointments'] })
  qc.invalidateQueries({ queryKey: ['appointment'] })
  qc.invalidateQueries({ queryKey: ['events'] })
  qc.invalidateQueries({ queryKey: ['messages'] })
  qc.invalidateQueries({ queryKey: ['outbox'] })
  qc.invalidateQueries({ queryKey: keys.followUp })
  qc.invalidateQueries({ queryKey: ['payable'] })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: CreateAppointmentArgs) => createAppointment(args),
    onSuccess: () => invalidateAppointmentData(qc),
  })
}

export function useRescheduleAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: RescheduleArgs) => rescheduleAppointment(args),
    onSuccess: () => invalidateAppointmentData(qc),
  })
}

export function useCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, messages }: { id: string; reason: string | null; messages: OutboxDraft[] }) =>
      cancelAppointment(id, reason, messages),
    onSuccess: () => invalidateAppointmentData(qc),
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AppointmentRow> }) => updateAppointment(id, patch),
    onSuccess: () => invalidateAppointmentData(qc),
  })
}

/** الرسائل لحد نهاية اليوم (بتوقيت القدس) */
export function useOutbox(now: Date) {
  const until = endOfDayApp(now).toISOString()
  return useQuery({ queryKey: keys.outbox(until), queryFn: () => fetchOutbox(until), refetchInterval: 60_000 })
}

export function useUpdateMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<OutboxMessageRow> }) => updateMessage(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outbox'] })
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: keys.followUp })
    },
  })
}

export function useFollowUpSource(now: Date) {
  return useQuery({ queryKey: keys.followUp, queryFn: () => fetchFollowUpSource(now), refetchInterval: 60_000 })
}

export function usePayable(since: Date) {
  const s = since.toISOString()
  return useQuery({ queryKey: keys.payable(s), queryFn: () => fetchPayable(since) })
}

/** لما يتغير إشي بقاعدة البيانات (مثلاً الزبون رد)، الواجهة بتتحدث لحالها */
export function useRealtimeInvalidation(enabled: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    const supabase = getSupabase()
    if (!enabled || !supabase) return
    let timer: number | undefined
    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => qc.invalidateQueries(), 400)
    }
    const channel = supabase
      .channel('app-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outbox_messages' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, bump)
      .subscribe()
    return () => {
      window.clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [enabled, qc])
}
