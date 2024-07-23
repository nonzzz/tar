import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

const rescriptOutputPath = path.join(process.cwd(), '/lib/es6/src')
const entryPath = path.join(rescriptOutputPath, 'index.mjs')

const skip = ['External.mjs']

export async function readAll(entry: string) {
  const paths = await Promise.all((await fsp.readdir(entry)).map((dir) => path.join(entry, dir)))
  let pos = 0
  const result: string[] = []
  while (pos !== paths.length) {
    const dir = paths[pos]
    const stat = await fsp.stat(dir)
    if (stat.isDirectory()) {
      const dirs = await fsp.readdir(dir)
      paths.push(...dirs.map((sub) => path.join(dir, sub)))
    }
    if (stat.isFile()) {
      result.push(dir)
    }
    pos++
  }
  return result
}

async function main() {
  const files: string[] = []
  if (!fs.existsSync(rescriptOutputPath)) {
    throw new Error(`The path ${rescriptOutputPath} does not exist`)
  }
  if (fs.existsSync(entryPath)) {
    await fsp.rm(entryPath)
  }
  files.push(...((await readAll(rescriptOutputPath)).filter(f => {
    if (skip.includes(path.basename(f))) return false
    return true
  })))

  const content = files
    .map((file) => {
      const relativePath = path.relative(rescriptOutputPath, file)
      return `export * from './${relativePath}'`
    })
    .join('\n')
  await fsp.writeFile(entryPath, content, 'utf-8')
}

main()
