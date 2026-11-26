import { test as base } from "@playwright/test";

/**
 * Blocks requests that leave the preview server, so tests never spend Google
 * Maps quota, and records Content Security Policy violations.
 */
export const test = base.extend<{ cspViolations: string[] }>({
  page: async ({ page, baseURL }, use) => {
    await page.route(
      (url) => !url.href.startsWith(baseURL!),
      (route) => route.abort(),
    );
    await use(page);
  },
  cspViolations: async ({ page }, use) => {
    const violations: string[] = [];
    await page.exposeFunction("reportCspViolation", (violation: string) =>
      violations.push(violation),
    );
    await page.addInitScript(() =>
      document.addEventListener("securitypolicyviolation", (event) =>
        (
          window as unknown as { reportCspViolation(v: string): void }
        ).reportCspViolation(`${event.violatedDirective} ${event.blockedURI}`),
      ),
    );
    await use(violations);
  },
});

export { expect } from "@playwright/test";
