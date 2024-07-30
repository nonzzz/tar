// https://www.gnu.org/software/tar/manual/html_node/tar_toc.html#SEC_Contents
// POSIX.1-1988

// Desgin for better tree shaking. We won't using the Module in this file.
// Rescript module isn't same as Es class. Only translate to a object in global scope.

open! External

type u8 = Uint8Array.t

external unsafe_u8_mark: string => u8 = "%identity"

// https://www.gnu.org/software/tar/manual/html_node/Standard.html

type posixHead = {
  name: u8, // fixedLength 100 offeset 0
  mode: u8, // fixedLength 8 offeset 100
  uid: u8, // fixedLength 8 offeset 108
  gid: u8, // fixedLength 8 offeset 116
  size: u8, // fixedLength 12 offeset 124
  mtime: u8, // fixedLength 12 offeset 136
  chksum: u8, // fixedLength 8 offeset 148
  typeflag: u8, // fixedLength 1 offeset 156
  linkname: u8, // fixedLength 100 offeset 157
  magic: u8, // fixedLength 6 offeset 257
  version: u8, // fixedLength 2 offeset 263
  uname: u8, // fixedLength 32 offeset 265
  gname: u8, // fixedLength 32 offeset 297
  devmajor: u8, // fixedLength 8 offeset 329
  devminor: u8, // fixedLength 8 offeset 337
  prefix: u8, // fixedLength 155 offeset 345
}

// https://www.gnu.org/software/coreutils/manual/html_node/Numeric-Modes.html

// For some resaon if we use as enums but when we call lor func. It will use the
// enum index as the value.
module Mod = {
  type t = private int
  @inline("ts_uid")
  let ts_uid = 0o4000
  @inline("ts_gid")
  let ts_gid = 0o2000
  @inline("ts_vtx")
  let ts_vtx = 0o1000
  @inline("tu_read")
  let tu_read = 0o0400
  @inline("tu_write")
  let tu_write = 0o0200
  @inline("tu_exec")
  let tu_exec = 0o0100
  @inline("tg_read")
  let tg_read = 0o0040
  @inline("tg_write")
  let tg_write = 0o0020
  @inline("tg_exec")
  let tg_exec = 0o0010
  @inline("to_read")
  let to_read = 0o0004
  @inline("to_write")
  let to_write = 0o0002
  @inline("to_exec")
  let to_exec = 0o0001
}

external lor: ('a, 'a) => 'a = "%orint"

let f_mod = Mod.tu_read->lor(Mod.tu_write)->lor(Mod.tg_read)->lor(Mod.to_read)

let d_mod =
  Mod.tu_read
  ->lor(Mod.tu_write)
  ->lor(Mod.tu_exec)
  ->lor(Mod.tg_read)
  ->lor(Mod.tg_exec)
  ->lor(Mod.to_read)
  ->lor(Mod.to_exec)

module TypeFlag = {
  type t =
    | @as("0") REG_TYPE
    | @as("\0") AREG_TYPE
    | @as("1") LINK_TYPE
    | @as("2") SYM_TYPE
    | @as("3") CHR_TYPE
    | @as("4") BLK_TYPE
    | @as("5") DIR_TYPE
    | @as("6") FIFO_TYPE
    | @as("7") CONT_TYPE

  external unsafe_str_mark: 'a => string = "%identity"

  external convert_type_flag: string => t = "%identity"
}

module Magic = {
  type t =
    | @as("ustar") T_MAGIC
    | @as("00") T_VERSION

  external unsafe_str_mark: 'a => string = "%identity"
  external unsafe_int_mark: 'a => int = "%identity"
}

module ErrorMessage = {
  type e =
    | @as("Invalid name. Please check 'name' is a direcotry type.") INVALID_ENCODE_NAME
    | @as("Invalid name. Please check 'name' length is less than 255 byte.") INVALID_NAME_LENGTH
    | @as("Invalid linkname. Please check 'linkname' length is less than 100 byte.")
    INVALID_LINKNAME_LENGTH
    | @as("Invalid size. Please check 'size' is less than 8 GiB.") INVALID_SIZE
    | @as("Invalid chksum. Nothing happened.") INVALID_CHKSUM
    | @as("Invalid chksum. Maybe the tar is corrupted or it needs to be gunzipped")
    INVALID_MAYBE_GUNZIP

