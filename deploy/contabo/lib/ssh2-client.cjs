const path = require("path");

const ssh2Root = path.join(
  process.env.TEMP || process.env.TMPDIR || "/tmp",
  "nashir-ssh",
  "node_modules",
  "ssh2"
);

module.exports = {
  Client: require(ssh2Root).Client,
  ssh2Root,
};
