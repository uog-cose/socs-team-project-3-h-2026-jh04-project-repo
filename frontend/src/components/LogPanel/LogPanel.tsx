import { ActionIcon, Badge, Group, ScrollArea, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import { useLogStore } from '../../state/logStore'
import classes from './LogPanel.module.css'

interface LogPanelProps {
  id?: string
  opened: boolean
  onToggle: () => void
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function LogPanel({ id, opened, onToggle }: LogPanelProps) {
  const entries = useLogStore((s) => s.entries)
  const clear = useLogStore((s) => s.clear)
  const viewport = useRef<HTMLDivElement>(null)
  const warnings = entries.filter((e) => e.level === 'warning').length
  const errors = entries.filter((e) => e.level === 'error').length

  useEffect(() => {
    if (opened) viewport.current?.scrollTo({ top: viewport.current.scrollHeight })
  }, [opened, entries.length])

  return (
    <div id={id} className={classes.root}>
      <Group className={classes.bar} justify="space-between" wrap="nowrap">
        <UnstyledButton className={classes.toggle} onClick={onToggle} aria-expanded={opened}>
          <span className={classes.label}>Log</span>
          <Text span size="xs" c="dark.2">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
          {warnings > 0 && (
            <Badge size="xs" color="yellow" variant="light">
              {warnings} {warnings === 1 ? 'warning' : 'warnings'}
            </Badge>
          )}
          {errors > 0 && (
            <Badge size="xs" color="red" variant="light">
              {errors} {errors === 1 ? 'error' : 'errors'}
            </Badge>
          )}
        </UnstyledButton>
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            variant="subtle"
            color="dark.1"
            onClick={clear}
            disabled={entries.length === 0}
            aria-label="Clear log"
          >
            <IconTrash size={15} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="dark.1"
            onClick={onToggle}
            aria-label={opened ? 'Collapse log' : 'Expand log'}
          >
            {opened ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
          </ActionIcon>
        </Group>
      </Group>

      {opened && (
        <ScrollArea className={classes.body} viewportRef={viewport} type="auto">
          {entries.length === 0 ? (
            <Text className={classes.empty}>
              No output yet. pyMechT console output and warnings will appear here.
            </Text>
          ) : (
            <ol className={classes.entries}>
              {entries.map((entry) => (
                <li key={entry.id} className={classes.entry} data-level={entry.level}>
                  <time className={classes.time}>{timeFormat.format(entry.time)}</time>
                  <span className={classes.level}>{entry.level}</span>
                  <span className={classes.message}>{entry.message}</span>
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      )}
    </div>
  )
}
