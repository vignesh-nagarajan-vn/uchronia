import { LENSES, type Lens } from '@uchronia/schemas'
import { useState } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'

/**
 * Commission the chronicle (v2/M21). Compilation is free and repeatable, so
 * the dialog offers real choices rather than one blessed export: which
 * registers the book carries, and how heavily it is illustrated.
 */
export function CommissionDialog({
  branchId,
  title,
  onClose,
}: {
  branchId: string
  title: string
  onClose: () => void
}) {
  const [lenses, setLenses] = useState<Lens[]>([])
  const [plates, setPlates] = useState(2)

  const query = new URLSearchParams()
  if (lenses.length > 0) query.set('lenses', lenses.join(','))
  query.set('plates', String(plates))
  const suffix = `?${query.toString()}`

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
        <Dialog className="sheet p-5 outline-none" data-testid="commission-dialog">
          <Heading slot="title" className="text-[18px] font-semibold">
            Commission the chronicle
          </Heading>
          <p className="mt-1 text-[14px] text-ink-faded">
            “{title}” compiled into a book: a frontispiece, a chapter per era, artifacts set as
            plates, and appendices for the lives, the convergences, and the index.
          </p>

          <fieldset className="mt-4">
            <legend className="font-data text-[13px] text-ink-faded">
              registers to carry (none selected means all of them)
            </legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {LENSES.map((lens) => {
                const active = lenses.includes(lens)
                return (
                  <button
                    key={lens}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setLenses((prev) =>
                        active ? prev.filter((l) => l !== lens) : [...prev, lens],
                      )
                    }
                    className={`rounded-[2px] border px-2 py-0.5 font-data text-[12px] ${
                      active
                        ? 'border-ink-faded text-ink'
                        : 'border-rule text-ink-faded hover:text-ink'
                    }`}
                  >
                    {lens}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-4">
            <label htmlFor="plates" className="font-data text-[13px] text-ink-faded">
              plates per chapter: {plates === 0 ? 'none' : plates}
            </label>
            <input
              id="plates"
              type="range"
              min={0}
              max={4}
              value={plates}
              onChange={(e) => setPlates(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--color-thread)]"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={`/api/branches/${branchId}/book.html${suffix}`}
              target="_blank"
              rel="noreferrer"
              data-testid="commission-html"
              className="rounded-[2px] border border-thread px-3 py-1.5 text-[15px] font-medium text-thread hover:bg-thread-wash"
            >
              Read it
            </a>
            <a
              href={`/api/branches/${branchId}/book.epub${suffix}`}
              download
              data-testid="commission-epub"
              className="rounded-[2px] border border-rule px-3 py-1.5 text-[15px] text-ink-faded hover:bg-paper-raised hover:text-ink"
            >
              Download EPUB
            </a>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto text-[14px] text-ink-faded hover:text-ink"
            >
              Close
            </button>
          </div>
          <p className="mt-4 font-data text-[11.5px] leading-snug text-ink-faded">
            Nothing is generated here: the book arranges history this branch has already derived.
            Expand an era first if you want it to read at greater length.
          </p>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
