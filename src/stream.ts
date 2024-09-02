import { Readable, Writable } from 'stream'
import type { ReadableOptions, WritableOptions } from 'stream'
import { F_MODE, GnuTypeFlag, Magic, STANDARD_TYPE_FLAG_SET, TypeFlag, decode, decodePax, decodeString, encode, encodePax } from './head'
import type { DecodingHeadOptions, EncodingHeadOptions, EncodingHeadOptionsWithPax, UnionTypeFlag } from './head'
import { List, createList } from './list'
import { noop } from './shared'

export type PackOptions = Partial<Omit<EncodingHeadOptions, 'name' | 'size' | 'mtime'>> & {
  filename: string
  pax?: Record<string, string>
}

function createReadbleStream(options?: ReadableOptions) {
  return new Readable(options)
}

function createWriteableStream(options?: WritableOptions) {
  return new Writable(options)
}

const PACK_ERROR_MESSAGES = {
  HAS_DONE: "Can't add new entry after calling done()"
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

  private resolveHeadOptions(size: number, options: PackOptions): EncodingHeadOptionsWithPax {
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

  private transport(binary: Uint8Array, resolvedOptions: EncodingHeadOptionsWithPax) {
    const consume = (chunk: Uint8Array) => {
      if (resolvedOptions.pax) {
        const paxHead = encodePax({ name: resolvedOptions.name, linkname: resolvedOptions.linkname || '', pax: { ...resolvedOptions.pax } })
        const head = encode({ ...resolvedOptions, name: 'PaxHeader', typeflag: TypeFlag.XHD_TYPE, size: paxHead.length })
        this.reader.push(head)
        this.reader.push(paxHead)
        this.reader.push(this.fix(paxHead.length))
        resolvedOptions.name = 'PaxHeader'
      }
      this.reader.push(encode(resolvedOptions))
      this.reader.push(chunk)
    }

    const writer = createWriteableStream({
      write: (chunk, _, callback) => {
        try {
          consume(chunk)
          callback()
        } catch (error) {
          callback(error as Error)
        }
      },
      final: (callback) => {
        this.reader.push(this.fix(resolvedOptions.size))
        callback()
      }
    })
    writer.write(binary, (e) => {
      if (e) {
        this.reader.emit('error', e)
      }
    })
    writer.end()
  }

  get receiver() {
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
  insertedBytesLen: number

  constructor() {
    this.queue = createList<Uint8Array>()
    this.bytesLen = 0
    this.insertedBytesLen = 0
  }

  push(b: Uint8Array) {
    this.bytesLen += b.length
    this.insertedBytesLen += b.length
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

    const b = new Uint8Array(size)
    this.queue.shift()
    const bb = elt.subarray(size)
    if (bb.length > 0) {
      this.queue.push(bb)
    }
    b.set(elt.subarray(0, size))
    this.bytesLen -= size
    return b
  }

  peek(size: number) {
    if (size > this.bytesLen) {
      throw new Error(FAST_BYTES_ERROR_MESSAGES.EXCEED_BYTES_LEN)
    }
    const elt = this.queue.peek()

    if (!elt) {
      throw new Error(FAST_BYTES_ERROR_MESSAGES.EXCEED_BYTES_LEN)
    }

    return elt.subarray(0, size)
  }
}

function ensureIsStandardUSTARFormat(typeflag: UnionTypeFlag) {
  return STANDARD_TYPE_FLAG_SET.has(typeflag)
}

export class Extract {
  private writer: Writable
  private decodeOptions: DecodingHeadOptions
  matrix: FastBytes
  private head: ReturnType<typeof decode>
  private missing: number
  private offset: number
  private flag: boolean
  private elt: Uint8Array | null
  private total: number
  private isNonUSTAR: boolean
  private paxMeta: Record<string, string>
  private gnuMeta: Record<string, string>
  private pause: boolean
  constructor(options: DecodingHeadOptions) {
    this.decodeOptions = options
    this.matrix = new FastBytes()
    this.head = Object.create(null)
    this.missing = 0
    this.flag = false
    this.offset = 0
    this.elt = null
    this.total = 0
    this.isNonUSTAR = false
    this.paxMeta = Object.create(null)
    this.gnuMeta = Object.create(null)
    this.pause = false
    this.writer = createWriteableStream({
      write: (chunk, _, callback) => {
        // We must ensure that the chunk is enough to fill the 512 bytes
        if (this.pause) {
          const bb = this.matrix.shift(this.matrix.bytesLen)
          const next = new Uint8Array(bb.length + chunk.length)
          next.set(bb)
          next.set(chunk, bb.length)
          this.matrix.push(next)
          this.pause = false
        } else {
          this.matrix.push(chunk)
        }
        this.transport()
        callback()
      }
    })
  }

  private removePadding(size: number) {
    const padding = (512 - (size % 512)) % 512
    if (padding > 0) {
      this.matrix.shift(padding)
      return padding
    }

    return 0
  }

  private transport() {
    const decodeHead = () => {
      try {
        this.head = decode(this.matrix.shift(512), this.decodeOptions)

        if (!ensureIsStandardUSTARFormat(this.head.typeflag)) {
          this.isNonUSTAR = true
          return true
        }

        if (Object.keys(this.gnuMeta).length > 0) {
          for (const key in this.gnuMeta) {
            if (this.gnuMeta[key]) {
              // @ts-expect-error
              this.head[key] = this.gnuMeta[key]
            }
          }
          this.gnuMeta = Object.create(null)
        }

        if (Object.keys(this.paxMeta).length > 0) {
          this.head.name = this.paxMeta.path
          this.head.linkname = this.paxMeta.linkpath
          // @ts-expect-error
          this.head.pax = { ...this.paxMeta }
          this.paxMeta = Object.create(null)
        }

        this.missing = this.head.size
        this.elt = new Uint8Array(this.head.size)
        this.flag = true
        this.offset = 0
        return true
      } catch (error) {
        this.writer.emit('error', error)
        return false
      }
    }

    const consume = () => {
      const leak = this.missing > this.matrix.bytesLen
      if (leak) {
        const b = this.matrix.shift(this.matrix.bytesLen)
        this.missing -= b.length
        this.elt!.set(b, this.offset)
        this.offset += b.length
        return
      }
      this.elt!.set(this.matrix.shift(this.missing), this.offset)
      this.total += this.elt!.length + 512
      this.writer.emit('entry', this.head, this.elt!)
      this.flag = false
    }

    const handlePax = () => {
      const c = this.matrix.shift(this.head.size)
      const paxHead = decodePax(c)
      this.paxMeta = { ...this.paxMeta, ...paxHead }
      this.total += this.head.size + 512
    }

    const handleLongPath = () => {
      const c = this.matrix.shift(this.head.size)
      const filename = decodeString(c, 0, c.length, this.decodeOptions.filenameEncoding)
      if (this.head.typeflag === GnuTypeFlag.GNUTYPE_LONGNAME) {
        this.gnuMeta = { name: filename }
      } else {
        this.gnuMeta = { linkname: filename }
      }
      this.total += this.head.size + 512
    }

    const handleNonUSTARFormat = () => {
      switch (this.head.typeflag) {
        case TypeFlag.XHD_TYPE:
          handlePax()
          break
        case GnuTypeFlag.GNUTYPE_LONGLINK:
        case GnuTypeFlag.GNUTYPE_LONGNAME:
          handleLongPath()
          break
        default:
          noop()
          break
      }
      this.isNonUSTAR = false
    }

    while (this.matrix.bytesLen > 0) {
      if (this.matrix.bytesLen < 512) {
        this.pause = true
        return
      }

      if (this.isNonUSTAR) {
        handleNonUSTARFormat()
        continue
      }

      if (this.flag) {
        consume()
        continue
      }

      if (this.head && this.head.size && !this.flag) {
        const padding = this.removePadding(this.head.size)
        this.total += padding
        this.head = Object.create(null)
        continue
      }

      const c = this.matrix.peek(512)
      if (c[0] === Magic.NULL_CHAR && c[511] === Magic.NULL_CHAR) {
        this.matrix.shift(512)
        continue
      }

      if (!decodeHead()) return
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
