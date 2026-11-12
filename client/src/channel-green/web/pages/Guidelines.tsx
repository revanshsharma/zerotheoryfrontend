import Link from 'next/link';
import { BRAND } from '@channel-green/shared';

export const metadata = { title: 'Community guidelines - Channel Green' };

export default function Guidelines() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-orange underline underline-offset-4">Back to Channel Green</Link>
      <h1 className="font-pixel text-4xl text-neon mt-6">Community guidelines</h1>
      <div className="prose-cg mt-4">
        <p>Channel Green exists to be somewhere people feel they belong. These rules are here to protect that. They are short on purpose.</p>
        <h2>Be kind</h2>
        <p>Treat everyone the way you would like to be treated in a room you are new to. Disagreement is fine. Cruelty is not.</p>
        <h2>Not welcome here</h2>
        <ul>
          <li>Harassment, bullying, threats or targeting someone.</li>
          <li>Hate toward people for who they are.</li>
          <li>Sexual content, or anything involving minors in any unsafe way.</li>
          <li>Sharing someone&apos;s private information, or asking for yours.</li>
          <li>Spam, scams and impersonation.</li>
          <li>Encouraging self-harm. If you are struggling, please reach out to someone you trust or a local helpline.</li>
        </ul>
        <h2>Consent</h2>
        <p>Waves, hugs, invites and private chats are requests. The other person can say no, or ignore it, and that is the whole answer. Voice and camera never start without you pressing the button.</p>
        <h2>Your tools</h2>
        <ul>
          <li><strong>Mute</strong> hides someone for this visit.</li>
          <li><strong>Block</strong> hides them for good and stops their messages and requests.</li>
          <li><strong>Report</strong> sends a note to the people who look after the place. Reports are read by people, not scored by a machine.</li>
          <li>The host of a private room can lock it, silence people or remove them.</li>
        </ul>
        <h2>The confession wall</h2>
        <p>Posts are anonymous. Be gentle: no names, no accusations, nothing that would hurt someone to read. Moderators can hide posts. You can report any post.</p>
        <h2>Privacy</h2>
        <p>You do not need an account. Your name, outfit and block list live in your own browser. Chat in public rooms is kept only briefly so late arrivals can catch up. Read more in the repository&apos;s security and privacy notes.</p>
        <p>
          The full text lives in the open source repository:{' '}
          <a href={`${BRAND.repoUrl}/blob/main/COMMUNITY_GUIDELINES.md`}>COMMUNITY_GUIDELINES.md</a>. Channel Green is a <a href={BRAND.parentUrl}>{BRAND.parent}</a> project.
        </p>
      </div>
    </main>
  );
}
