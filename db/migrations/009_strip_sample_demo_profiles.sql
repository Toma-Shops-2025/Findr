-- Remove SAMPLE demo markers from production seed profiles (screenshots / Play listing).
-- Safe to re-run.

UPDATE profiles
SET display_name = trim(regexp_replace(display_name, '^SAMPLE\s+', '', 'i'))
WHERE display_name ~* '^SAMPLE\s+';

UPDATE profiles
SET bio = ''
WHERE bio ~* '^SAMPLE account'
   OR bio ~* 'not a real person';
