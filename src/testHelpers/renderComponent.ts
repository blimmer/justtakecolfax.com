import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";

/** Renders an Astro component into the document, without its scripts. */
export async function renderComponent(component: AstroComponentFactory) {
  const container = await AstroContainer.create();
  const template = document.createElement("template");
  template.innerHTML = await container.renderToString(component);
  template.content
    .querySelectorAll("script")
    .forEach((script) => script.remove());
  document.body.replaceChildren(template.content);
}
