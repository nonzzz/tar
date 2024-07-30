/* eslint-disable no-labels */
// https://www.gnu.org/software/tar/manual/html_node/Standard.html

type uint8 = number

// POSIX HEADER
export interface Head {
  name: uint8 // 100
  mode: uint8 // 8
  uid: uint8 // 8
  gid: uint8 // 8
  size: uint8 // 12
  mtime: uint8 // 12
  chksum: uint8 // 8
  typeflag: uint8 // 1
  linkname: uint8 // 100
  magic: uint8 // 6
  uname: uint8 // 32
  gname: uint8 // 32
  devmajor: uint8 // 8
  devminor: uint8 // 8
  prefix: uint8 // 155
}

export const Mode = {
  TS_UID: 0o4000,
  TS_GID: 0o2000,
  TS_VTX: 0o1000,
  TU_READ: 0o0400,
  TU_WRITE: 0o0200,
  TU_EXEC: 0o0100,
  TG_READ: 0o0040,
  TG_WRITE: 0o0020,
  TG_EXEC: 0o0010,
  TO_READ: 0o0004,
  TO_WRITE: 0o0002,
  TO_EXEC: 0o0001
} as const

export const F_MODE = Mode.TU_READ | Mode.TU_WRITE | Mode.TG_READ | Mode.TO_READ
  
export const D_MODE = Mode.TU_READ | Mode.TU_WRITE | Mode.TU_EXEC | Mode.TG_READ | Mode.TG_EXEC | Mode.TO_READ |
    Mode.TO_EXEC
  
export type Mode = typeof Mode[keyof typeof Mode]

export const TypeFlag = {
  REG_TYPE: '0',
  AREG_TYPE: '\0',
  LINK_TYPE: '1',
  SYM_TYPE: '2',
  CHR_TYPE: '3',
  BLK_TYPE: '4',
  DIR_TYPE: '5',
  FIFO_TYPE: '6',
  CONT_TYPE: '7'
} as const
  
export type TypeFlag = typeof TypeFlag[keyof typeof TypeFlag]

export const Magic = {
  T_MAGIC: 'ustar',
  T_VERSION: '00'
}

export interface EncodingHeadOptions {
  name: string
  mode: number,
  uid: number,
  gid: number,
  size: number,
  mtime: number,
  typeflag: TypeFlag,
  linkname?: string,
  uname?: string,
  gname?: string,
  devmajor: number,
  devminor: number,
}

export interface DecodingHeadOptions {
  filenameEncoding?: string
  allowUnknownFormat?: boolean
}

export const ERROR_MESSAGES = {
  INVALID_ENCODING_NAME: 'Invalid name. Invalid name. Please check \'name\' is a direcotry type.',
  INVALID_ENCODING_NAME_LEN: 'Invalid name. Please check \'name\' length is less than 255 byte.',
  INVALID_ENCODING_LINKNAME: 'Invalid linkname. Please check \'linkname\' length is less than 100 byte.'
}

const enc =/* @__PURE__ */ new TextEncoder()

const dec =/* @__PURE__ */ new TextDecoder()

/* @__NO_SIDE_EFFECTS__ */
function encodeString(s: string) {
  return enc.encode(s)
}
/* @__NO_SIDE_EFFECTS__ */
function indexOf(b: Uint8Array, c: number, start: number) {
  // 
}

/* @__NO_SIDE_EFFECTS__ */
function decodeString(b: Uint8Array, offset: number, length: number, encoding = 'utf-8') {
  // return dec.decode(b)
  b.subarray(offset, offset + length)
}

/* @__NO_SIDE_EFFECTS__ */
function encodeOctal(b: number, fixed?: number) {
  const o = b.toString(8)
  if (fixed) {
    if (o.length <= fixed) {
      const fill = '0'.repeat(fixed - o.length)
      return fill + o + ' '
    }
    return '7'.repeat(fixed) + ' '
  }
  return o
}

function chksum(b: Uint8Array) {
  return b.reduce((acc, cur, i) => {
    if (i >= 148 && i < 156) {
      return acc + 32
    }
    return acc + cur
  }, 0)
}

/* @__NO_SIDE_EFFECTS__ */
export function encode(options: EncodingHeadOptions) {
  const block = new Uint8Array(512)
  let name = options.name
  if (options.typeflag === TypeFlag.DIR_TYPE && name[name.length - 1] !== '/') {
    name += '/'
  }
  let prefix = ''
  let invalidate = false
  loop: 
  while (name.length > 100) {
    const spec = name.indexOf('/')
    switch (spec) {
      case -1:
        invalidate = true
        break loop
      default: {
        const range = name.slice(0, spec)
        prefix += prefix ? '/' + range : range
        name = name.slice(spec + 1)
      }
    }
  }

  if (invalidate) {
    throw new Error(ERROR_MESSAGES.INVALID_ENCODING_NAME)
  }
  const binaryName = encodeString(name)
  if (binaryName.length + prefix.length > 255) {
    throw new Error(ERROR_MESSAGES.INVALID_ENCODING_NAME_LEN)
  }
  if (options.linkname && encodeString(options.linkname).length > 100) {
    throw new Error(ERROR_MESSAGES.INVALID_ENCODING_LINKNAME)
  }
  block.set(binaryName, 0)
  block.set(encodeString(encodeOctal(options.mode, 6)), 100)
  block.set(encodeString(encodeOctal(options.uid, 6)), 108)
  block.set(encodeString(encodeOctal(options.gid, 6)), 116)

  // size

  if (encodeOctal(options.size).length > 11) {
    throw new Error('Invalid size. Please check \'size\' is less than 8 byte.')
  }

  block.set(encodeString(encodeOctal(options.size, 11)), 124)

  block.set(encodeString(encodeOctal(options.mtime, 11)), 136)
  block.set(encodeString(options.typeflag), 156)

  if (options.linkname) {
    block.set(encodeString(options.linkname), 157)
  }
  // magic & version
  block.set(encodeString(Magic.T_MAGIC), 257)
  block.set(encodeString(Magic.T_VERSION), 263)
  // uname
  if (options.uname) {
    block.set(encodeString(options.uname), 265)
  }
  // gname
  if (options.gname) {
    block.set(encodeString(options.gname), 297)
  }
  block.set(encodeString(encodeOctal(options.devmajor, 6)), 329)
  block.set(encodeString(encodeOctal(options.devminor, 6)), 337)
  if (prefix) {
    block.set(encodeString(prefix), 345)
  }

  // chksum
  block.set(encodeString(encodeOctal(chksum(block), 6)), 148)

  return block
}

const defaultDecodeOptions = {
  filenameEncoding: 'utf-8',
  allowUnknownFormat: false
}

/* @__NO_SIDE_EFFECTS__ */
export function decode(b: Uint8Array, options?: DecodingHeadOptions) {
  const opts = options = { ...defaultDecodeOptions, ...options }
  const { filenameEncoding, allowUnknownFormat } = opts
  // const name = decodeString(b.slice(0, 100))
  // const mode = parseInt(decodeString(b.slice(100, 108)), 8)
}
