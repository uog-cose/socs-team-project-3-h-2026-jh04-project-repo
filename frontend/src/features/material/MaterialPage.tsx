
import { List, Select, Stack, Text, Title } from '@mantine/core'

import { useCatalog } from '../../api/queries'
import { useSessionStore } from '../../state/sessionStore'

export function MaterialPage() {
  const { data: catalog, isPending, isError } = useCatalog()

  const components = useSessionStore((state) => state.material.components)
  const setComponents = useSessionStore((state) => state.setComponents)

  const selectedPreset = catalog?.presets.find(
    (preset) =>
      preset.components.length === components.length &&
      preset.components.every((type, index) => type === components[index]?.type),
  )

  function handlePresetChange(presetId: string | null) {
    if (!presetId || !catalog) return

    const preset = catalog.presets.find((item) => item.id === presetId)

    if (preset) {
      setComponents(preset.components)
    }
  }

  return (
    <Stack gap="md">
      <Title order={2}>Material configuration</Title>

      <Text c="dimmed">
        Choose a preset to configure the material models used in your experiment.
      </Text>

      {isPending && <Text>Loading material presets...</Text>}

      {isError && (
        <Text c="red">
          Could not load material presets. Please try again.
        </Text>
      )}

      {catalog && (
        <Select
          label="Material preset"
          placeholder="Choose a preset"
          data={catalog.presets.map((preset) => ({
            value: preset.id,
            label: preset.name,
          }))}
          value={selectedPreset?.id ?? null}
          onChange={handlePresetChange}
          disabled={catalog.presets.length === 0}
        />
      )}

      <Title order={3}>Current components</Title>

      {components.length === 0 ? (
        <Text c="dimmed">
          No material components selected. Choose a preset above.
        </Text>
      ) : (
        <List>
          {components.map((component) => {
            const material = catalog?.materials.find(
              (item) => item.type === component.type,
            )

            return (
              <List.Item key={component.id}>
                {material?.name ?? component.type}
              </List.Item>
            )
          })}
        </List>
      )}
    </Stack>
  )
}
