# Trashketball — Out of Office

A first-person Three.js paper-toss game in two fully modelled rooms.

- **Level 1:** a Severance-inspired office with fluorescent panels, green carpet, retro terminals, and a metal mesh wastebasket.
- **Level 2:** an oceanfront Airbnb with a high ceiling, full-height glazing, upholstered sofas, animated water, and a timber wastebasket. Unlocks at 100 points.
- Every valid basket awards 10 points. The second level continues without a score limit.

## Play

Move over the room to aim. Hold and drag downward to increase power, then release. The slider and **Throw paper** button also work with touch. Keyboard: arrow keys aim, `+` / `−` change power, and Space throws. Sound, fullscreen, instructions, and restart are available in the game.

## Run locally

```sh
npm install
npm run dev
```

## Verify

```sh
npm test
npx tsc --noEmit
npm run build
```

Physics use meters and seconds, gravity of 9.81 m/s², exact integration of linear drag, 120 Hz simulation, and collision substeps bounded to 12 mm travel. The displayed trajectory uses the same simulation and ends at the first impact or basket entry. Rim rebounds may continue beyond that preview. Scoring requires descent through the ball-clear opening after being above the rim; each ball scores at most once.

The automated suite covers both levels, trajectory agreement, frame-rate independence, high-speed rim contact, invalid crossings, and duplicate scoring. Browser graphics and pointer interaction have not been tested through browser automation. WebMCP tools feature-detect support and share the visible game actions; a real browser WebMCP registry was unavailable for verification.

All environments, props, and paper balls are created in Three.js; there are no external model or image downloads at runtime. WebGL2 support is required. Progress is kept for the current play session.
