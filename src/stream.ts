import { Readable, Writable } from 'stream'
import type { ReadableOptions, WritableOptions } from 'stream'
import { F_MODE, TypeFlag, encode } from './head'
import type { EncodingHeadOptions } from './head'

export type PackOptions = Partial<Omit<EncodingHeadOptions, 'name' | 'size' | 'mtime'>> & {
  filename: string
}

function createReadbleStream(options?: ReadableOptions) {
  return new Readable(options)
}

function createWriteableStream(options?: WritableOptions) {
  return new Writable(options)
}

const PACK_ERROR_MESSAGES = {
  HAS_DONE: 'Can\'t add new entry after calling done()'
}

// New archives should be created using REGTYPE.
const defaultPackOptions = {
  mode: F_MODE,
  uid: 0,
  gid: 0,
  typeflag: TypeFlag.REG_TYPE,
  devmajor: 0,
  devminor: 0
} satisfies Partial<EncodingHeadOptions>

export class Pack {
  private reader: Readable
  private finished: boolean
  constructor() {
    this.reader = createReadbleStream({
      read() {}
    })
    this.finished = false
  }

  private resolveHeadOptions(size: number, options: PackOptions): EncodingHeadOptions {
    const { filename, ...rest } = options

    return { ...defaultPackOptions, ...rest, name: filename, mtime: Math.floor(Date.now() / 1000), size }
  }

  add(binary: Uint8Array, options: PackOptions) {
    if (this.finished) {
      throw new Error(PACK_ERROR_MESSAGES.HAS_DONE)
    }
    const resolved = this.resolveHeadOptions(binary.length, options)
    this.transport(binary, resolved)
  }

  done() {
    if (this.finished) return
    this.finished = true
    this.reader.push(new Uint8Array(1024))
    this.reader.push(null)
  }

  private transport(binary: Uint8Array, resolvedOptions: EncodingHeadOptions) {
    const writer = createWriteableStream({
      write: (chunk, encoding, callback) => {
        this.reader.push(encode(resolvedOptions)) 
        this.reader.push(chunk)
        callback()
      },
      final: (callback) => {
        this.reader.push(null)
        callback()
      }
    })
    writer.write(binary)
  }

  get receiver() {
    if (!this.finished) {
      this.done()
    }
    return this.reader
  }
}

export function createPack() {
  return new Pack()
}

export class Extract {
  private writer: Writable
  constructor() {
    this.writer = createWriteableStream({
      write(chunk, encoding, callback) {
        callback()
      }
    })
  }

  get receiver() {
    return this.writer
  }
}

export function createExtract() {
  return new Extract()
}

// const extract = createExtract() 
// const tarball = fs.createReadStream('foo.tar')
// extract.
// tarball.pipe(extract.receiver)
// 
