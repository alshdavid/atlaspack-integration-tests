// import '@shigen/polyfill-symbol-dispose'
import * as reporter from 'node:test/reporters'
import { run, before } from 'node:test'
import * as path from 'node:path'
import * as process from 'node:process'
import * as fs from 'node:fs'
import * as url from 'node:url'
import { finished } from 'node:stream'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

void (async function () {
  const [,,pattern] = process.argv

  let exitCode = 0
  const testStream = run({
    globPatterns: [pattern || "tests/**/*.test.ts"],
    concurrency: true,
    only: !!process.env.ONLY,
    isolation: 'process',
  })
    .on('test:fail', () => {
      // @ts-ignore
      exitCode = 1
    })
    .compose(new reporter.spec())

  testStream.pipe(process.stdout)
  await new Promise((res) => finished(testStream, res))
  process.exit(exitCode)
})()
