import * as fs from 'node:fs'
import * as path from 'node:path'
import glob from 'glob'
import yaml from 'yaml'

const out = '/mnt/data/Development/atlassian-labs/atlaspack-integration-tests'
const base = '/mnt/data/Development/atlassian-labs/atlaspack/packages/core/integration-tests/test/integration'
for (const dir of fs.readdirSync(base)) {
  const fixDir = path.join(base, dir)
  console.log(fixDir)

  if (!fs.statSync(fixDir).isDirectory()) {
    console.log('not a dir', fixDir)
    continue
  }

  const fixture = {
    ['package.json']: {
      type: 'module'
    },
    ['yarn.lock']: undefined
  }

  for (const entry of glob.sync('**/*', { cwd: fixDir })) {
    const entryAbs = path.join(fixDir, entry)

    if (entry === 'package.json') {
      fixture['package.json'] = {
        ...fixture['package.json'],
        ...JSON.parse(fs.readFileSync(entryAbs, 'utf8')),
      }
      continue
    }

    if (entry === 'yarn.lock') {
      fixture['yarn.lock'] = fs.readFileSync(entryAbs, 'utf8')
      continue
    }

    if (!fs.statSync(entryAbs).isFile()) {
      console.log('not a dir', fixDir)
      continue
    }

    if (
      entryAbs.endsWith('.png') ||
      entryAbs.endsWith('.ttf') ||
      entryAbs.endsWith('.webp') ||
      entryAbs.endsWith('.jpg') ||
      entryAbs.endsWith('.jpeg')
    ) {
      fs.cpSync(entryAbs, path.join(out, 'assets', entry))
      fixture[entry] = `file://<root>/assets/${entry}`
    } else {
      fixture[entry] = fs.readFileSync(entryAbs, 'utf8')
    }

  }

  if (fs.existsSync(path.join(out, '_atlaspack_fixtures', `${dir}.yml`))) {
    fs.rmSync(path.join(out, '_atlaspack_fixtures', `${dir}.yml`), {recursive: true})
  }
  fs.writeFileSync(path.join(out, '_atlaspack_fixtures', `${dir}.yml`), yaml.stringify(fixture), 'utf8')
}
