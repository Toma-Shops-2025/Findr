import { LegalDocScreen } from '@/components/LegalDocScreen';

export default function FaqScreen() {
  return (
    <LegalDocScreen
      title="FAQ & Safety"
      updated="2026-10-04"
      intro="Quick answers about age, safety, reporting, and how Findr works during MVP."
      sections={[
        {
          heading: 'Who can use Findr?',
          body:
            'Adults 18+ only. At signup you must attest that you are 18 or older and accept Terms and Privacy. Under-18 use is prohibited.',
        },
        {
          heading: 'Why no date of birth on signup?',
          body:
            'MVP age gating uses a required 18+ attestation checkbox plus server validation of acceptedAgeGate. You may be asked for date of birth later on your profile for age display. Lying about your age can get your account removed.',
        },
        {
          heading: 'How do I report someone?',
          body:
            'Open their profile or chat and use Report. Pick a reason (harassment, spam, suspected underage, scam, non-consensual imagery, other). Reports help us review accounts.',
        },
        {
          heading: 'How do I block someone?',
          body:
            'Use Block on a profile, Nearby card, or chat. Blocked people should not appear in your Nearby or message you. Manage blocks under Safety.',
        },
        {
          heading: 'Meeting in person',
          body:
            'Meet in public places. Tell a friend. Do not share financial info. Trust your instincts. Findr does not run background checks and is not responsible for offline meetups.',
        },
        {
          heading: 'Suspected underage user',
          body:
            'Do not engage further. Report with reason "Suspected underage" immediately. We treat these reports as high priority.',
        },
        {
          heading: 'Is my location exact?',
          body:
            'Nearby is meant to use approximate / fuzzed distance. Other users should not see your precise pin in the MVP design. Still be careful what you share in chat.',
        },
        {
          heading: 'How do I control Nearby visibility?',
          body:
            'Use Visible in Nearby on Profile, or Visibility under Safety Account. Both update the same setting. When Off, you do not appear in Nearby.',
        },
        {
          heading: 'How do I delete my account?',
          body:
            'Open Safety -> Delete account and confirm. Or email contactus@myfindr.fun from the address on your account. Public page: https://myfindr.fun/delete-account/',
        },
        {
          heading: 'Something feels wrong in chat',
          body:
            'Block, report, and stop responding. Do not send money, codes, or intimate images under pressure. Contact: contactus@myfindr.fun',
        },
      ]}
    />
  );
}
