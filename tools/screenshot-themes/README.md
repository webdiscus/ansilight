# Screenshot Themes

Local-only tool for making real iTerm screenshots of theme previews.

It is meant for visual docs, not for tests or CI.

## Requirements

- macOS
- iTerm2
- Screen Recording permission for the terminal app that runs this script
- Automation permission to control iTerm2

The result depends on your current iTerm profile, font, font size, window size, and color settings.

Screenshots are captured from the configured screen rectangle. The script sets
the iTerm window to the same rectangle before each capture.

The tool checks Screen Recording permission before it starts. If permission is
missing, it prints setup instructions and opens the Screen Recording settings
page.

## Usage

```sh
node tools/screenshot-themes/screenshot-themes.js --config tools/screenshot-themes/screenshot-themes.config.example.json
```

Generated files:

```txt
docs/theme-screenshots/*.png
docs/theme-gallery.md
```

## Config

```json
{
  "lang": "javascript",
  "width": 100,
  "padding": 1,
  "start": 0,
  "limit": 1,
  "header": false,
  "footer": false,
  "themes": [],
  "outputDir": "docs/theme-screenshots",
  "galleryPath": "docs/theme-gallery.md",
  "galleryColumns": 2,
  "crop": "auto",
  "cropTolerance": 24,
  "cropPadding": 0,
  "openWindowDelay": 800,
  "displayDelay": 150,
  "closeWindow": true
}
```

Options:

- `lang` - snippet language id from `examples/snippets.json`.
- `width` - preview block width.
- `padding` - preview block padding.
- `start` - preview sample offset.
- `limit` - preview sample limit.
- `header` - show or hide the preview header.
- `footer` - show or hide the preview footer.
- `themes` - theme names from `/themes`. Empty or missing means all themes.
- `outputDir` - PNG output directory.
- `galleryPath` - markdown gallery path.
- `galleryColumns` - markdown gallery columns. Minimum is `1`, maximum is `5`.
- `crop` - `auto` detects the sample block from a default-theme probe screenshot.
- `cropTolerance` - RGB tolerance for auto crop detection.
- `cropPadding` - extra pixels around the detected sample block.
- `openWindowDelay` - wait time after opening the iTerm window, in milliseconds.
- `displayDelay` - wait time after rendering preview, in milliseconds.
- `closeWindow` - close the iTerm window after screenshot.
- `window` - screen rectangle used for iTerm window and screenshot capture.

The script runs `examples/preview.js` for each theme.

Auto crop uses `default` theme as a probe. The detected rectangle is then used
for all selected themes, so all screenshots have the same size.
