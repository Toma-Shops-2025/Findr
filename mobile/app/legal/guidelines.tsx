import { LegalDocScreen } from '@/components/LegalDocScreen';

export default function GuidelinesScreen() {
  return (
    <LegalDocScreen
      title="Community Guidelines"
      updated="2026-10-07"
      intro="Findr is an adults-only (18+) dating and social app. Consensual adult content, including nudity, may be shared in profiles and private chat. Illegal content, minors, and abuse are never allowed. These guidelines work together with the Terms of Service."
      sections={[
        {
          heading: 'Be 18+',
          body:
            'No minors. No content sexualizing minors. Report suspected underage users immediately.',
        },
        {
          heading: 'Consent & respect',
          body:
            'No harassment, hate, threats, stalking, or unwanted sexual pressure. Respect pronouns and identities. Inclusive of straight and LGBTQ+ users - bigotry is not welcome.',
        },
        {
          heading: 'Photos & media',
          body:
            'Only post photos you have the right to share. Consensual adult nudity is allowed for adults 18+ in profiles and chat, subject to these rules and applicable law. Never post anyone under 18, non-consensual intimate imagery (NCII), threats, or illegal content. Do not share another person\'s images without their permission.',
        },
        {
          heading: 'No scams or spam',
          body:
            'No phishing, crypto/money asks, fake profiles, or mass unsolicited promo. Commercial use needs permission.',
        },
        {
          heading: 'Honesty',
          body:
            'Do not impersonate others. Do not misrepresent your age. Catfishing and fraud can lead to bans.',
        },
        {
          heading: 'Enforcement',
          body:
            'We may warn, hide content, suspend, or ban. Serious safety issues (underage, threats, NCI) may be removed without warning. Appeals: contactus@myfindr.fun',
        },
      ]}
    />
  );
}
