import fs from 'fs'
import url from 'url'
import path from 'path'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const TARGET_FIXTURES_PATH = path.join(path.dirname(__dirname), '__tests__', 'fixtures')

const OUTPUT_PATH = path.join(__dirname, 'tpl')

export function setupEnv() {
  if (fs.existsSync(OUTPUT_PATH)) {
    return [true, OUTPUT_PATH]
  }

  try {
    fs.symlinkSync(TARGET_FIXTURES_PATH, OUTPUT_PATH, 'dir')
    return [true, OUTPUT_PATH]
  } catch (error) {
    return [false, '']
  }
}
