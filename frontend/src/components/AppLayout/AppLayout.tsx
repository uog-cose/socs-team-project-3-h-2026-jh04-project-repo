import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { useState } from 'react'
import { USE_MOCKS } from '../../api/config'
import { useCatalog } from '../../api/queries'
import { sections } from '../../app/sections'
import { LogPanel } from '../LogPanel/LogPanel'
import { Logo } from '../Logo/Logo'
import classes from './AppLayout.module.css'

const LOG_BAR_HEIGHT = 44
const LOG_OPEN_HEIGHT = 220

const pad = (n: number) => String(n).padStart(2, '0')

function ApiStatus() {
  const { status, error } = useCatalog()
  const label = USE_MOCKS ? 'Mock API' : 'Live API'
  const hint =
    status === 'success'
      ? 'Catalog loaded'
      : status === 'error'
        ? `Catalog failed to load: ${error.message}`
        : 'Loading catalog…'
  return (
    <Tooltip label={hint}>
      <span className={`${classes.pill} ${classes.statusPill}`} data-status={status}>
        {label}
        <span className={classes.statusDot} />
      </span>
    </Tooltip>
  )
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  const scheme = useComputedColorScheme('light')
  const next = scheme === 'dark' ? 'light' : 'dark'
  return (
    <ActionIcon
      variant="default"
      size="lg"
      className={classes.roundButton}
      onClick={() => setColorScheme(next)}
      aria-label={`Switch to ${next} mode`}
    >
      {scheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
    </ActionIcon>
  )
}

export function AppLayout() {
  const [navOpened, nav] = useDisclosure(false)
  const [logOpened, log] = useDisclosure(false)
  const [activeId, setActiveId] = useState(sections[0].id)
  const activeIndex = sections.findIndex((s) => s.id === activeId)
  const active = sections[activeIndex]

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: !navOpened } }}
      footer={{ height: logOpened ? LOG_OPEN_HEIGHT : LOG_BAR_HEIGHT }}
      padding="lg"
    >
      <AppShell.Header className={classes.header}>
        <Group h="100%" px={{ base: 'md', sm: 'lg' }} justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={navOpened}
              onClick={nav.toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Logo />
          </Group>
          <Text className={classes.tagline} visibleFrom="md">
            Build, simulate and fit hyperelastic material models.
          </Text>
          <Group gap="xs" wrap="nowrap">
            <ColorSchemeToggle />
            <ApiStatus />
            <UnstyledButton
              className={`${classes.pill} ${classes.lightPill}`}
              visibleFrom="sm"
              onClick={log.toggle}
              aria-expanded={logOpened}
              aria-controls="log-panel"
            >
              Log
              <span className={classes.dots}>
                <span />
                <span />
              </span>
            </UnstyledButton>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className={classes.navbar} p="sm">
        <nav aria-label="Sections">
          {sections.map((section, index) => (
            <UnstyledButton
              key={section.id}
              className={classes.navItem}
              data-active={section.id === activeId || undefined}
              aria-current={section.id === activeId ? 'page' : undefined}
              onClick={() => {
                setActiveId(section.id)
                nav.close()
              }}
            >
              <span className={classes.navIndex}>{pad(index + 1)}</span>
              {section.label}
            </UnstyledButton>
          ))}
        </nav>
      </AppShell.Navbar>

      <AppShell.Main className={classes.main}>
        <div className={classes.page}>
          <Group gap="md" wrap="nowrap" align="center" mb="lg">
            <div className={classes.stepTile} aria-hidden>
              {activeIndex + 1}
            </div>
            <div>
              <Title order={2} className={classes.title}>
                {active.label}
              </Title>
              <Text c="dimmed" size="sm">
                {active.description}
              </Text>
            </div>
          </Group>

          <section className={classes.card} aria-label={active.label}>
            <active.Page />
          </section>

          <div className={classes.markers} aria-hidden>
            <span>+</span>
            <span>+</span>
            <span className={classes.markerCaption}>
              Step {pad(activeIndex + 1)} / {pad(sections.length)}
            </span>
            <span>+</span>
            <span>+</span>
          </div>
        </div>
      </AppShell.Main>

      <AppShell.Footer className={classes.footer}>
        <LogPanel id="log-panel" opened={logOpened} onToggle={log.toggle} />
      </AppShell.Footer>
    </AppShell>
  )
}
