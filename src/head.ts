/* eslint-disable no-labels */
// https://www.gnu.org/software/tar/manual/html_node/Standard.html
// https://www.gnu.org/software/tar/manual/html_node/Portability.html#Portability

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

export interface PaxHead extends Head {
  atime: uint8
  linkpath: uint8
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

// ././@LongLink GNU tar magic

export const GnuTypeFlag = {
  GNUTYPE_DUMPDIR: 'D',
  GNUTYPE_LONGLINK: 'K',
  GNUTYPE_LONGNAME: 'L',
  GNUTYPE_MULTIVOL: 'M',
  GNUTYPE_SPARSE: 'S',
  GNUTYPE_VOLHDR: 'V',
  SOLARIS_XHDTYPE: 'X'
} as const

export const TypeFlag = {
  REG_TYPE: '0',
  AREG_TYPE: '\0',
  LINK_TYPE: '1',
  SYM_TYPE: '2',
  CHR_TYPE: '3',
  BLK_TYPE: '4',
  DIR_TYPE: '5',
  FIFO_TYPE: '6',
  CONT_TYPE: '7',
  // For Pax
  XHD_TYPE: 'x',
  XGL_TYPE: 'g'
} as const

export const STANDARD_TYPE_FLAG_SET = new Set<string>([
  TypeFlag.REG_TYPE,
  TypeFlag.LINK_TYPE,
  TypeFlag.SYM_TYPE,
  TypeFlag.CHR_TYPE,
  TypeFlag.BLK_TYPE,
  TypeFlag.DIR_TYPE,
  TypeFlag.FIFO_TYPE,
  TypeFlag.CONT_TYPE
])

export type TypeFlag = typeof TypeFlag[keyof typeof TypeFlag]

export type GnuTypeFlag = typeof GnuTypeFlag[keyof typeof GnuTypeFlag]

export type UnionTypeFlag = TypeFlag | GnuTypeFlag

export const Magic = {
  T_MAGIC: 'ustar',
  T_VERSION: '00',
  WHITE_SPACE: 32, // ascii code
  EQ_CHAR: 61, // ascii code
  NULL_CHAR: 0, // ascii code
  NEW_LINE: 10, // ascii code
  NEGATIVE_256: 0xFF,
  POSITIVE_256: 0x80,
  GNU_LONG_NAME: '././@LongLink'
}

export interface EncodingHeadOptions {
  name: string
  mode: number
  uid: number
  gid: number
  size: number
  mtime: number
  typeflag: TypeFlag
  linkname?: string
  uname?: string
  gname?: string
  devmajor: number
  devminor: number
}

export interface EncodingHeadPaxOptions {
  name: string
  linkname: string
  pax?: Record<string, string>
}

export type EncodingHeadOptionsWithPax = EncodingHeadOptions & Pick<EncodingHeadPaxOptions, 'pax'>

export interface DecodingHeadOptions {
  filenameEncoding?: string
}

export const ERROR_MESSAGES = {
  INVALID_ENCODING_NAME: "Invalid name. Invalid name. Please check 'name' is a directory type.",
  INVALID_ENCODING_NAME_LEN: "Invalid name. Please check 'name' length is less than 255 byte.",
  INVALID_ENCODING_LINKNAME: "Invalid linkname. Please check 'linkname' length is less than 100 byte.",
  INVALID_BASE256: 'Invalid base256 format',
  INVALID_OCTAL_FORMAT: 'Invalid octal format',
  NOT_INIT: 'Not init',
  INVALID_CHKSUM: 'Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?'
}

// For most scens. format ustar is useful, but when we meet the large file, we should fallback to the old gnu format.

const enc = /* @__PURE__ */ new TextEncoder()

const encodeString = enc.encode.bind(enc)

export function decodeString(b: Uint8Array, offset: number, length: number, encoding = 'utf-8') {
  // filter null character
  while (b[offset + length - 1] === Magic.NULL_CHAR) {
    length--
  }
  const dec = new TextDecoder(encoding)
  return dec.decode(b.subarray(offset, offset + length))
}

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

// https://www.gnu.org/software/tar/manual/html_node/Extensions.html
function parse256(b: Uint8Array) {
  const positive = b[0] === Magic.POSITIVE_256
  return b.slice(1).reduceRight((acc, cur, i) => {
    const byte = positive ? cur : Magic.NEGATIVE_256 - cur
    return acc += byte * Math.pow(256, b.length - i - 2)
  }, 0) * (positive ? 1 : -1)
}

function decodeOctal(b: Uint8Array, offset: number, length: number) {
  const range = b.subarray(offset, offset + length)
  // for old gnu format
  if (range[0] & Magic.POSITIVE_256) {
    if (range[0] === Magic.POSITIVE_256 || range[0] === Magic.NEGATIVE_256) {
      return parse256(range)
    }
    throw new Error(ERROR_MESSAGES.INVALID_BASE256)
  }

  // [48...48, 32, 0] // len = 8
  let pos = 0
  for (;;) {
    if (range[pos] === Magic.WHITE_SPACE || range[pos] === Magic.NULL_CHAR) {
      break
    }
    if (pos >= length) {
      throw new Error(ERROR_MESSAGES.INVALID_OCTAL_FORMAT)
    }
    pos++
  }
  return parseInt(decodeString(range, 0, pos), 8)
}

// https://www.gnu.org/software/tar/manual/html_node/Checksumming.html#Checksumming

function chksum(b: Uint8Array) {
  return b.subarray(0, 512).reduce((acc, cur, i) => {
    if (i >= 148 && i < 156) {
      return acc + Magic.WHITE_SPACE
    }
    return acc + cur
  }, 0)
}

// "%d %s=%s\n", <length>, <keyword>, <value>
function paxTemplate(keyword: string, value: string) {
  const template = ' ' + keyword + '=' + value + '\n'
  const binary = encodeString(template)
  return (binary.length + String(binary.length).length) + template
}

// https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html#tag_20_92_13_03
// Encode implements the Basic ustar format. But when the size is over 2^33, it will fallback to the posix pax format.

// | ustar Header[typeFlag=g]    |
// | Global Extended Header Data |
// | ustar Header[typeFlag=x]    |
// | Extended Header Data        |
// | ustar Header[typeFlag=0]    |
// | File Data                   |
// ...
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
  // octal max is 7777777...
  if (options.size.toString(8).length > 11) {
    let s = options.size
    const bb = [Magic.POSITIVE_256]
    for (let i = 11; i > 0; i--) {
      bb[i] = s & Magic.NEGATIVE_256
      s = Math.floor(s / 256)
    }
    block.set(bb, 124)
  } else {
    block.set(encodeString(encodeOctal(options.size, 11)), 124)
  }

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

export function encodePax(options: EncodingHeadPaxOptions) {
  let p = ''
  p += paxTemplate('path', options.name)
  p += paxTemplate('linkpath', options.linkname)
  if (options.pax && typeof options.pax === 'object') {
    for (const key in options.pax) {
      p += paxTemplate(key, options.pax[key])
    }
  }
  return encodeString(p)
}

const defaultDecodeOptions = {
  filenameEncoding: 'utf-8'
}

function prettyTypeFlag(b: uint8): UnionTypeFlag {
  switch (b) {
    case 0:
      return TypeFlag.REG_TYPE
    case 120:
      return TypeFlag.XHD_TYPE
    case 103:
      return TypeFlag.XGL_TYPE
    case 75:
      return GnuTypeFlag.GNUTYPE_LONGLINK
    case 76:
      return GnuTypeFlag.GNUTYPE_LONGNAME
    default:
      return (b - 48) + '' as TypeFlag
  }
}

export function decode(b: Uint8Array, options?: DecodingHeadOptions) {
  const opts = options = { ...defaultDecodeOptions, ...options }
  const { filenameEncoding } = opts
  let name = decodeString(b, 0, 100, filenameEncoding)
  const mode = decodeOctal(b, 100, 8)
  const uid = decodeOctal(b, 108, 8)
  const gid = decodeOctal(b, 116, 8)
  const size = decodeOctal(b, 124, 12)
  const mtime = decodeOctal(b, 136, 12)
  let typeflag = prettyTypeFlag(b[156])
  const linkname = b[157] === Magic.NULL_CHAR ? null : decodeString(b, 157, 100, filenameEncoding)
  const uname = decodeString(b, 265, 32)
  const gname = decodeString(b, 297, 32)
  const devmajor = decodeOctal(b, 329, 8)
  const devminor = decodeOctal(b, 337, 8)
  const c = chksum(b)
  if (c === 256) throw new Error(ERROR_MESSAGES.NOT_INIT)
  if (c !== decodeOctal(b, 148, 8)) {
    throw new Error(ERROR_MESSAGES.INVALID_CHKSUM)
  }
  if (Magic.T_MAGIC === decodeString(b, 257, 6)) {
    if (b[345]) {
      name = decodeString(b, 345, 155, filenameEncoding) + '/' + name
    }
  }

  if (typeflag === TypeFlag.REG_TYPE && name[name.length - 1] === '/' && size === 0) {
    typeflag = TypeFlag.DIR_TYPE
  }

  return {
    name,
    mode,
    uid,
    gid,
    size,
    mtime,
    typeflag,
    linkname,
    uname,
    gname,
    devmajor,
    devminor
  }
}

export function decodePax(b: Uint8Array) {
  const pax: Record<string, string> = {}
  const matrix: Array<uint8[]> = []
  let cap = b.length
  let line = 0
  if (!matrix[line]) {
    matrix[line] = []
  }

  let start = 0
  while (cap > 0) {
    matrix[line].push(b[start])
    if (b[start] === Magic.NEW_LINE) {
      if (start + 1 === b.length) break
      line++
      matrix[line] = []
      start++
      continue
    }
    start++
    cap--
  }

  for (let i = 0; i < matrix.length; i++) {
    const item = matrix[i]
    let pos = 0
    while (item[pos] !== Magic.WHITE_SPACE && pos < item.length) {
      pos++
    }
    const bb = new Uint8Array(item)
    const len = parseInt(decodeString(bb, 0, pos)) - 1
    const content = bb.subarray(pos + 1, len)
    const eqPos = content.indexOf(Magic.EQ_CHAR)
    Object.assign(pax, {
      [decodeString(content, 0, eqPos)]: decodeString(content, eqPos + 1, content.length)
    })
  }
  return pax
}
