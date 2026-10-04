import { LegalDocScreen } from '@/components/LegalDocScreen';

export default function PrivacyScreen() {
  return (
    <LegalDocScreen
      title="Privacy Policy"
      updated="2026-10-04"
      intro="This Privacy Policy explains what Findr collects, why, and your choices. It is an MVP template - customize with counsel before public launch."
      sections={[
        {
          heading: '1. Who we are',
          body:
            'Findr is operated by Toma Adkins / TomasEmpire. Contact: contactus@myfindr.fun',
        },
        {
          heading: '2. Data we collect',
          body:
            'Account data (email, password hash, 18+ attestation / optional date of birth later). Profile data you choose to share (display name, bio, photos, orientations, intents). Approximate location used for Nearby discovery (fuzzed where implemented). Messages you send. Device / log data needed to run and secure the app. Reports and blocks you submit.',
        },
        {
          heading: '3. How we use data',
          body:
            'To create and secure accounts, show Nearby results, deliver chat, enforce 18+ and safety rules, improve reliability, and comply with law. We do not sell personal data in the MVP model described here - confirm with counsel before launch.',
        },
        {
          heading: '4. Location',
          body:
            'Nearby features need location permission. We aim to store and show coarse / fuzzed distance bands rather than exact pins to other users. You can turn off Visibility in Profile or Safety so you do not appear in Nearby.',
        },
        {
          heading: '5. Sharing',
          body:
            'Other users see profile fields you publish and messages you send them. We may use processors (hosting, analytics, crash reporting) under contracts. We may disclose information if required by law or to address safety / fraud.',
        },
        {
          heading: '6. Retention',
          body:
            'We keep account and content data while your account is active and for a reasonable period after deletion or inactivity for backups, disputes, and legal needs. Exact periods should be set with counsel.',
        },
        {
          heading: '7. Security',
          body:
            'We use industry-typical measures (hashed passwords, transport security in production). No method is 100% secure. Use a strong unique password.',
        },
        {
          heading: '8. Your choices',
          body:
            'Update profile fields in-app. Log out anytime. Delete your account in Safety (Delete account) or request deletion by emailing contactus@myfindr.fun. Public instructions: https://myfindr.fun/delete-account/. Limit location OS permissions (Nearby will degrade).',
        },
        {
          heading: '9. Children',
          body:
            'Findr is not directed to anyone under 18. We do not knowingly collect data from minors. If you believe a minor has an account, report it; we will take steps to remove it.',
        },
        {
          heading: '10. International / regional rights',
          body:
            'Depending on where you live (e.g. GDPR, CCPA), you may have rights to access, correct, delete, or export data. This template does not implement every regional notice - counsel must add required disclosures before launch.',
        },
        {
          heading: '11. Changes',
          body:
            'We may update this Policy. We will post the new date above and, for material changes, try to notify in-app or by email when feasible.',
        },
        {
          heading: '12. Contact',
          body: 'Privacy requests: contactus@myfindr.fun',
        },
      ]}
    />
  );
}
