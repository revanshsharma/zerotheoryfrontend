/** Keyboard state is read from the window so typing in the chat box never moves the character. */
export class Controls {
  keys = new Set<string>();
  touch = { x: 0, y: 0 };
  private off: (() => void)[] = [];
  onAction: (() => void) | null = null;
  constructor() {
    const editing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (editing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if ((k === 'e' || k === 'enter' || k === ' ') && !this.keys.has(k)) this.onAction?.();
      this.keys.add(k);
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    const blur = () => this.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    this.off.push(() => window.removeEventListener('keydown', down), () => window.removeEventListener('keyup', up), () => window.removeEventListener('blur', blur));
  }
  vector(): { x: number; y: number } {
    const k = this.keys;
    let x = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    let y = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
    if (!x && !y) {
      x = this.touch.x;
      y = this.touch.y;
    }
    return { x, y };
  }
  trigger() {
    this.onAction?.();
  }
  destroy() {
    this.off.forEach((f) => f());
  }
}

