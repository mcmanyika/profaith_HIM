-- Add phone_number column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS phone_number TEXT; 