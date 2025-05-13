# Icons

Place the following icon files in this directory:

- `icon.png` - Main application icon (256x256 recommended)
- `tray-icon.png` - Tray icon (16x16 or 32x32 recommended)
- `logo.png` - Logo used in the application UI (40x40 recommended)

## Icon Requirements

### Windows
Windows requires `.ico` format for application icons. Convert your `.png` files to `.ico` format before building for Windows.

### macOS
macOS requires `.icns` format for application icons. Convert your `.png` files to `.icns` format before building for macOS.

## Conversion Tools

- [ImageMagick](https://imagemagick.org/) - Command-line tool for image conversion
- [Icon Converter](https://iconverticons.com/) - Online tool for icon conversion

## Example Command

Using ImageMagick to convert PNG to ICO:

```
convert icon.png -define icon:auto-resize=16,32,48,64,128,256 icon.ico
``` 