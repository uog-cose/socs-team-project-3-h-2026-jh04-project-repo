
import { Stack } from '@mantine/core'

import { SectionPlaceholder } from '../../components/SectionPlaceholder/SectionPlaceholder'
import { UnitSettings } from '../units/UnitSettings'

export function ExperimentPage() {
  return (
    <Stack gap="lg">
      <UnitSettings />

      <SectionPlaceholder
        items={[
          'Experiment cards with schematics (#10)',
          'Input and output measures (#10)',
        ]}
      />
    </Stack>
  )
}
