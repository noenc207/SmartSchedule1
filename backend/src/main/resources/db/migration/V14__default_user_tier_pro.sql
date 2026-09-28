-- V14: Default User Tier to PRO for full testing access
ALTER TABLE users ALTER COLUMN tier SET DEFAULT 'PRO';
UPDATE users SET tier = 'PRO' WHERE tier = 'FREE' OR tier IS NULL;
