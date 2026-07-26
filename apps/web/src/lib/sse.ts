/** Minimal SSE-over-fetch reader for the generation stream (§4.8). */
export interface SseFrame {
  event: string
  data: unknown
}

function parseFrame(block: string): SseFrame | null {
  let event = ''
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    // Per the SSE spec, multi-line data fields join with a newline.
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  const data = dataLines.join('\n')
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
  // Frame boundaries tolerate CRLF normalization by intermediaries.
  const boundaryPattern = /\r?\n\r?\n/
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.match(boundaryPattern)
      while (boundary?.index !== undefined) {
        const frame = parseFrame(buffer.slice(0, boundary.index))
        buffer = buffer.slice(boundary.index + boundary[0].length)
        if (frame) yield frame
        boundary = buffer.match(boundaryPattern)
      }
    }
  } finally {
    // A consumer that breaks out early must close the HTTP body, not just
    // release the lock - otherwise the connection leaks.
    try {
      await reader.cancel()
    } catch {}
    reader.releaseLock()
  }
}
