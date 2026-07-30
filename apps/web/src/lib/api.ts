import {
  type Artifact,
  AskResponse,
  type BaselineAnchor,
  BranchView,
  CompareView,
  ConfigResponse,
  type CreateTimelineRequest,
  CreateTimelineResponse,
  type EntityBiography,
  EntityFatesResponse,
  type Era,
  type Event,
  type EventView,
  ForkResponse,
  type HistoriographicSchool,
  type Interpretation,
  InterpretResponse,
  PulseResponse,
  TimelineAggregate,
  TimelineSummary,
  type UpdateTimelineRequest,
  UpdateTimelineResponse,
} from '@uchronia/schemas'
import { z } from 'zod'

/** Typed API client. Every response is parsed with the shared schemas. */

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  })
  if (!res.ok) {
    let message = `${res.status}`
    try {
      const body = (await res.json()) as { message?: string; error?: string }
      message = body.message ?? body.error ?? message
    } catch {
      // keep the status text
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export interface LiveCheckResult {
  ok: boolean
  mode: 'live' | 'demo'
  model?: string
  latencyMs?: number
  error?: string
}

export const api = {
  config: async () => ConfigResponse.parse(await request('/api/config')),

  liveCheck: () => request<LiveCheckResult>('/api/live-check', { method: 'POST' }),

  /** Unlock a gated instance (v2/M24). Always 200; the verdict is in the body. */
  unlock: (passphrase: string) =>
    request<{ ok: boolean; gated: boolean; message: string }>('/api/unlock', {
      method: 'POST',
      body: JSON.stringify({ passphrase }),
    }),

  interpret: async (podText: string) =>
    InterpretResponse.parse(
      await request('/api/timelines/interpret', {
        method: 'POST',
        body: JSON.stringify({ podText }),
      }),
    ),

  baseline: () => request<{ anchors: BaselineAnchor[] }>('/api/baseline'),

  listTimelines: async () => z.array(TimelineSummary).parse(await request('/api/timelines')),

  createTimeline: async (body: CreateTimelineRequest) =>
    CreateTimelineResponse.parse(
      await request('/api/timelines', { method: 'POST', body: JSON.stringify(body) }),
    ),

  deleteTimeline: (id: string) => request<void>(`/api/timelines/${id}`, { method: 'DELETE' }),

  updateTimeline: async (id: string, body: UpdateTimelineRequest) =>
    UpdateTimelineResponse.parse(
      await request(`/api/timelines/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    ).timeline,

  deleteBranch: (id: string) => request<void>(`/api/branches/${id}`, { method: 'DELETE' }),

  regenerateEvent: async (branchId: string, eventId: string, guidance?: string) =>
    (
      await request<{ event: EventView }>(
        `/api/branches/${branchId}/events/${eventId}/regenerate`,
        { method: 'POST', body: JSON.stringify(guidance ? { guidance } : {}) },
      )
    ).event,

  branchView: async (branchId: string) =>
    BranchView.parse(await request(`/api/branches/${branchId}/view`)),

  expandEvent: async (branchId: string, eventId: string) =>
    (
      await request<{ event: Event }>(`/api/branches/${branchId}/events/${eventId}/expand`, {
        method: 'POST',
      })
    ).event,

  expandEra: async (branchId: string, eraId: string) =>
    (
      await request<{ era: Era }>(`/api/branches/${branchId}/eras/${eraId}/expand`, {
        method: 'POST',
      })
    ).era,

  biography: async (branchId: string, entityId: string) =>
    (
      await request<{ biography: EntityBiography }>(
        `/api/branches/${branchId}/entities/${entityId}/biography`,
        { method: 'POST' },
      )
    ).biography,

  fork: async (branchId: string, body: { eventId: string; name?: string; subPodText?: string }) =>
    ForkResponse.parse(
      await request(`/api/branches/${branchId}/fork`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    ),

  generateArtifact: async (branchId: string, eventId: string, kind: Artifact['kind']) =>
    (
      await request<{ artifact: Artifact }>(
        `/api/branches/${branchId}/events/${eventId}/artifacts`,
        { method: 'POST', body: JSON.stringify({ kind }) },
      )
    ).artifact,

  compare: async (a: string, b: string) =>
    CompareView.parse(await request(`/api/compare?a=${a}&b=${b}`)),

  importAggregate: async (aggregate: unknown) =>
    request<{ timelineId: string }>('/api/import', {
      method: 'POST',
      body: JSON.stringify(aggregate),
    }),

  exportAggregate: async (timelineId: string) =>
    TimelineAggregate.parse(await request(`/api/timelines/${timelineId}/export.json`)),

  exportJsonUrl: (timelineId: string) => `/api/timelines/${timelineId}/export.json`,

  traces: (branchId: string) =>
    request<{ tracing: boolean; retainedRuns: number; traces: TraceSummary[] }>(
      `/api/branches/${branchId}/traces`,
    ),

  trace: (id: string) => request<{ trace: TraceDetail }>(`/api/traces/${id}`),

  /** The counterfactual pulse (v2/M19): one forecast, nothing committed. */
  pulse: async (branchId: string, eventId: string, flip: string) =>
    PulseResponse.parse(
      await request(`/api/branches/${branchId}/events/${eventId}/pulse`, {
        method: 'POST',
        body: JSON.stringify({ flip }),
      }),
    ).pulse,

  /** In-world historiography (v2/M20): fill-once per branch and per event. */
  interpretations: (branchId: string, eventId: string) =>
    request<{
      schools: HistoriographicSchool[]
      interpretations: Interpretation[]
    }>(`/api/branches/${branchId}/events/${eventId}/interpretations`, { method: 'POST' }),

  /** Ask the Archivist (v2/M23). Nothing persisted: the question is the reader's. */
  ask: async (branchId: string, question: string) =>
    AskResponse.parse(
      await request(`/api/branches/${branchId}/ask`, {
        method: 'POST',
        body: JSON.stringify({ question }),
      }),
    ),

  /** The Grand Inquiry (v2/M23): a finding, saved to the shelf. */
  inquiry: async (branchId: string, thesis: string) =>
    (
      await request<{ artifact: Artifact }>(`/api/branches/${branchId}/inquiry`, {
        method: 'POST',
        body: JSON.stringify({ thesis }),
      })
    ).artifact,

  /** What became of one entity on every branch (v2/M19). Pure data, no call. */
  entityFates: async (branchId: string, entityId: string) =>
    EntityFatesResponse.parse(
      await request(`/api/branches/${branchId}/entities/${entityId}/fates`),
    ),
}

/** Engine Room rows (v2/M15); shapes owned by the server's trace routes. */
export interface TraceSummary {
  id: string
  branchId: string
  runId: string | null
  templateId: string
  templateVersion: string
  role: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number | null
  cacheWriteTokens: number | null
  attempts: number
  validationIssues: string[]
  ok: boolean
  error: string | null
  durationMs: number
  createdAt: string
  estimatedUsd: number
}

export interface TraceDetail extends TraceSummary {
  system: string
  prompt: string
  response: string
}