  external convert_to_error: e => string = "%identity"
}

module EncodeHeadOptions = {
  type t = {
    name: string,
    mode: int,
    uid: option<int>,
    gid: option<int>,
    size: int,
    mtime: int,
    // chksum: int,
    typeflag: TypeFlag.t,
    linkname: option<string>,
    // magic: string,
    // version: string,
    uname: option<string>,
    gname: option<string>,
    devmajor: option<int>,
    devminor: option<int>,
    // prefix: string,
  }

  type typed = {
    options: t,
    block: Uint8Array.t,
  }

  type mutNameMeta = {mutable name: string, mutable prefix: string, mutable binary: u8}

  let make = (opt: t) => {
    {options: opt, block: 512->Uint8Array.fromLength}
  }
}

module DecodeHeadOptions = {
  type t = {
    filenameEncoding: string,
    allowUnknowFormat: bool,
  }
  type elt = {
    name: string,
    mode: int,
    uid: option<int>,
    gid: option<int>,
    size: int,
    mtime: int,
    typeflag: TypeFlag.t,
    linkname: option<string>,
    magic: string,
    version: string,
    uname: string,
    gname: string,
    devmajor: option<int>,
    devminor: option<int>,
  }
  let make = (input: elt) => input
}

let chksum = (block: u8) => {
  block->Uint8Array.reducei((acc, v, i) => {
    if i >= 148 && i < 156 {
      acc + 32
    } else {
      acc + v
    }
  }, 0)
}

// Files can contain at most 8 GiB (2^33 bytes = 8,589,934,592 bytes).
// So the size after get octal num max length is 12.
let encodeImpl = (opt: EncodeHeadOptions.t) => {
  let {options, block} = opt->EncodeHeadOptions.make

  let nameMeta: EncodeHeadOptions.mutNameMeta = {
    name: options.name,
    prefix: "",
    binary: ""->unsafe_u8_mark,
  }

  let linkname = switch options.linkname {
  | None => ""
  | Some(s) => s
  }

  let uname = switch options.uname {
  | None => ""
  | Some(s) => s
  }

  let gname = switch options.gname {
  | None => ""
  | Some(s) => s
  }

  let uid = switch options.uid {
  | None => 0
  | Some(u) => u
  }

  let gid = switch options.gid {
  | None => 0
  | Some(g) => g
  }

  let devmajor = switch options.devmajor {
  | None => 0
  | Some(d) => d
  }

  let devminor = switch options.devminor {
  | None => 0
  | Some(d) => d
  }

  if (
    options.typeflag == TypeFlag.DIR_TYPE &&
      (options.name->Js.String.length - 1)->Js.String.charAt(options.name) != "/"
  ) {
    nameMeta.name = nameMeta.name ++ "/"
  }

  let invalidate = ref(false)
  while nameMeta.name->Js.String.length > 100 {
    let spec = "/"->Js.String.indexOf(nameMeta.name)
    switch spec {
    | -1 => invalidate := true
    | _ => {
        let range = nameMeta.name->Js.String.slice(~from=0, ~to_=spec)
        nameMeta.prefix = if nameMeta.prefix->Js.String.length > 0 {
          "/" ++ range
        } else {
          range
        }
        nameMeta.name =
          nameMeta.name->Js.String.slice(~from=spec + 1, ~to_=nameMeta.name->Js.String.length)
      }
    }
  }

  switch invalidate.contents {
  | true => Error(ErrorMessage.INVALID_ENCODE_NAME)
  | _ => {
      nameMeta.binary = nameMeta.name->textEncode

      switch nameMeta.binary->Uint8Array.length + nameMeta.prefix->Js.String.length > 255 {
      | true => Error(ErrorMessage.INVALID_NAME_LENGTH)
      | _ =>
        if linkname->textEncode->Uint8Array.length > 100 {
          Error(ErrorMessage.INVALID_LINKNAME_LENGTH)
        } else {
          nameMeta.binary->Uint8Array.setArrayOffset(block, 0)
          options.mode->octalEncode(~fixed=6)->textEncode->Uint8Array.setArrayOffset(block, 100)
          uid->octalEncode(~fixed=6)->textEncode->Uint8Array.setArrayOffset(block, 108)
          gid->octalEncode(~fixed=6)->textEncode->Uint8Array.setArrayOffset(block, 116)

          if options.size->octalEncode->String.length > 11 {
            Error(ErrorMessage.INVALID_SIZE)
          } else {
            options.size->octalEncode(~fixed=11)->textEncode->Uint8Array.setArrayOffset(block, 124)
            options.mtime->octalEncode(~fixed=11)->textEncode->Uint8Array.setArrayOffset(block, 136)

            // typelfag
            options.typeflag
            ->TypeFlag.unsafe_str_mark
            ->textEncode
            ->Uint8Array.setArrayOffset(block, 156)

            linkname->textEncode->Uint8Array.setArrayOffset(block, 157)

            Magic.T_MAGIC->Magic.unsafe_str_mark->textEncode->Uint8Array.setArrayOffset(block, 257)
            Magic.T_VERSION
            ->Magic.unsafe_str_mark
            ->textEncode
            ->Uint8Array.setArrayOffset(block, 263)
            uname->textEncode->Uint8Array.setArrayOffset(block, 265)
            gname->textEncode->Uint8Array.setArrayOffset(block, 297)
            devmajor->octalEncode(~fixed=6)->textEncode->Uint8Array.setArrayOffset(block, 329)
            devminor->octalEncode(~fixed=6)->textEncode->Uint8Array.setArrayOffset(block, 337)
            nameMeta.prefix->textEncode->Uint8Array.setArrayOffset(block, 345)

            // chksum
            block->chksum->octalEncode(~fixed=6)->textEncode->Uint8Array.setArrayOffset(block, 148)

            Ok(block)
          }
        }
      }
    }
  }
}

