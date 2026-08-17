const fs = require("fs");
const path = require("path");
const https = require("https");

const dest = path.join(__dirname, "..", "..", "apps", "wp-theme", "assets", "art");
fs.mkdirSync(dest, { recursive: true });

const files = [
  [
    "hero.jpg",
    "https://delivery.us4.bfl.ai/durable/2026081519/8021894b-e011-490a-8407-b4d7b3c3a4a8/9e/140314c863a599/c863a59971ca46f18011cb9ed4dbb67a/sample.jpeg?se=2026-08-15T19%3A22%3A20Z&sp=r&sv=2026-02-06&sr=b&rsct=image/jpeg&sig=bWeD9maCFZFvVWVCDQ90g8I33%2BVRnsoF6H8BOwiWtlk%3D",
  ],
  [
    "editor.jpg",
    "https://delivery.eu2.bfl.ai/durable/2026081519/8021894b-e011-490a-8407-b4d7b3c3a4a8/e2/134900ff4d795c/ff4d795c4ae14476ba23c85baa08a980/sample.jpeg?se=2026-08-15T19%3A22%3A15Z&sp=r&sv=2026-02-06&sr=b&rsct=image/jpeg&sig=0/5Y6d7HQ6PedH9yjTOz%2Bybo5XHbBpzlw0FGiDv4l/M%3D",
  ],
  [
    "social.jpg",
    "https://delivery.us2.bfl.ai/durable/2026081519/8021894b-e011-490a-8407-b4d7b3c3a4a8/ee/136805933d2d8d/933d2d8d5cac45caa0e643f0d8a5dd30/sample.jpeg?se=2026-08-15T19%3A22%3A16Z&sp=r&sv=2026-02-06&sr=b&rsct=image/jpeg&sig=BaEdkGOBK3jA3MrlOcjtMIzxIVbO/AhWOTJsty7fND8%3D",
  ],
  [
    "calendar.jpg",
    "https://delivery.us2.bfl.ai/durable/2026081519/8021894b-e011-490a-8407-b4d7b3c3a4a8/a6/136485dd672b79/dd672b79f326471d94c7be52edeed12b/sample.jpeg?se=2026-08-15T19%3A22%3A16Z&sp=r&sv=2026-02-06&sr=b&rsct=image/jpeg&sig=FPT8zSwFjK0hT4lA5X7wos%2Bnwo0MC1rVxxgDq/XXYPI%3D",
  ],
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 NashirArt/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${res.statusCode} ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

(async () => {
  for (const [name, url] of files) {
    const buf = await get(url);
    fs.writeFileSync(path.join(dest, name), buf);
    console.log(name, buf.length);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
