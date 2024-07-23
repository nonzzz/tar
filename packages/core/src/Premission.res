// https://www.gnu.org/software/coreutils/manual/html_node/Numeric-Modes.html

// We use octal number to define the premisson mode.

module Mod = {
  let ts_uid = 0o4000
  let ts_gid = 0o2000
  let ts_vtx = 0o1000 // reserved
  let tu_read = 0o0400
  let tu_write = 0o0200
  let tu_exec = 0o0100
  let tg_read = 0o0040
  let tg_write = 0o0020
  let tg_exec = 0o0010
  let to_read = 0o0004
  let to_write = 0o0002
  let to_exec = 0o0001
}
