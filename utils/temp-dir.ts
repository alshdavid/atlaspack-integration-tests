import * as fs from 'node:fs'
import * as path from 'node:path'
import * as url from 'node:url'
import { slugify } from './slugify.ts'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const __tmp = path.normalize(path.join(__dirname, '..', '.tmp'))

export class TempDir {
  #prefix: string
  #path: string

  get path(): string {
    return this.#path
  }

  constructor() {
    this.#prefix = ''
    this.#path = ''
  }

  static async create(prefix: string): Promise<TempDir> {
    const tempDir = new TempDir()
    tempDir.#prefix = slugify(prefix)
    // tempDir.#prefix = `${slugify(prefix)}-${(Math.random() * 10000000).toFixed(0)}`
    tempDir.#path = path.join(__tmp, tempDir.#prefix)
    await fs.promises.mkdir(tempDir.path, { recursive: true })
    return tempDir
  }

  async destroy() {
    await fs.promises.rm(this.#path, { recursive: true, force: true })
  }
}
