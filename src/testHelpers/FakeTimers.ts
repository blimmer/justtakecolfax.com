import type { Timers } from "../scripts/context";

export class FakeTimers implements Timers {
  private readonly pending = new Map<number, () => void>();
  private nextId = 1;

  setTimeout(callback: () => void) {
    const id = this.nextId++;
    this.pending.set(id, callback);
    return id;
  }

  clearTimeout(id: number | undefined) {
    if (id !== undefined) this.pending.delete(id);
  }

  get pendingCount() {
    return this.pending.size;
  }

  runAll() {
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    callbacks.forEach((callback) => callback());
  }
}
