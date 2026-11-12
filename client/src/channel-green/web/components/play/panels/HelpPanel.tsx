import { BRAND } from '@channel-green/shared';
export function HelpPanel() {
  return (
    <div className="prose-cg space-y-3 text-sm">
      <p><strong>Walk</strong> with WASD or the arrow keys. On a phone, use the arrows at the bottom left.</p>
      <p><strong>Interact</strong> with E, Space or the button that appears near things. Sit on benches, read signs, step onto glowing doors to go to another room.</p>
      <p><strong>Chat</strong> by pressing Enter. Click a name to wave, hug, ask to chat, mute, block or report.</p>
      <p><strong>Emotes</strong> are the little faces at the bottom.</p>
      <p><strong>Sound</strong> is off until you turn it on. <strong>Voice and video</strong> only start after you say yes.</p>
      <p><strong>Private rooms</strong> are in the Rooms panel. Share the code with people you want there.</p>
      <p className="text-olive-soft">Be kind. If something is wrong, use Report. Blocking is always one click away.</p>
      <p className="pt-1 text-center font-pixel text-base text-orange">{BRAND.quote}</p>
    </div>
  );
}
