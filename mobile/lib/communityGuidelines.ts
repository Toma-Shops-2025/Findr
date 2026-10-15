/** Community guidelines copy (modal + Safety tab). Legal pages keep policy disclaimer. */

export const COMMUNITY_GUIDELINES_PARAGRAPHS = [
  'Findr is 18+ only. Be respectful. No minors, threats, hate, or non-consensual images. Profile grid photos must not be explicit; chat media between adults is your choice — block anyone who crosses your boundaries.',
  'Report and block are in every profile and chat. We review reports and may hide or remove accounts that break these rules.',
] as const;

export const COMMUNITY_GUIDELINES_BODY = COMMUNITY_GUIDELINES_PARAGRAPHS.join(
  '\n\n',
);
