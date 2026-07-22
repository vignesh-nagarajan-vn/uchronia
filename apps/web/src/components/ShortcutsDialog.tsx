import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'

const SHORTCUTS: Array<[string, string]> = [
  ['j / k', 'walk events'],
  ['enter', 'open event'],
  ['f', 'fork at the focused event'],
  ['l', 'cycle lens filter'],
  ['b', 'delta view'],
  ['c', 'compare against the record'],
  ['e', 'export JSON'],
  ['?', 'this sheet'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
    >
      <Modal className="w-full max-w-xs">
        <Dialog className="sheet p-5 outline-none">
          <Heading slot="title" className="text-[16px] font-semibold">
            The keyboard
          </Heading>
          <dl className="mt-3 space-y-1.5">
            {SHORTCUTS.map(([key, what]) => (
              <div key={key} className="flex items-baseline justify-between gap-4">
                <dt className="font-data text-[13px] text-thread">{key}</dt>
                <dd className="text-[14px] text-ink-faded">{what}</dd>
              </div>
            ))}
          </dl>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
