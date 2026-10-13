import fs from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Keeps the icon set on disk. The app fetches the folder on start, and Save writes it back:
 * `catalogue.json` holds the design values, one `.svg` per icon holds its artwork. The
 * folder is the source of truth for artwork, so a file dropped in by hand shows up in the
 * catalogue on the next load.
 */
function iconLibrary(): Plugin {
  const folder = path.resolve(process.cwd(), 'icons')
  const catalogue = path.join(folder, 'catalogue.json')

  const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-')

  async function readBody(request: IncomingMessage) {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(chunk as Buffer)
    return Buffer.concat(chunks).toString('utf8')
  }

  async function readFolder() {
    const files: Record<string, string> = {}
    for (const entry of await fs.readdir(folder).catch(() => [] as string[])) {
      if (!entry.toLowerCase().endsWith('.svg')) continue
      files[entry] = await fs.readFile(path.join(folder, entry), 'utf8')
    }
    const stored = await fs.readFile(catalogue, 'utf8').catch(() => null)
    return { catalogue: stored ? JSON.parse(stored) : null, files }
  }

  async function writeFolder(payload: { icons?: Record<string, unknown>[]; group?: unknown; files?: Record<string, string> }) {
    await fs.mkdir(folder, { recursive: true })

    const previous = await fs.readFile(catalogue, 'utf8').catch(() => null)
    const owned = new Set<string>()
    if (previous) {
      for (const icon of JSON.parse(previous).icons ?? []) {
        if (icon.artworkFile) owned.add(icon.artworkFile as string)
      }
    }

    const files = payload.files ?? {}
    for (const [name, source] of Object.entries(files)) {
      await fs.writeFile(path.join(folder, safeName(name)), source)
    }
    await fs.writeFile(
      catalogue,
      `${JSON.stringify({ version: 1, icons: payload.icons ?? [], group: payload.group ?? null }, null, 2)}\n`,
    )
    // Artwork the app wrote before, and no longer refers to, was deleted in the app.
    for (const name of owned) {
      if (!(name in files)) await fs.rm(path.join(folder, safeName(name)), { force: true })
    }
  }

  function serve(middlewares: { use: (route: string, handler: (request: IncomingMessage, response: ServerResponse) => void) => void }) {
    middlewares.use('/api/library', async (request, response) => {
      response.setHeader('Content-Type', 'application/json')
      try {
        if (request.method === 'GET') {
          response.end(JSON.stringify(await readFolder()))
          return
        }
        if (request.method === 'PUT') {
          await writeFolder(JSON.parse(await readBody(request)))
          response.end(JSON.stringify({ ok: true }))
          return
        }
        response.statusCode = 405
        response.end(JSON.stringify({ error: 'Use GET or PUT' }))
      } catch (error) {
        response.statusCode = 500
        response.end(JSON.stringify({ error: String(error) }))
      }
    })
  }

  return {
    name: 'super-icon-studio:icon-library',
    // A build has no middleware behind it, so it carries a snapshot of the folder; the app
    // reads it when `/api/library` is not there, and the saved set survives the build.
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'icons.json',
        source: JSON.stringify(await readFolder()),
      })
    },
    configureServer(server) {
      serve(server.middlewares)
    },
    configurePreviewServer(server) {
      serve(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), iconLibrary()],
})
