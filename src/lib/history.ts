// Navigation history for Alt+Left / Alt+Right. Separate from undo/redo: only jumps
// (links, outline, search results, "Go to page") record a position.

export interface Position {
  pageIndex: number;
}

const LIMIT = 100;

export class NavHistory {
  #back: Position[] = [];
  #forward: Position[] = [];

  /** Call before a jump with the position being left. */
  record(from: Position): void {
    const last = this.#back.at(-1);
    if (last?.pageIndex !== from.pageIndex) this.#back.push(from);
    if (this.#back.length > LIMIT) this.#back.shift();
    this.#forward = [];
  }

  back(current: Position): Position | null {
    const target = this.#back.pop();
    if (!target) return null;
    this.#forward.push(current);
    return target;
  }

  forward(current: Position): Position | null {
    const target = this.#forward.pop();
    if (!target) return null;
    this.#back.push(current);
    return target;
  }

  get canGoBack(): boolean {
    return this.#back.length > 0;
  }

  get canGoForward(): boolean {
    return this.#forward.length > 0;
  }

  clear(): void {
    this.#back = [];
    this.#forward = [];
  }
}
