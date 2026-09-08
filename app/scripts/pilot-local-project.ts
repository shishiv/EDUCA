import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const portOffsets = new Map([
  [54321, 0], [54322, 1], [54323, 2], [54324, 3],
  [54320, 4], [54327, 6], [54328, 7], [54329, 8],
])

/** Materializes a frozen canonical schema with all ports inside one leased range. */
export function createPilotLocalProject(repo: string, project: string, portBase: number, origin?: string): void {
  if (!Number.isInteger(portBase) || portBase < 1024 || portBase > 65526) {
    throw new Error('PILOT_LOCAL_PROJECT_PORT_INVALID')
  }
  if (path.resolve(repo) === path.resolve(project)) throw new Error('PILOT_LOCAL_PROJECT_MUST_BE_ISOLATED')
  let config = readFileSync(path.join(repo, 'supabase/config.toml'), 'utf8')
  config = config.replace(/^(port|shadow_port|vector_port) = (\d+)$/gm, (line, key: string, value: string) => {
    const offset = portOffsets.get(Number(value))
    return offset === undefined ? line : `${key} = ${portBase + offset}`
  })
  if (origin) config = withLocalAuthOrigin(config, origin)
  const destination = path.join(project, 'supabase')
  mkdirSync(destination, { recursive: true })
  cpSync(path.join(repo, 'supabase/migrations'), path.join(destination, 'migrations'), {
    recursive: true, force: false, errorOnExist: true,
  })
  writeFileSync(path.join(destination, 'config.toml'), config)
}

function withLocalAuthOrigin(config: string, origin: string): string {
  const url = new URL(origin)
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost')
  if (!local || url.username || url.password || url.origin !== origin) throw new Error('PILOT_LOCAL_PROJECT_ORIGIN_INVALID')
  return config.replace(/^site_url = .*$/m, `site_url = ${JSON.stringify(origin)}`)
    .replace(/^additional_redirect_urls = .*$/m, `additional_redirect_urls = ${JSON.stringify([origin])}`)
}

if (require.main === module) {
  const [repo, project, base, origin] = process.argv.slice(2)
  if (!repo || !project || !base) throw new Error('PILOT_LOCAL_PROJECT_ARGUMENTS_REQUIRED')
  createPilotLocalProject(repo, project, Number(base), origin)
}
