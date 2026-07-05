# macOS icons

Two icon paths ship from here.

## Flat icons (all platforms)

`src-tauri/app-icon-square.png` is the pristine 1024x1024 source art (full-bleed
blue tile). To regenerate the whole set under `src-tauri/icons/` (`.icns`, `.ico`,
PNGs) after changing the source art, run from the repo root:

```
pnpm icons
```

That runs `tools/gen-icons.mjs` (rounds and insets the art on Apple's grid, adds a
top sheen, writes `src-tauri/app-icon.png`) and then `tauri icon` on the master.
`sharp` is a devDependency, so no extra setup.

## Liquid Glass icon (macOS 26 Tahoe) - disabled

This path is kept for reference but not shipped. The layered icon renders muted
in the real Tahoe dock (the system darkens it, and our gradient already fades to
near-black in a corner), so the flat lit `.icns` above is used on every macOS
version instead. To re-enable, recompile `Assets.car` (below), add
`bundle.macOS.files` mapping `Resources/Assets.car` in `tauri.conf.json`, and add
an `Info.plist` in `src-tauri` setting `CFBundleIconName` to `AppIcon`.

macOS 26 lights layered `.icon` bundles dynamically. `AppIcon.icon/` is the
layered source: a dragon-free gradient `background.png` plus a soft-alpha
`dragon.png`, described by `icon.json`. Regenerate the layers with:

```
node tools/layers.mjs ../app-icon-square.png AppIcon.icon
```

Compile to the asset catalog with actool (Xcode 26):

```
xcrun actool AppIcon.icon --compile . \
  --app-icon AppIcon --include-all-app-icons --enable-on-demand-resources NO \
  --output-partial-info-plist /tmp/partial.plist \
  --development-region en --target-device mac \
  --minimum-deployment-target 26.0 --platform macosx
```

That emits `Assets.car`. Wire it in per the note above if re-enabling. The dragon
is a solid layer; add `"specular": true` to its group in `icon.json` for a
translucent glass glyph instead.
