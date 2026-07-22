import { Label, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components'

/** The determinism dial: butterfly ← 0 … 100 → railroad. */
export function DialControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Slider
      value={value}
      onChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? 0) : v)}
      minValue={0}
      maxValue={100}
      step={5}
      className="block"
    >
      <div className="flex items-baseline justify-between">
        <Label className="font-data text-[13px] text-ink-faded">determinism</Label>
        <SliderOutput className="font-data text-[13px] text-ink-faded">
          {({ state }) => {
            const v = state.values[0] ?? 0
            const band = v < 34 ? 'butterfly' : v <= 66 ? 'balanced' : 'railroad'
            return `${v} · ${band}`
          }}
        </SliderOutput>
      </div>
      <SliderTrack className="relative mt-2 h-5 w-full">
        <div className="absolute top-1/2 h-[2px] w-full -translate-y-1/2 bg-rule" />
        <SliderThumb className="top-1/2 h-3.5 w-3.5 rounded-full border-2 border-thread bg-paper dragging:bg-thread-wash" />
      </SliderTrack>
      <div className="mt-0.5 flex justify-between font-data text-[11px] text-ink-faded">
        <span>butterfly</span>
        <span>railroad</span>
      </div>
    </Slider>
  )
}
