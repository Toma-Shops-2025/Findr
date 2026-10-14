/** Record migrations already present before schema_migrations existed. */
export async function seedLegacyMigrations(client) {
  const checks = [
    ['001_init.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1`],
    ['002_chat.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' LIMIT 1`],
    ['003_optional_dob_age_gate.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age_gate_accepted_at' LIMIT 1`],
    ['004_photos_age.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age' LIMIT 1`],
    ['005_media_album.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'album_items' LIMIT 1`],
    ['006_message_likes_location.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'message_likes' LIMIT 1`],
    ['007_accuracy_m_float.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'user_locations' AND column_name = 'accuracy_m' LIMIT 1`],
    ['008_hello_attention.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'hello_sent_at_a' LIMIT 1`],
    ['009_strip_sample_demo_profiles.sql', `SELECT 1 FROM schema_migrations WHERE name = '009_strip_sample_demo_profiles.sql' LIMIT 1`],
    ['010_auth_reset_oauth.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens' LIMIT 1`],
    ['011_chat_read_receipts.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'peer_a_last_read_at' LIMIT 1`],
    ['012_share_chat_distance.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'share_chat_distance' LIMIT 1`],
  ];

  for (const [name, sql] of checks) {
    if (name === '009_strip_sample_demo_profiles.sql') continue;
    try {
      const r = await client.query(sql);
      if ((r.rowCount ?? 0) > 0) {
        await client.query(
          `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
          [name],
        );
      }
    } catch {
      // ignore per-check failures
    }
  }
}
