import { LegalDocScreen } from '@/components/LegalDocScreen';

export default function GuidelinesScreen() {
  return (
    <LegalDocScreen
      title="Community Guidelines"
      updated="2026-10-04"
      intro="Findr should feel inclusive and adult. These guidelines summarize what is okay and what gets you removed. They work together with the Terms of Service."
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
            'Only post photos you have the right to use. No non-consensual intimate imagery. No illegal content. Keep profile photos reasonably appropriate for a public discovery grid.',
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
