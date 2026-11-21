import { Alert, Button, FileButton, Group, List, Stack } from '@mantine/core'
import { IconDownload, IconUpload } from '@tabler/icons-react'
import { useState } from 'react'

import { useLogStore } from '../../state/logStore'
import { useSessionStore } from '../../state/sessionStore'
import { applyParametersCsv, ParameterCsvError, parametersToCsv } from './csv'

type ImportResult =
  | { kind: 'error'; message: string }
  | { kind: 'done'; fileName: string; unknownKeys: string[]; missingKeys: string[] }

function download(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function ParameterCsv() {
  const parameters = useSessionStore((state) => state.parameters)
  const setParameters = useSessionStore((state) => state.setParameters)
  const log = useLogStore((state) => state.append)
  const [result, setResult] = useState<ImportResult | null>(null)

  function handleExport() {
    download(parametersToCsv(parameters), 'parameters.csv')
    log('info', `Exported ${parameters.length} parameters to parameters.csv.`)
  }

  async function handleImport(file: File | null) {
    if (!file) return
    try {
      const imported = applyParametersCsv(await file.text(), parameters)
      setParameters(imported.rows)
      setResult({ kind: 'done', fileName: file.name, ...imported })
      log('info', `Imported parameters from ${file.name}.`)
      if (imported.unknownKeys.length > 0) {
        log('warning', `Ignored unknown parameters: ${imported.unknownKeys.join(', ')}.`)
      }
      if (imported.missingKeys.length > 0) {
        log(
          'warning',
          `Not in ${file.name}, kept current values: ${imported.missingKeys.join(', ')}.`,
        )
      }
    } catch (error) {
      if (!(error instanceof ParameterCsvError)) throw error
      setResult({ kind: 'error', message: error.message })
      log('error', `Could not import ${file.name}: ${error.message}`)
    }
  }

  return (
    <Stack gap="sm">
      <Group gap="sm">
        <FileButton onChange={handleImport} accept=".csv,text/csv">
          {(props) => (
            <Button {...props} variant="default" leftSection={<IconUpload size={16} />}>
              Import CSV
            </Button>
          )}
        </FileButton>
        <Button
          variant="default"
          leftSection={<IconDownload size={16} />}
          onClick={handleExport}
          disabled={parameters.length === 0}
        >
          Export CSV
        </Button>
      </Group>

      {result?.kind === 'error' && (
        <Alert color="red" title="Import failed" onClose={() => setResult(null)} withCloseButton>
          {result.message}
        </Alert>
      )}

      {result?.kind === 'done' &&
        (result.unknownKeys.length > 0 || result.missingKeys.length > 0 ? (
          <Alert
            color="yellow"
            title={`Imported ${result.fileName} with warnings`}
            onClose={() => setResult(null)}
            withCloseButton
          >
            <List size="sm">
              {result.unknownKeys.length > 0 && (
                <List.Item>
                  Ignored, not in the current model: {result.unknownKeys.join(', ')}
                </List.Item>
              )}
              {result.missingKeys.length > 0 && (
                <List.Item>
                  Not in the file, kept current values: {result.missingKeys.join(', ')}
                </List.Item>
              )}
            </List>
          </Alert>
        ) : (
          <Alert color="green" onClose={() => setResult(null)} withCloseButton>
            Imported {result.fileName}.
          </Alert>
        ))}
    </Stack>
  )
}
