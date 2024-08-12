import { Readable, Writable } from 'stream'
import type { ReadableOptions, WritableOptions } from 'stream'
import { F_MODE, TypeFlag, encode } from './head'
import { DecodingHeadOptions, EncodingHeadOptions, decode } from './head'
import { List, createList } from './list'
import { noop } from './shared'

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

  private fix(size: number) {
    const padding = (512 - (size % 512)) % 512
    if (padding > 0) this.reader.push(new Uint8Array(padding))
  }

  private transport(binary: Uint8Array, resolvedOptions: EncodingHeadOptions) {
    const writer = createWriteableStream({
      write: (chunk, encoding, callback) => {
        this.reader.push(encode(resolvedOptions)) 
        this.reader.push(chunk)
        callback()
      },
      final: (callback) => {
        this.reader.push(this.fix(resolvedOptions.size))
        callback()
      }
    })
    writer.write(binary)
    writer.end()
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

const FAST_BYTES_ERROR_MESSAGES = {
  EXCEED_BYTES_LEN: 'The size of bytes exceeds the length of whole bytes.'
}

class FastBytes {
  private queue: List<Uint8Array>
  bytesLen: number
  private offset: number
  private position: number
  constructor() {
    this.queue = createList<Uint8Array>()
    this.bytesLen = 0
    this.offset = 0
    this.position = 0
  }

  push(b: Uint8Array) {
    this.bytesLen += b.length
    this.queue.push(b)
  }

  shift(size: number) {
    if (size > this.bytesLen) {
      throw new Error(FAST_BYTES_ERROR_MESSAGES.EXCEED_BYTES_LEN)
    } 
    if (size === 0) {
      return new Uint8Array(0)
    }
    const elt = this.queue.peek()
    if (!elt) {
      throw new Error(FAST_BYTES_ERROR_MESSAGES.EXCEED_BYTES_LEN)
    }
    let bb: Uint8Array
    const overflow = size >= elt.length
    if (overflow) {
      bb = new Uint8Array(size)
      const preBinary = elt.subarray(this.offset)
      bb.set(preBinary, 0)
      this.queue.shift()
      const next = this.queue.peek()!
      const nextBinary = next.subarray(0, size - preBinary.length)
      bb.set(nextBinary, preBinary.length)
      this.position++
      this.queue.update(this.position, next.subarray(size - preBinary.length)) 
      while (size - preBinary.length - nextBinary.length > 0) {
        bb.set(this.shift(size - preBinary.length - nextBinary.length), preBinary.length + nextBinary.length)
      }
    } else {
      this.queue.update(this.position, elt.subarray(size))
      bb = elt.subarray(0, size)
    }
    this.offset += size
    this.bytesLen -= size

    return bb
  }
}

export class Extract {
  private writer: Writable
  private decodeOptions: DecodingHeadOptions
  matrix: FastBytes
  constructor(options: DecodingHeadOptions) {
    this.decodeOptions = options
    this.matrix = new FastBytes()
    this.writer = createWriteableStream({
      write: (chunk, _, callback) => {
        this.matrix.push(chunk)
        this.transport()
        callback()
      }
    })
  }

  private removePadding(size: number) {
    // Content is fixed at 512 bytes base, so we need to remove the padding.
    return 512 - size % 512
  }

  private scan() {
    try {
      if (this.matrix.bytesLen === 512 * 2) {
        return false
      } 
      const head = decode(this.matrix.shift(512), this.decodeOptions)
      const b = this.matrix.shift(head.size)
      const offset = this.removePadding(head.size)
      this.matrix.shift(offset)
      this.writer.emit('entry', head, new Uint8Array(b))
      return true
    } catch (error) {
      return false
    }
  }

  private transport() {
    while (this.matrix.bytesLen > 0) {
      if (this.matrix.bytesLen < 512) {
        break
      }
      if (!this.scan()) return
    }
  }

  get receiver() {
    return this.writer
  }

  on(event: 'close', listener: () => void): void
  on(event: 'drain', listener: () => void): void
  on(event: 'error', listener: (err: Error) => void): void
  on(event: 'finish', listener: () => void): void
  on(event: 'pipe', listener: (src: Readable) => void): void
  on(event: 'unpipe', listener: (src: Readable) => void): void
  on(event: 'entry', listener: (head: ReturnType<typeof decode>, u8: Uint8Array) => void): void
  on(event: string | symbol, listener: (...args: any[]) => void): void
  on(event: any, listener: (...args: any[]) => void = noop) {
    this.writer.on(event, listener)
  }
}

export function createExtract(options: DecodingHeadOptions = {}) {
  return new Extract(options)
}
