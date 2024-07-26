export const typeFlag = {
  reg_type: '0',
  areg_type: '\0',
  link_type: '1',
  sym_type: '2',
  chr_type: '3',
  blk_type: '4',
  dir_type: '5',
  fifo_type: '6',
  cont_type: '7'
} as const
  
export const mod = {
  ts_uid: 0o4000,
  ts_gid: 0o2000,
  ts_vtx: 0o1000,
  tu_read: 0o0400,
  tu_write: 0o0200,
  tu_exec: 0o0100,
  tg_read: 0o0040,
  tg_write: 0o0020,
  tg_exec: 0o0010,
  to_read: 0o0004,
  to_write: 0o0002,
  to_exec: 0o0001
}

export type TypeFlag = typeof typeFlag[keyof typeof typeFlag]

export type Mod = typeof mod[keyof typeof mod]

export interface HeadOptions {
  name: string
  mode: number
  uid: number
  gid: number
  size: number
  typeflag: TypeFlag
  linkname: string
  magic: string
  version: string
  uname: string
  gname: string
  devmajor: number
  devminor: number
  mtime: number
  prefix: string
}

export interface DecodeOptions {
  filenameEncoding: string
  allowunknowFormat: boolean
}

export declare function encode(options: HeadOptions): Uint8Array 

export declare function decode(b: Uint8Array, options: DecodeOptions): Partial<HeadOptions>
