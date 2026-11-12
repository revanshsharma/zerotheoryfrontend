export const EMOJI = ['😀', '😂', '🥹', '😍', '😎', '🤔', '😴', '🥳', '👋', '👏', '🙏', '💚', '🔥', '✨', '🌧️', '🌙', '🎵', '☕', '🍵', '🌿', '🍂', '🌻', '🐸', '🐈', '👀', '🫶', '🤝', '👍', '😭', '🥲'];

/** `:heart:` style shortcodes typed in chat become emoji before sending. */
const SHORT: Record<string, string> = {
  heart: '💚', smile: '😀', laugh: '😂', cry: '😭', sparkles: '✨', wave: '👋', fire: '🔥', moon: '🌙', rain: '🌧️', music: '🎵', coffee: '☕', tea: '🍵', leaf: '🌿', cat: '🐈', frog: '🐸', clap: '👏', think: '🤔', sleep: '😴',
};
export function expandShortcodes(text: string): string {
  return text.replace(/:([a-z]{2,10}):/g, (m, k: string) => SHORT[k] ?? m);
}
