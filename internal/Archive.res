// Archive contains pack and extract functions.

module Pack = {
  type t = Fs.ReadStream.t
  open! External
  open! Head
  type mutableSate = {mutable finished: bool}

  type packOption = {
    filename: string,
    uid?: int,
    gid?: int,
    mode?: int,
    typeflag?: TypeFlag.t,
    linkname?: string,
    uname?: string,
    gname?: string,
    devmajor?: int,
    devminor?: int,
  }

  type addFn = (Uint8Array.t, packOption) => unit

  type doneFn = unit => unit

  type self = {add: addFn, done: doneFn}

  module Receiver = {
    let make = () => {
      open Stream.Readable
      let options = makeOptions(
        ~destroy=@this (_, ~error, ~callback) => callback(~error=Js.Nullable.toOption(error)),
        ~read=@this (_, ~size as _) => (),
        (),
      )

      make(options)
    }
  }

  module Impl = {
    let state: mutableSate = {finished: false}
    let resolveHeadOptions = (binary: Uint8Array.t, opts: packOption) => {
      let defaultOptions: Head.EncodeHeadOptions.t = {
        name: opts.filename,
        mode: switch opts.mode {
        | Some(mode) => mode
        | None => 0o644
        },
        uid: opts.uid,
        gid: opts.gid,
        mtime: (Date.now() /. 1000.0)->Js.Math.floor_int,
        size: binary->Uint8Array.length,
        typeflag: switch opts.typeflag {
        | Some(typeflag) => typeflag
        | None => TypeFlag.AREG_TYPE
        },
        linkname: opts.linkname,
        uname: opts.uname,
        gname: opts.gname,
        devmajor: opts.devmajor,
        devminor: opts.devminor,
      }

      defaultOptions
    }

    let transport = (file: Uint8Array.t, opts: Head.EncodeHeadOptions.t) => {
      open Stream.Readable
      let options = makeOptions(
        ~destroy=@this (_, ~error, ~callback) => callback(~error=Js.Nullable.toOption(error)),
        ~read=@this (_, ~size as _) => (),
        (),
      )

      make(options)
    }

    // let receiver = () => {
    //   open Stream.Writable
    //   let options = makeOptions(
    //     ~destroy=@this (_, ~error, ~callback) => callback(~error=Js.Nullable.toOption(error)),
    //     ~write=@this
    //     (_, ~data, ~encoding as _, ~callback) => {
    //       Js.log(data)
    //       callback(~error=None)
    //     },
    //     (),
    //   )
    //   make(options)
    // }
  }

  let add: addFn = (file: Uint8Array.t, opts: packOption) => {
    let resolvedOptions = Impl.resolveHeadOptions(file, opts)
    let o = Impl.transport(file, resolvedOptions)
    Js.log(o)
  }

  let done: doneFn = () => ()

  let make = (): self => {
    let receiver = Receiver.make()
    {
      add,
      done,
    }
  }
}

let pack = () => Pack.make()
