BEGIN;

-- Usernames are already case-insensitively unique. Promote the one canonical
-- Mara account regardless of the letter case used by the existing account.
UPDATE "User"
SET "isAdmin" = true
WHERE LOWER("nickname") = 'mara';

COMMIT;
