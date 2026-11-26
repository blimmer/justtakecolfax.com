# justtakecolfax.com

A charming little number that suggests taking Colfax Avenue in Denver, CO (even when it's the worst choice).

Built with [Astro](https://astro.build).

## Development

Requires [mise](https://mise.jdx.dev), which installs the pinned Node and pnpm versions.

```sh
mise install
mise run setup # installs dependencies and creates .env
pnpm dev
```

The directions page reads its browser Google Maps key from `GOOGLE_MAPS_API_KEY` at build time. Keys aren't committed:

- **Development:** a key that allows the `http://localhost:4321/*` referrer, in the gitignored `.env`. `mise run setup` creates `.env` from `.env.example`; [create your own key](https://developers.google.com/maps/documentation/javascript/get-api-key) and add it there. If the [1Password CLI](https://developer.1password.com/docs/cli/) can read the maintainer's dev key, setup writes that key instead, and each run refreshes it.
- **Production:** a justtakecolfax.com-only key, stored as the `GOOGLE_MAPS_API_KEY` Actions secret.

Both keys need the **Maps JavaScript API**, **Routes API**, and **Places API (New)**.

## Commands

| Command          | Action                                          |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Start the dev server at `localhost:4321`        |
| `pnpm build`     | Type-check and build the static site to `dist/` |
| `pnpm preview`   | Preview the production build                    |
| `pnpm format`    | Format with Prettier                            |
| `pnpm test:unit` | Run the Vitest unit tests                       |
| `pnpm test:e2e`  | Run the Playwright tests against `dist/`        |

## Testing

- **Unit tests** (Vitest) live next to the code in `src/`. Browser code takes its Google Maps libraries, logger, and timers from a `Context` (`src/scripts/context.ts`). Tests pass fakes through `createTestContext` and render real components with Astro's container API, so they never call Google.
- **End-to-end tests** (Playwright) in `tests/` run against `pnpm preview`, so they see the production Content Security Policy. Build first, and install browsers once with `pnpm exec playwright install`:

  ```sh
  pnpm build
  pnpm test:e2e
  ```

  The tests block every request that leaves the preview server, so they don't use Google Maps quota.

## Deployment

Pushes to `main` build the site and sync `dist/` to S3 behind CloudFront.
