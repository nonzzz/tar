// It's a simple Text Encode/Decode bindings for rs.

// https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder
// https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder

type decoder = {decode: Js.Typed_array.Uint8Array.t => string}

type encoder = {encode: string => Js.Typed_array.Uint8Array.t}

module TextDecoder = {
  %%private(@new external _make: 'a => decoder = "TextDecoder")
  let make = _make
}

module TextEncoder = {
  %%private(@new external _make: 'a => encoder = "TextEncoder")
  let make = _make
}

%%private(let _decoder: decoder = TextDecoder.make())

%%private(let _encoder: encoder = TextEncoder.make())

module Utf8 = {
  let encode = (s: string) => s->_encoder.encode
  let decode = (u8: Js.Typed_array.Uint8Array.t) => u8->_decoder.decode
}
