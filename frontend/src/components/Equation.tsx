
import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface EquationProps {
  latex: string
  displayMode?: boolean
}

export function Equation({
  latex,
  displayMode = true,
}: EquationProps) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: 'warn',
      }),
    [latex, displayMode],
  )

  return (
    <div
      className="equation"
      role="math"
      aria-label={latex}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
