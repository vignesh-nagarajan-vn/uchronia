import type { DialAxes } from '@uchronia/schemas'
import { useState } from 'react'
import {
  Button,
  Label,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  Switch,
} from 'react-aria-components'

/** Axis defaults derive from the master dial; this mirrors core's deriveAxes. */
export function deriveAxes(dial: number): DialAxes {
  return {
    greatPersonWeight: 100 - dial,
    techVolatility: 100 - dial,
    culturalDrift: 100 - dial,
    chaosEvents: dial < 50,
  }
}

const AXES: ReadonlyArray<{
  key: Exclude<keyof DialAxes, 'chaosEvents'>
  label: string
  low: string
  high: string
}> = [
  {
    key: 'greatPersonWeight',
    label: 'great persons',
    low: 'structures act',
    high: 'individuals act',
  },
  { key: 'techVolatility', label: 'technology', low: 'plods', high: 'leaps and stalls' },
  { key: 'culturalDrift', label: 'culture', low: 'holds fast', high: 'churns' },
]

function AxisSlider({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string
  low: string
  high: string
  value: number
  onChange: (v: number) => void
}) {
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
        <Label className="font-data text-[12px] text-ink-faded">{label}</Label>
        <SliderOutput className="font-data text-[11px] text-ink-faded">
          {({ state }) => {
            const v = state.values[0] ?? 0
            return v <= 33 ? low : v >= 67 ? high : 'balanced'
          }}
        </SliderOutput>
      </div>
      <SliderTrack className="relative mt-1 h-4 w-full">
        <div className="absolute top-1/2 h-[1px] w-full -translate-y-1/2 bg-rule" />
        <SliderThumb className="top-1/2 h-3 w-3 rounded-full border-2 border-ink-faded bg-paper dragging:bg-thread-wash" />
      </SliderTrack>
    </Slider>
  )
}

export interface DialControlProps {
  value: number
  onChange: (v: number) => void
  /** Explicit axis overrides (v2/M17); null = every axis follows the master dial. */
  axes?: DialAxes | null
  onAxesChange?: (axes: DialAxes | null) => void
}

/**
 * The determinism dial: butterfly ← 0 … 100 → railroad. Behind it (v2/M17) sit
 * four axes the master dial normally drives; the flyout lets a reader take any
 * of them off the master and set it by hand, and hand them all back again.
 */
export function DialControl({ value, onChange, axes, onAxesChange }: DialControlProps) {
  const [open, setOpen] = useState(false)
  const effective = axes ?? deriveAxes(value)
  const set = (patch: Partial<DialAxes>) => onAxesChange?.({ ...effective, ...patch })

  return (
    <div>
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

      {onAxesChange && (
        <>
          <Button
            onPress={() => setOpen((o) => !o)}
            aria-expanded={open}
            data-testid="dial-axes-toggle"
            className="mt-1.5 font-data text-[11.5px] text-ink-faded underline decoration-rule underline-offset-2 hover:text-ink"
          >
            {open ? 'hide the axes' : axes ? 'axes (set by hand)' : 'axes'}
          </Button>
          {open && (
            <div
              className="mt-2 space-y-3 rounded-[2px] border border-rule bg-paper-raised p-3"
              data-testid="dial-axes-flyout"
            >
              <p className="font-data text-[11.5px] leading-snug text-ink-faded">
                Each axis follows the determinism dial until you move it. Then it is yours.
              </p>
              {AXES.map((axis) => (
                <AxisSlider
                  key={axis.key}
                  label={axis.label}
                  low={axis.low}
                  high={axis.high}
                  value={effective[axis.key]}
                  onChange={(v) => set({ [axis.key]: v })}
                />
              ))}
              <Switch
                isSelected={effective.chaosEvents}
                onChange={(on) => set({ chaosEvents: on })}
                className="flex items-center gap-2 font-data text-[12px] text-ink-faded"
              >
                <span className="inline-flex h-3.5 w-6 items-center rounded-full border border-rule bg-paper px-[2px] selected:border-thread">
                  <span className="h-2 w-2 rounded-full bg-ink-faded transition-transform group-selected:translate-x-[10px] selected:bg-thread selected:translate-x-[10px]" />
                </span>
                external shocks (plagues, storms, assassins)
              </Switch>
              {axes && (
                <Button
                  onPress={() => onAxesChange(null)}
                  className="font-data text-[11.5px] text-ink-faded underline decoration-rule underline-offset-2 hover:text-ink"
                >
                  hand them back to the dial
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
