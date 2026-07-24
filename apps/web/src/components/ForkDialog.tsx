import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EventView } from '@uchronia/schemas'
import { useState } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useNavigate } from 'react-router'
import { api } from '../lib/api.js'

/** Fork here → Forked. The action keeps its name through the flow (§7.7). */
export function ForkDialog({
  event,
  branchId,
  timelineId,
  onClose,
}: {
  event: EventView
  branchId: string
  timelineId: string
  onClose: () => void
}) {
  const [subPod, setSubPod] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const fork = useMutation({
    mutationFn: () =>
      api.fork(branchId, {
        eventId: event.id,
        ...(subPod.trim().length >= 4 ? { subPodText: subPod.trim() } : {}),
      }),
    onSuccess: ({ branch }) => {
      void queryClient.invalidateQueries({ queryKey: ['timelines'] })
      // The parent's branches[] now lists the child — delta and compare views
      // read it from this cache entry, so it must not go stale.
      void queryClient.invalidateQueries({ queryKey: ['branch-view', branchId] })
      onClose()
      navigate(`/t/${timelineId}/b/${branch.id}?derive=1`)
    },
  })

  return (
    <ModalOverlay
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
    >
      <Modal className="w-full max-w-md">
        <Dialog className="sheet p-5 outline-none">
          <Heading slot="title" className="text-[18px] font-semibold">
            Fork here
          </Heading>
          <p className="mt-1 text-[14px] text-ink-faded">
            A new branch will share all history up to{' '}
            <span className="text-ink">“{event.title}”</span> ({event.date.label}) and diverge after
            it.
          </p>
          <label htmlFor="subpod" className="mt-4 block font-data text-[13px] text-ink-faded">
            sub-divergence (optional)
          </label>
          <textarea
            id="subpod"
            rows={2}
            value={subPod}
            onChange={(e) => setSubPod(e.target.value)}
            placeholder="What if this person had died here?"
            className="mt-1 w-full resize-none rounded-[2px] border border-rule bg-paper px-3 py-2 text-[15px] placeholder:text-ink-faded/70"
          />
          {fork.isError && (
            <p className="mt-2 font-data text-[12px] text-thread">
              The fork failed: {(fork.error as Error).message}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper"
            >
              Leave it
            </button>
            <button
              type="button"
              onClick={() => fork.mutate()}
              disabled={fork.isPending}
              className="rounded-[2px] border border-thread px-3 py-1 text-[14px] font-medium text-thread hover:bg-thread-wash disabled:opacity-40"
            >
              {fork.isPending ? 'Forking…' : 'Fork here'}
            </button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
