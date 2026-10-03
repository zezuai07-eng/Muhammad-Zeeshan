const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const targetDir = path.join(rootDir, 'CLOUDFLARE_UPLOAD_FOLDER');

console.log('[Sync-Cloudflare] Syncing latest build from dist to CLOUDFLARE_UPLOAD_FOLDER...');

if (!fs.existsSync(distDir)) {
  console.error('[Sync-Cloudflare] Error: dist directory does not exist! Run vite build first.');
  process.exit(1);
}

// Ensure target directory exists and is fresh
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// Recursive copy helper
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(distDir, targetDir);
console.log('[Sync-Cloudflare] Successfully copied all production files to CLOUDFLARE_UPLOAD_FOLDER!');

// Create fresh archive packages (tar.gz and zip) for easy 1-click download/upload
try {
  const tarPath = path.join(rootDir, 'cloudflare_upload.tar.gz');
  if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
  execSync(`tar -czf "${tarPath}" -C "${targetDir}" .`, { stdio: 'inherit' });
  console.log('[Sync-Cloudflare] Created cloudflare_upload.tar.gz successfully');
} catch (err) {
  console.warn('[Sync-Cloudflare] Notice tar error:', err.message);
}

try {
  // Use python shutil to create clean, reliable zip file
  execSync(`python3 -c "import shutil, sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2])" "${path.join(rootDir, 'cloudflare_upload')}" "${targetDir}"`, { stdio: 'inherit' });
  console.log('[Sync-Cloudflare] Created cloudflare_upload.zip successfully');
} catch (err) {
  console.warn('[Sync-Cloudflare] Notice zip error:', err.message);
}

// Log check
const targetAssets = fs.readdirSync(path.join(targetDir, 'assets'));
console.log('[Sync-Cloudflare] Verified CLOUDFLARE_UPLOAD_FOLDER assets:', targetAssets);
console.log('[Sync-Cloudflare] Ready for Cloudflare Pages Deployment!');
