
import {
  Alert,
  Card,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'

import { useCatalog } from '../../api/queries'
import { useSessionStore } from '../../state/sessionStore'
import { UnitSettings } from '../units/UnitSettings'

import type { CatalogExperiment } from '../../api/types'

function ExperimentSchematic({ type }: { type: string }) {
  const blue = 'var(--mantine-color-blue-6)'
  const muted = 'var(--mantine-color-dimmed)'

  if (type === 'uniaxial') {
    return (
      <svg viewBox="0 0 240 110" width="100%" height="110">
        <rect x="70" y="38" width="100" height="34" rx="4"
          fill={blue} fillOpacity="0.15" stroke={blue} strokeWidth="2" />
        <path d="M15 55 H65 M175 55 H225" stroke={muted} strokeWidth="2" />
        <path d="M55 47 L65 55 L55 63 M185 47 L175 55 L185 63"
          fill="none" stroke={muted} strokeWidth="2" />
        <path d="M15 55 H5 M225 55 H235" stroke={muted} strokeWidth="2" />
        <text x="120" y="25" textAnchor="middle" fontSize="11" fill="currentColor">
          Pull along x
        </text>
      </svg>
    )
  }

  if (type === 'biaxial') {
    return (
      <svg viewBox="0 0 240 110" width="100%" height="110">
        <rect x="75" y="22" width="90" height="66" rx="3"
          fill={blue} fillOpacity="0.15" stroke={blue} strokeWidth="2" />
        <path d="M15 55 H70 M170 55 H225 M120 5 V17 M120 105 V93"
          stroke={muted} strokeWidth="2" />
        <path d="M60 48 L70 55 L60 62 M180 48 L170 55 L180 62
          M113 13 L120 17 L127 13 M113 97 L120 93 L127 97"
          fill="none" stroke={muted} strokeWidth="2" />
        <text x="120" y="60" textAnchor="middle" fontSize="11" fill="currentColor">
          Sheet
        </text>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 240 110" width="100%" height="110">
      <ellipse cx="120" cy="22" rx="43" ry="13"
        fill={blue} fillOpacity="0.15" stroke={blue} strokeWidth="2" />
      <path d="M77 22 V85 M163 22 V85" stroke={blue} strokeWidth="2" />
      <ellipse cx="120" cy="85" rx="43" ry="13"
        fill={blue} fillOpacity="0.15" stroke={blue} strokeWidth="2" />
      <path d="M120 55 V5 M114 12 L120 5 L126 12"
        fill="none" stroke={muted} strokeWidth="2" />
      <text x="120" y="58" textAnchor="middle" fontSize="11" fill="currentColor">
        Tube
      </text>
    </svg>
  )
}

function ExperimentCard({
  experiment,
  selected,
  onSelect,
}: {
  experiment: CatalogExperiment
  selected: boolean
  onSelect: () => void
}) {
  return (
    <UnstyledButton
      onClick={onSelect}
      aria-pressed={selected}
      style={{ width: '100%', textAlign: 'left' }}
    >
      <Card
        withBorder
        radius="md"
        padding="md"
        h="100%"
        style={{
          borderColor: selected ? 'var(--mantine-color-blue-6)' : undefined,
          borderWidth: selected ? 2 : 1,
        }}
      >
        <Stack gap="xs">
          <ExperimentSchematic type={experiment.type} />
          <Text fw={600}>{experiment.name}</Text>
          <Text size="sm" c="dimmed">
            {experiment.description}
          </Text>
          {selected && (
            <Text size="xs" c="blue" fw={600}>
              Selected
            </Text>
          )}
        </Stack>
      </Card>
    </UnstyledButton>
  )
}

export function ExperimentPage() {
  const { data: catalog, isPending, isError } = useCatalog()

  const experimentConfig = useSessionStore((state) => state.experiment)
  const setExperiment = useSessionStore((state) => state.setExperiment)
  const setMeasures = useSessionStore((state) => state.setMeasures)

  const selectedExperiment = catalog?.experiments.find(
    (experiment) => experiment.type === experimentConfig.type,
  )

  function handleExperimentChange(experiment: CatalogExperiment) {
    const inputMeasure = experiment.inputMeasures.some(
      (measure) => measure.id === experimentConfig.inputMeasure,
    )
      ? experimentConfig.inputMeasure
      : experiment.inputMeasures[0]?.id ?? ''

    const outputMeasure = experiment.outputMeasures.some(
      (measure) => measure.id === experimentConfig.outputMeasure,
    )
      ? experimentConfig.outputMeasure
      : experiment.outputMeasures[0]?.id ?? ''

    setExperiment({
      type: experiment.type,
      inputMeasure,
      outputMeasure,
    })
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Experiment</Title>

      <Text c="dimmed">
        Choose the test and what is measured.
      </Text>

      {isPending && <Text>Loading experiments...</Text>}

      {isError && (
        <Alert color="red">
          Could not load experiments. Please try again.
        </Alert>
      )}

      {catalog && (
        <>
          <Title order={3}>Choose your experiment</Title>

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {catalog.experiments.map((experiment) => (
              <ExperimentCard
                key={experiment.type}
                experiment={experiment}
                selected={experiment.type === experimentConfig.type}
                onSelect={() => handleExperimentChange(experiment)}
              />
            ))}
          </SimpleGrid>

          {selectedExperiment && (
            <>
              <Title order={3}>Input and output measures</Title>

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select
                  label="Input measure"
                  data={selectedExperiment.inputMeasures.map((measure) => ({
                    value: measure.id,
                    label: measure.label,
                  }))}
                  value={experimentConfig.inputMeasure}
                  onChange={(value) => {
                    if (value) setMeasures({ inputMeasure: value })
                  }}
                  allowDeselect={false}
                />

                <Select
                  label="Output measure"
                  data={selectedExperiment.outputMeasures.map((measure) => ({
                    value: measure.id,
                    label: measure.label,
                  }))}
                  value={experimentConfig.outputMeasure}
                  onChange={(value) => {
                    if (value) setMeasures({ outputMeasure: value })
                  }}
                  allowDeselect={false}
                />
              </SimpleGrid>
            </>
          )}
        </>
      )}

      <UnitSettings />
    </Stack>
  )
}
