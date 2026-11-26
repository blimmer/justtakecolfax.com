import type { Environment } from "vitest/runtime";
import { builtinEnvironments } from "vitest/runtime";

// happy-dom globals with Vite's SSR transform, so tests can render Astro components with the container API.
export default {
  ...builtinEnvironments["happy-dom"],
  name: "happy-dom-ssr",
  viteEnvironment: "ssr",
} satisfies Environment;