let decodeImpl = (b: u8, opt: DecodeHeadOptions.t) => {
  let {filenameEncoding} = opt

  let name = b->strDecode(0, 100, ~encoding=filenameEncoding)
  let mode = b->octalDecode(8, ~offset=100)->Option.getOr(0o644)
  let uid = b->octalDecode(8, ~offset=108)
  let gid = b->octalDecode(8, ~offset=116)
  let size = b->octalDecode(12, ~offset=124)->Option.getOr(0o644)
  let mtime = b->octalDecode(12, ~offset=136)->Option.getOr(0)
  let typeflag = b->strDecode(156, 1)->TypeFlag.convert_type_flag
  let linkname = switch b->Uint8Array.get(157) {
  | 0x00 => None
  | _ => Some(b->strDecode(157, 100, ~encoding=filenameEncoding))
  }
  let uname = b->strDecode(265, 32)
  let gname = b->strDecode(297, 32)
  let devmajor = b->octalDecode(8, ~offset=329)
  let devminor = b->octalDecode(8, ~offset=337)
  let version = b->strDecode(263, 2)
  let magic = b->strDecode(257, 6)
  switch b->chksum {
  | 512 => Ok(None)
  | c =>
    switch b->octalDecode(6, ~offset=148) {
    | None => Error(ErrorMessage.INVALID_CHKSUM)
    | Some(sum) =>
      if c !== sum {
        Error(ErrorMessage.INVALID_MAYBE_GUNZIP)
      } else {
        DecodeHeadOptions.make({
          name,
          mode,
          uid,
          gid,
          size,
          mtime,
          typeflag,
          linkname,
          magic,
          version,
          uname,
          gname,
          devmajor,
          devminor,
        })
        ->Some
        ->Ok
      }
    }
  }
}

let getExn: result<'a, ErrorMessage.e> => 'a = x =>
  switch x {
  | Ok(x) => x
  | Error(e) => e->ErrorMessage.convert_to_error->Error.make->Error.raise
  }

let encode = (opt: EncodeHeadOptions.t) => {
  encodeImpl(opt)->getExn
}

let decode = (b: u8, opt: DecodeHeadOptions.t) => {
  decodeImpl(b, opt)->getExn
}
