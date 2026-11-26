export function query<T extends Element>(
  root: ParentNode,
  selector: string,
  type: new () => T,
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`Expected ${selector} to be a ${type.name}`);
  }
  return element;
}
