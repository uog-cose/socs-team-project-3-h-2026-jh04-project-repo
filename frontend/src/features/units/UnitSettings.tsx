
import { Alert, Select, SimpleGrid, Stack, Text } from '@mantine/core'

import { useSessionStore } from '../../state/sessionStore'

const lengthOptions = [
  { value: 'mm', label: 'Millimetres (mm)' },
  { value: 'cm', label: 'Centimetres (cm)' },
  { value: 'm', label: 'Metres (m)' },
  { value: 'in', label: 'Inches (in)' },
]

const forceOptions = [
  { value: 'N', label: 'Newtons (N)' },
  { value: 'kN', label: 'Kilonewtons (kN)' },
  { value: 'lbf', label: 'Pounds-force (lbf)' },
]

const stressOptions = [
  { value: 'Pa', label: 'Pascals (Pa)' },
  { value: 'kPa', label: 'Kilopascals (kPa)' },
  { value: 'MPa', label: 'Megapascals (MPa)' },
  { value: 'GPa', label: 'Gigapascals (GPa)' },
  { value: 'psi', label: 'Pounds per square inch (psi)' },
]

export function UnitSettings() {
  const units = useSessionStore((state) => state.units)
  const setUnits = useSessionStore((state) => state.setUnits)

  return (
    <Stack gap="md">
      <Text>
        Choose the unit labels for your experiment.
      </Text>

      <Alert color="blue" title="Important">
        pyMechT is unit-free and does not convert values automatically.
        Enter all inputs using a consistent system of units.
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Select
          label="Length"
          data={lengthOptions}
          value={units.length}
          onChange={(value) => {
            if (value) setUnits({ length: value })
          }}
        />

        <Select
          label="Force"
          data={forceOptions}
          value={units.force}
          onChange={(value) => {
            if (value) setUnits({ force: value })
          }}
        />

        <Select
          label="Stress"
          data={stressOptions}
          value={units.stress}
          onChange={(value) => {
            if (value) setUnits({ stress: value })
          }}
        />
      </SimpleGrid>
    </Stack>
  )
}
