/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
if (!bootstrap) throw new Error('Missing initial theme script')

it.each([
  ['dark', false, true],
  ['light', true, false],
  [null, true, true],
  [null, false, false],
  ['invalid', true, true],
])(
  'applies saved theme %s with system dark=%s before React mounts',
  (stored, systemDark, expectedDark) => {
    runInNewContext(bootstrap, {
      document,
      localStorage: { getItem: () => stored },
      window: { matchMedia: () => ({ matches: systemDark }) },
    })
    expect(document.documentElement.classList.contains('dark')).toBe(
      expectedDark,
    )
  },
)

it('applies the system theme before mount when storage access fails', () => {
  runInNewContext(bootstrap, {
    document,
    localStorage: {
      getItem: () => {
        throw new Error('Unavailable')
      },
    },
    window: { matchMedia: () => ({ matches: true }) },
  })
  expect(document.documentElement).toHaveClass('dark')
})
