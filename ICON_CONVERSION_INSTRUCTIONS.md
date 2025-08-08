
# Icon Conversion Instructions

The app.json is currently configured to use SVG files, but Expo requires PNG files for app icons.

To fix this, you need to:

1. Convert icumbi-logo-final.svg to PNG format
2. Create the following PNG files:
   - icon.png (1024x1024)
   - adaptive-icon.png (1024x1024)
   - splash.png (1242x2436)

You can use online tools like:
- https://convertio.co/svg-png/
- https://cloudconvert.com/svg-to-png
- Or use a design tool like Figma, Sketch, or Adobe Illustrator

The SVG file is located at: assets/icumbi-logo-final.svg

Once you have the PNG files, update app.json to use:
- "icon": "./assets/icon.png"
- "splash": { "image": "./assets/splash.png" }
- "android": { "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png" } }
