# Promo reel

`azhagar-reel.mp4` — a 15-second vertical (1080×1920, 30 fps) animated promo for Instagram/Reels,
built in the site's edit-suite style: intro → AI walk-in → services → tools → contact.

It is code-animated: `reel.html` draws any moment with `render(t)`, and `render.js` screenshots
every frame with Playwright. To re-render after editing the text in `reel.html`:

```bash
cd promo
node render.js full frames
ffmpeg -framerate 30 -i frames/%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart azhagar-reel.mp4
rm -rf frames
```

There is no music; add a track in your editor or in Instagram.
