import { List, Stack, Text } from '@mantine/core'
import classes from './SectionPlaceholder.module.css'

interface SectionPlaceholderProps {
  items: string[]
}

/** Stand-in for a section whose feature issues haven't landed yet. */
export function SectionPlaceholder({ items }: SectionPlaceholderProps) {
  return (
    <Stack className={classes.root} gap="xs">
      <Text className={classes.eyebrow}>Coming next</Text>
      <List spacing={6} size="sm" c="dimmed">
        {items.map((item) => (
          <List.Item key={item}>{item}</List.Item>
        ))}
      </List>
    </Stack>
  )
}
