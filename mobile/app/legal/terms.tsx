import { LegalDocScreen } from '@/components/LegalDocScreen';

export default function TermsScreen() {
  return (
    <LegalDocScreen
      title="Terms of Service"
      updated="2026-10-04"
      intro="Welcome to Findr. By creating an account or using the app, you agree to these Terms. If you do not agree, do not use Findr."
      sections={[
        {
          heading: '1. Eligibility (18+ only)',
          body:
            'Findr is strictly for adults 18 years of age or older. By using Findr you represent that you are at least 18. We may suspend or terminate accounts if we reasonably believe a user is under 18.',
        },
        {
          heading: '2. The service',
          body:
            'Findr is a location-based social / dating product that lets adults discover nearby people, view profiles, and chat. Features may change, break, or be unavailable during MVP testing. We do not guarantee matches, meetings, or outcomes.',
        },
        {
          heading: '3. Your account',
          body:
            'You are responsible for your login credentials and for activity on your account. Provide accurate information. Do not share your account. Notify us if you suspect unauthorized access.',
        },
        {
          heading: '4. Acceptable use',
          body:
            'You agree not to: harass, threaten, or exploit others; post illegal content; solicit minors; spam; scam; share non-consensual intimate imagery; scrape the service; reverse engineer beyond what law allows; or use Findr for commercial spam without our written permission. See also Community Guidelines.',
        },
        {
          heading: '5. Safety',
          body:
            'Meetups are at your own risk. Use in-app Block and Report tools. Verify identities offline carefully. Findr is not a background-check or emergency service.',
        },
        {
          heading: '6. Content you post',
          body:
            'You retain rights to content you upload, but grant Findr a limited license to host, display, and moderate it to operate the service. We may remove content that violates these Terms or Guidelines.',
        },
        {
          heading: '7. Termination',
          body:
            'You may stop using Findr anytime. Delete your account in Safety, or request deletion at https://myfindr.fun/delete-account/ or by emailing contactus@myfindr.fun. We may suspend or delete accounts that violate these Terms, create safety risk, or for operational reasons.',
        },
        {
          heading: '8. Disclaimers & liability',
          body:
            'THE SERVICE IS PROVIDED AS IS WITHOUT WARRANTIES TO THE EXTENT ALLOWED BY LAW. Findr is not liable for user conduct, offline meetings, or indirect damages, except where liability cannot be limited under applicable law. We may update these Terms over time; continued use after an update means you accept the revised Terms.',
        },
        {
          heading: '9. Changes',
          body:
            'We may update these Terms. Continued use after notice may constitute acceptance. Material changes should be surfaced in-app when feasible.',
        },
        {
          heading: '10. Contact',
          body: 'Questions about these Terms: contactus@myfindr.fun',
        },
      ]}
    />
  );
}
