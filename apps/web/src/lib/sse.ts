/** Minimal SSE-over-fetch reader for the generation stream (§4.8). */
export interface SseFrame {
  event: string
  data: unknown
}

function parseFrame(block: string): SseFrame | null {
  let event = ''
  let data = ''
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  if (!event || !data) return null
  try {
    return { event, data: JSON.parse(data) }
  } catch {
    return null
  }
}

export async function* streamGeneration(
  branchId: string,
  signal?: AbortSignal,
): AsyncGenerator<SseFrame> {
  const res = await fetch(`/api/branches/${branchId}/generate`, { method: 'POST', signal })
  if (!res.ok || !res.body) {
    throw new Error(`generation failed to start (${res.status})`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = parseFrame(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (frame) yield frame
        boundary = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}
