import { access } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  TINYMCE_PLUGINS,
  TINYMCE_RUNTIME_ASSETS,
  TINYMCE_SCRIPT_SRC,
} from './tinymce-config'

describe('TinyMCE self-hosted runtime', () => {
  it('has a unique plugin list', () => {
    expect(new Set(TINYMCE_PLUGINS).size).toBe(TINYMCE_PLUGINS.length)
  })

  it('keeps every asset loaded by the editor', async () => {
    const publicRoot = path.resolve(process.cwd(), 'public')

    await expect(access(path.join(publicRoot, TINYMCE_SCRIPT_SRC))).resolves.toBeUndefined()
    await expect(
      Promise.all(
        TINYMCE_RUNTIME_ASSETS.map((asset) =>
          access(path.join(publicRoot, 'tinymce', asset))
        )
      )
    ).resolves.toHaveLength(TINYMCE_RUNTIME_ASSETS.length)
  })
})
