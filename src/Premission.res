// https://www.gnu.org/software/coreutils/manual/html_node/Numeric-Modes.html

// We use octal number to define the premisson mode.

type mod = {
  ts_uid: int, // 0o4000
  ts_gid: int, // 0o2000
  ts_vtx: int, // 0o1000 // reserved
  tu_read: int, // 0o0400
  tu_write: int, // 0o0200
  tu_exec: int, // 0o0100
  tg_read: int, // 0o0040
  tg_write: int, // 0o0020
  tg_exec: int, // 0o0010
  to_read: int, // 0o0004
  to_write: int, // 0o0002
  to_exec: int, // 0o0001
}

let mod = {
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
  to_exec: 0o0001,
}
