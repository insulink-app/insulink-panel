# Screenshots

Every push to `main` photographs the demo's overview and publishes the pictures
next to it on GitHub Pages, like the app does (its `docs/SCREENSHOTS.md`). They
always show the current panel with the demo's sample data. Nothing is committed.

## Where they are

`https://insulink-app.github.io/insulink-panel/screenshots/<language>-<theme>/overview.png`

`<language>-<theme>` is `de-dark`, `de-light`, `en-dark` or `en-light`. Each
picture is 3200 x 1800 (a 1600 x 900 window at 2x, 16:9 like the
website's panel window). A deploy replaces the set, so
a fixed URL always serves the newest picture.

## How they are made

The `Demo` workflow builds the demo, serves it with `vite preview --mode demo`
and runs `e2e/demo-screenshots.mjs`. The script presets the language
(`i18nextLng`) and theme (`theme`, next-themes) in `localStorage` before the page
loads, waits for the network to settle plus 1.5 s for the chart animations, and
writes into `dist/screenshots/`, which the Pages upload then carries. An uncaught
page error fails the job, so the demo is never deployed with a broken picture.

Run it locally:

```bash
npm run build:demo
npx vite preview --mode demo --port 4173 &
node e2e/demo-screenshots.mjs http://localhost:4173/insulink-panel/ dist/screenshots
```

To add a page, loop over more paths in the script and save each under its name.
