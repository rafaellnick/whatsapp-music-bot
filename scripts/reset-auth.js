const { rmSync } = require('fs');

for (const path of ['.wwebjs_auth', '.wwebjs_cache']) {
  rmSync(path, { recursive: true, force: true });
  console.log(`Removed ${path}`);
}
