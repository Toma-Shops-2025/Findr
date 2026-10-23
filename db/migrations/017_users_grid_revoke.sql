-- Secret for leaving Nearby when the app process ends (swipe away from recents).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS grid_revoke_secret UUID;
