**English** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# Voxel Musou — Zhao Yun (趙雲)

<p align="center">
  <a href="https://voxel-musou.vercel.app"><img src="media/gameplay.gif" alt="Zhao Yun vs 300 soldiers — the Musou" width="100%"></a>
</p>

<p align="center"><b><a href="https://voxel-musou.vercel.app">▶ Play in your browser — voxel-musou.vercel.app</a></b></p>

| | |
| --- | --- |
| ![Crowd fight, 400+ hit chain](media/crowd.jpg) | ![Charge sweep](media/sweep.jpg) |
| Crowd fight, 400+ hit chain | Charge sweep |
| ![Musou cut-in](media/musou.jpg) | ![Musou dragon, 150 K.O.](media/dragon.jpg) |
| Musou cut-in | Musou dragon, 150 K.O. |

A browser-playable voxel action game in the style of Dynasty Warriors, built with Three.js. It started as a one-man army demo (Zhao Yun against ~300 Wei soldiers) and has grown into a **four-faction commander game**: lead a general and an army, guard your flagpole, seize the center flag and cut down your rivals' banners — against the computer or up to 3 friends.

No build step: plain ES modules, Three.js r186 vendored in `vendor/three/`, deterministic fixed 60 Hz simulation.

## Game modes

| Mode | What it is |
| --- | --- |
| **Room with friends** | Create a room (6-digit code) or join one, up to 4 players. Take turns picking a faction (10 s each), then pick a general (15 s). One player's browser hosts the simulation; a small relay server (`server/`) connects everyone. |
| **Play vs computer (PvE)** | You + 1–3 AI opponents that pick the remaining factions and generals at random. Easy / Normal / Hard (reaction time 1.0 / 0.5 / 0.25 s, income ×0.8 / ×1.0 / ×1.2). |
| **Practice alone** | A full match against a general who stands still — handy for trying the shop, orders and flags. |
| **Musou demo (classic)** | The original one-man-army demo: Zhao Yun against a crowd of Wei soldiers. |

### The rules in short

- A match lasts **15 minutes**. Every player owns a **flagpole** (1 500 HP). Lose it and you are out; **cut every rival flagpole to win at once** (+1 000 gold for each one you cut). If time runs out, the player who **earned the most gold** wins (equal scores = draw).
- The **center flag**: stand within 4 m for 5 s (uncontested) to capture it — the holder earns **×1.5** income.
- Income is 10 gold/s (300 to start). Spend it in the **shop** (`B`): single troops (spear / sword & shield / archer, 50 gold), a **squad combo** (13 troops, 500 gold), up to 8 shield-and-spear **flag guards**, and **upgrades** (levels 2–3, 300 / 600 gold). At most 60 mobile troops. The rock-paper-scissors is spear > archer > sword & shield > spear (×1.5 damage).
- You command your army with four **orders**: Follow, Defend, Attack, Retreat (`1`–`4`).
- If your general falls, his followers vanish, but your flag guards, gold and upgrades stay; he respawns after 10 s with a lieutenant and a standard bearer. Troops bought while waiting appear on respawn.

## Features

- Classic action: flowing normal combos (N1–N6), charge attacks (C1–C6), hit-stop and impact VFX
- Four factions (Wei, Shu, Wu, Yellow Turbans) with their own colors, banners and 20 generals to choose from (only Zhao Yun has a dedicated model/move set so far — the others borrow his for now)
- Army of voxel soldiers (InstancedMesh) with formations, targeting, counters and four commands
- Economy, shop and upgrades; flagpoles, center flag, respawns, minimap and result screen
- AI opponents (commander that spends gold and gives orders + a general with a small state machine)
- Online rooms for up to 4 players (host-authoritative, 20 Hz snapshots, reconnect within 60 s)
- Vietnamese and English interface (switch on the title screen)
- Golden-hour castle battlefield, custom post-processing (haze, depth of field, bloom, retro pixel look), procedural WebAudio sound, calligraphy-style HUD

## Run

ES modules don't load from `file://`, so serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000 . Requires a WebGL2 browser; a desktop GPU is recommended. Sound starts on the first key press or click.

### Online rooms (optional)

Rooms need the relay server (Node.js 18+, the only dependency is `ws`). It also imports the shared config from `src/`, so run it from the repo root:

```sh
npm install --prefix server
npm run server          # listens on :8787, GET /health → ok
```

When the page is opened from `localhost` it connects to `ws://localhost:8787` automatically. For a deployed server open the page with `?server=wss://your-server` (or set `DEFAULT_SERVER_URL` in `src/net/client.js`). Deployment notes and a Render blueprint: [`server/DEPLOY.md`](server/DEPLOY.md), [`render.yaml`](render.yaml). The room host's browser tab must stay in the foreground — a throttled background tab slows the whole room.

### Tests

```sh
npm test
```

Runs the Node tests (rules, economy, army, AI, network protocol, rooms, i18n). The WebSocket test uses Node's built-in `WebSocket`, so Node 22+ is recommended.

## Controls

Keyboard and mouse; a gamepad is optional.

| Action | Keys |
| --- | --- |
| Move (camera-relative) | WASD / arrow keys |
| Normal attack | J / left mouse (the 3rd J in a row automatically becomes a heavy attack) |
| Charge attack | K / right mouse |
| Camera orbit | mouse drag / Q E |
| Health potion | R (5 potions, each restores 30% of max HP; when they run out, return to your own flagpole — or the center flag if you hold it — to refill) |
| Orders: Follow / Defend / Attack / Retreat | 1 / 2 / 3 / 4 (gamepad D-pad) |
| Shop | B (the match keeps running) |
| Pause / menu | Esc (in online matches the game keeps running) |
| Start | Enter / click 出陣 |

Only two attack buttons remain: J and K. Jump, dodge and Musou skills are switched off for every general (input is filtered in `src/hero/controls.js`).

![Title screen with the full controls](media/title.jpg)

## Options

| URL parameter | Description |
| --- | --- |
| `?enemies=N` | Number of enemy soldiers in the Musou demo, 0–2000 (default 300) |
| `?server=wss://…` | Room server address (default: `ws://localhost:8787` on localhost) |
| `?mode=sandbox` | Boot straight into the "Practice alone" match |
| `?gold=N`, `?nodef=1`, `?flaghp=N` | Test knobs for matches: starting gold, no enemy defenders, flagpole HP |
| `?debug=1`, `?norender=1` | Developer hooks (`window.__game`, `__ff(n)`), skip drawing so the sim runs at full speed without a GPU |

## Project layout

```
index.html      entry point, importmap, HUD CSS
src/            core, hero, combat, crowd, musou, camera, vfx, post, world, audio, ui
                army/ match/ ai/ net/ i18n/ config/ data/   (commander game: units, rules, AI, networking, strings, balance)
server/         room/lobby/relay server (Node + ws) — deployed separately
tests/          node --test suites
vendor/three/   Three.js r186
media/          README screenshots and GIF
```

## Credits & License

- Code: MIT, see [LICENSE](LICENSE).
- [three.js](https://threejs.org/): MIT.
- HUD fallback font `src/ui/brush.woff2` is a subset of Yuji Boku by Kinuta Font Factory, licensed under the SIL Open Font License 1.1.
- Interface fonts in `src/ui/fonts/`: [Noto Serif](https://fonts.google.com/noto/specimen/Noto+Serif) and [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro), both SIL Open Font License 1.1 (license texts included).

This is a fan project, not affiliated with or endorsed by KOEI TECMO. "Dynasty Warriors" is a trademark of KOEI TECMO. No game assets from the original games are included.
