-- Add category column to transactions table
ALTER TABLE transactions
ADD COLUMN category VARCHAR(50);

-- Set default value for existing records
UPDATE transactions
SET category = 'investment'
WHERE category IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE transactions
ALTER COLUMN category SET NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN transactions.category IS 'Category of the transaction (e.g., investment, donation, etc.)';

-- Create an index on the category column for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category); 