-- Update Invoice Number from INV-0001 to FSAP-0001
UPDATE invoices
SET invoice_number = 'FSAP-0001'
WHERE invoice_number = 'INV-0001';

-- Update Bank Account Number
UPDATE bank_accounts
SET account_number = '510101002942754'
WHERE is_default = true;

-- Update Terms & Conditions
UPDATE settings
SET value = '"1. Any disputes are subject to the jurisdiction of Belagavi only.\n2. Please check the item/bill upon delivery.\n3. Damaged supplied material will be replaced within 30 days.\n4. An interest rate of 18% per annum will be charged if payment is not made by the due date."'
WHERE key = 'invoice_terms_conditions';
