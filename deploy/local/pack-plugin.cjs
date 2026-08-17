const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const { ZipArchive } = await import(
    pathToFileURL(path.join(process.env.TEMP, "nashir-ssh", "node_modules", "archiver", "index.js")).href
  );

  const root = path.join(__dirname, "..", "..");
  const plugin = path.join(root, "apps", "plugin");
  const outFile = process.argv[2] || path.join(root, "apps", "web", "public", "downloads", "nashir.zip");

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

  const output = fs.createWriteStream(outFile);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.glob(
      "**/*",
      {
        cwd: plugin,
        ignore: ["**/*.keep", "**/.DS_Store"],
        dot: false,
      },
      { prefix: "nashir" },
    );
    archive.finalize();
  });

  console.log("Wrote", outFile, fs.statSync(outFile).size, "bytes");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
