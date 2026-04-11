const fs = require('fs');
const path = require('path');

// Use PowerShell via child process to resize with System.Drawing
const { execSync } = require('child_process');

const pngPath = path.join(__dirname, 'build', 'icon.png');
const resizedPath = path.join(__dirname, 'build', 'icon-256.png');
const icoPath = path.join(__dirname, 'build', 'icon.ico');

// Resize to 256x256 using PowerShell
console.log('Resizing PNG to 256x256...');
execSync(
  `powershell -NoProfile -Command ` +
  `"Add-Type -AssemblyName System.Drawing; ` +
  `$src = [System.Drawing.Image]::FromFile('${pngPath.replace(/\\/g, '\\\\')}'); ` +
  `$bmp = New-Object System.Drawing.Bitmap(256, 256); ` +
  `$g = [System.Drawing.Graphics]::FromImage($bmp); ` +
  `$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality; ` +
  `$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; ` +
  `$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality; ` +
  `$rect = New-Object System.Drawing.Rectangle(0, 0, 256, 256); ` +
  `$g.DrawImage($src, $rect); ` +
  `$g.Dispose(); $src.Dispose(); ` +
  `$bmp.Save('${resizedPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png); ` +
  `$bmp.Dispose();"`,
  { stdio: 'inherit' }
);

// Read resized PNG
const pngData = fs.readFileSync(resizedPath);
console.log(`Resized PNG size: ${pngData.length} bytes`);

// Create proper ICO file
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type: 1 = ICO
header.writeUInt16LE(1, 4); // Count: 1 image

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0);     // Width: 0 = 256
entry.writeUInt8(0, 1);     // Height: 0 = 256
entry.writeUInt8(0, 2);     // ColorCount: 0 = >=256 colors
entry.writeUInt8(0, 3);     // Reserved
entry.writeUInt16LE(1, 4);  // Planes: 1
entry.writeUInt16LE(32, 6); // BitCount: 32
entry.writeUInt32LE(pngData.length, 8);  // Size of image data
entry.writeUInt32LE(22, 12); // Offset: header(6) + entry(16) = 22

const ico = Buffer.concat([header, entry, pngData]);
fs.writeFileSync(icoPath, ico);

console.log(`\nIcon created: ${icoPath}`);
console.log(`Total ICO size: ${ico.length} bytes`);

// Cleanup
fs.unlinkSync(resizedPath);
console.log('Done!');
