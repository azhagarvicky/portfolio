# Promo videos

Two 15-second vertical (1080×1920, 30 fps) videos for Instagram/Reels:

| File | Style | Source |
|---|---|---|
| `azhagar-ad.mp4` | High-energy hype ad: beat cuts, word slams, colour flashes, RGB-split glitches, stickers, speed-ramped AI walk-in. Has a synthesized beat. | `ad.html` + `soundtrack.py` |
| `azhagar-reel.mp4` | Calmer edit-suite promo matching the site. Silent. | `reel.html` |

Both are animated in code: each HTML page draws any moment with `render(t)`, and `render.js`
screenshots every frame with Playwright.

## Re-render the ad after editing `ad.html`

```bash
node render.js full frames ad.html
node cuts.js > cuts.json
python3 soundtrack.py cuts.json beat.wav
ffmpeg -framerate 30 -i frames/%04d.jpg -i beat.wav -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -shortest -movflags +faststart azhagar-ad.mp4
rm -rf frames cuts.json beat.wav
```

The beat's hits land on the cut times in `ad.html`, so re-run `cuts.js` and `soundtrack.py` whenever you change the timing.
For the reel, use `reel.html` and drop the audio steps.
