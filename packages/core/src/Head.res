// https://www.gnu.org/software/tar/manual/html_section/Formats.html
// Only need pack is enough. (ustar)
// No gnu or old gnu or v7 and oters etc.
// POSIX.1-1988
// https://www.gnu.org/software/tar/manual/tar.html#Blocking-Factor

open! External

type u8 = Uint8Array.t

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

type headOptions = {
  name: string,
  mode: int,
  uid: int,
  gid: int,
  size: int,
  mtime: int,
  chksum: int,
  typeflag: string,
  linkname: string,
  magic: string,
  version: string,
  uname: string,
  gname: string,
  devmajor: int,
  devminor: int,
  prefix: string,
}

type typeFlag = {
  reg_type: string,
  areg_type: string,
  link_type: string,
  sym_type: string,
  chr_type: string,
  blk_type: string,
  dir_type: string,
  fifo_type: string,
  cont_type: string,
}

let typeFlag = {
  reg_type: "0",
  areg_type: "\0",
  link_type: "1",
  sym_type: "2",
  chr_type: "3",
  blk_type: "4",
  dir_type: "5",
  fifo_type: "6",
  cont_type: "7",
}

%%private(let zero_offset = '0')

type headResult = {options: headOptions, block: u8}

// We using 512 bytes as the block size.

%%private(
  let make = (userOptions: option<headOptions>): headResult => {
    let options = switch userOptions {
    | Some(opts) => opts
    | None => {
        let err = Error.make("No options provided")
        err->Error.raise
      }
    }
    {options, block: 512->Uint8Array.fromLength}
  }
)

let chksum = (b: u8) => {
  b->Uint8Array.reducei((acc, v, i) => {
    if i >= 148 && i < 156 {
      acc + 32
    } else {
      acc + v
    }
  }, 512)
}

let encode = (options: option<headOptions>) => {
  let head = make(options)
  let {block, options} = head
  let {typeflag, linkname, mode, uname, gname, gid, uid, devmajor, devminor, mtime, size} = options
  let name = ref({
    if (
      typeflag == typeFlag.dir_type &&
        (options.name->Js.String.length - 1)->Js.String.charAt(options.name) != "/"
    ) {
      options.name ++ "/"
    } else {
      options.name
    }
  })
  let prefix = ref("")
  let binaryName = ref(textEncode(name.contents))
  if binaryName.contents->Uint8Array.length != name.contents->Js.String.length {
    None
  } else {
    let invalidate = ref(false)
    while name.contents->Js.String.length > 100 {
      let spec = "/"->Js.String.indexOf(name.contents)
      switch spec {
      | -1 => invalidate := true
      | _ => {
          let range = name.contents->Js.String.slice(~from=0, ~to_=spec)
          prefix := if prefix.contents->Js.String.length > 0 {
              "/" ++ range
            } else {
              range
            }
          name :=
            name.contents->Js.String.slice(~from=spec + 1, ~to_=name.contents->Js.String.length)
        }
      }
    }
    switch invalidate.contents {
    | true => None
    | _ =>
      // Fix binaryName again.
      binaryName := if binaryName.contents->Uint8Array.length !== name.contents->Js.String.length {
          textEncode(name.contents)
        } else {
          binaryName.contents
        }
      let lengthOverflow =
        binaryName.contents->Uint8Array.length + prefix.contents->Js.String.length > 255
      let linkname = linkname->textEncode
      let linkNameOverflow = linkname->Uint8Array.length > 100
      if lengthOverflow || linkNameOverflow {
        None
      } else {
        binaryName.contents->Uint8Array.setArrayOffset(block, 0)
        // mode
        mode
        ->octalEncode(Some(6))
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 100)
        // uid
        uid
        ->octalEncode(Some(6))
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 108)
        // gid
        gid
        ->octalEncode(Some(6))
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 116)

        // size
        let octalSize = size->octalEncode(None)
        if octalSize->Js.String.length > 11 {
          // big ending
          let overflowSize = ref(size)
          let t: array<int> = []
          for i in 11 downto 0 {
            t->Array.set(11 - i, land(overflowSize.contents, 0xff))
            overflowSize := overflowSize.contents / 0x100->Int.toFloat->Js.Math.floor_int
          }
          t->Array.unshift(0x80)
        } else {
          size
          ->octalEncode(Some(11))
          ->textEncode
          ->Uint8Array.setArrayOffset(block, 124)
        }

        // mtime
        mtime
        ->octalEncode(Some(11))
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 136)
        // typeflag
        (zero_offset->Char.code->Int.toString ++ typeflag)
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 156)
        if options.linkname->Js.String.length > 0 {
          linkname->Uint8Array.setArrayOffset(block, 157)
        }
        // magic and version
        "ustar"->textEncode->Uint8Array.setArrayOffset(block, 257)
        "00"->textEncode->Uint8Array.setArrayOffset(block, 263)

        if uname->Js.String.length > 0 {
          uname->textEncode->Uint8Array.setArrayOffset(block, 265)
        }
        if gname->Js.String.length > 0 {
          gname->textEncode->Uint8Array.setArrayOffset(block, 297)
        }

        devmajor
        ->octalEncode(Some(6))
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 329)

        devminor
        ->octalEncode(Some(6))
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 337)

        if prefix.contents->Js.String.length > 0 {
          prefix.contents
          ->textEncode
          ->Uint8Array.setArrayOffset(block, 345)
        }

        // chksum
        block
        ->chksum
        ->octalEncode(Some(6))
        ->textEncode
        ->Uint8Array.setArrayOffset(block, 148)

        Some(block)
      }
    }
  }
}

