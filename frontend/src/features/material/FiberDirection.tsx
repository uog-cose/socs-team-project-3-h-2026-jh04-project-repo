
import { NumberInput, SegmentedControl, Stack, Text } from '@mantine/core'
import type { FiberConfig } from '../../api/types'

type FiberDirectionProps = {
  fiber: FiberConfig | null
  referenceAxis: 'x' | 'circumferential'
  onChange: (fiber: FiberConfig) => void
}

export function FiberDirection({
  fiber,
  referenceAxis,
  onChange,
}: FiberDirectionProps) {
  const mode = fiber?.mode ?? 'single'
  const angleDeg = fiber?.angleDeg ?? 0

  const angle = (angleDeg * Math.PI) / 180
  const centre = 100
  const length = 65

  function updateFiber(patch: Partial<FiberConfig>) {
    onChange({
      mode,
      angleDeg,
      ...patch,
    })
  }

  function getLine(angleInRadians: number) {
    const dx = length * Math.cos(angleInRadians)
    const dy = length * Math.sin(angleInRadians)

    return {
      x1: centre - dx,
      y1: centre + dy,
      x2: centre + dx,
      y2: centre - dy,
    }
  }

  const firstLine = getLine(angle)

  return (
    <Stack gap="xs" mt="sm">
      <Text fw={500}>Fiber direction</Text>

      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(value) =>
          updateFiber({ mode: value as FiberConfig['mode'] })
        }
        data={[
          { label: 'Single', value: 'single' },
          { label: 'Symmetric ± pair', value: 'symmetric' },
        ]}
      />

      <NumberInput
        label={`Angle from ${referenceAxis} axis (degrees)`}
        value={angleDeg}
        onChange={(value) => {
          const nextAngle = Number(value)
          if (Number.isFinite(nextAngle)) {
            updateFiber({ angleDeg: nextAngle })
          }
        }}
      />

      <svg
        viewBox="0 0 200 200"
        width="200"
        height="200"
        role="img"
        aria-label={`Fiber direction at ${angleDeg} degrees from the ${referenceAxis} axis`}
      >
        <line
          x1="20"
          y1={centre}
          x2="180"
          y2={centre}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        <line
          x1={centre}
          y1="20"
          x2={centre}
          y2="180"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />

        <line
          {...firstLine}
          stroke="#228be6"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {mode === 'symmetric' && (
          <line
            {...getLine(-angle)}
            stroke="#228be6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        <text x="180" y="118" fontSize="10" textAnchor="end" fill="currentColor">
          {referenceAxis}
        </text>
      </svg>

      <Text size="xs" c="dimmed">
        {mode === 'single'
          ? `One fiber direction at ${angleDeg}°`
          : `Two symmetric fiber directions at +${angleDeg}° and -${angleDeg}°`}
      </Text>
    </Stack>
  )
}
