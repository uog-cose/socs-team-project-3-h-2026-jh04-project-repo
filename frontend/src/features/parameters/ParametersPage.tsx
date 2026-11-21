import { Stack } from '@mantine/core'

import { SectionPlaceholder } from '../../components/SectionPlaceholder/SectionPlaceholder'
import { ParameterCsv } from './ParameterCsv'

export function ParametersPage() {
  return (
    <Stack gap="lg">
      <ParameterCsv />
      <SectionPlaceholder
        items={[
          'Parameter table with bounds and validation (#15)',
          'Sync with the material and experiment (#16)',
        ]}
      />
    </Stack>
  )
}