type decodeOptions = {
  filenameEncoding: string,
  allowUnknowFormat: bool,
}

type decodeResult = {
  name: option<string>,
  mode: option<int>,
  uid: option<int>,
  gid: option<int>,
  size: option<int>,
  mtime: option<int>,
  chksum: option<int>,
  typeflag: option<string>,
  linkname: option<string>,
  uname: option<string>,
  gname: option<string>,
  devmajor: option<int>,
  devminor: option<int>,
}

let decode = (b: u8, options: decodeOptions) => {
  let {filenameEncoding, allowUnknowFormat} = options

  let name = b->strDecode(0, 100, Some(filenameEncoding))
  let mode = b->octalDecode({len: 8, offset: Some(100)})
  let uid = b->octalDecode({len: 8, offset: Some(108)})
  let gid = b->octalDecode({len: 8, offset: Some(116)})
  let size = b->octalDecode({len: 12, offset: Some(124)})
  let mtime = b->octalDecode({len: 12, offset: Some(136)})
  let linkname = switch b->Uint8Array.unsafe_get(157) {
  | None => None
  | Some(_) => b->strDecode(157, 100, Some(filenameEncoding))
  }
  let typeflag = switch b->Uint8Array.get(156) {
  | 0 => zero_offset->Char.code->String.fromCharCode
  | bb => (bb - zero_offset->Char.code)->String.fromCharCode
  }
  let uname = b->strDecode(265, 32, None)
  let gname = b->strDecode(297, 32, None)
  let devmajor = b->octalDecode({len: 8, offset: Some(329)})
  let devminor = b->octalDecode({len: 8, offset: Some(337)})

  let c = b->chksum

  switch c {
  | 512 => None
  | cc =>
    switch b->octalDecode({len: 8, offset: Some(148)}) {
    | None =>
      Error.make(
        "'Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?",
      )->Error.raise
    | Some(parsed_chksum) =>
      if cc !== parsed_chksum {
        Error.make(
          "'Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?",
        )->Error.raise
      } else {
        Some({
          name,
          mode,
          uid,
          gid,
          size,
          mtime,
          chksum: Some(cc),
          typeflag: Some(typeflag),
          linkname,
          uname,
          gname,
          devmajor,
          devminor,
        })
      }
    }
  }
}
