-- Database setup for Smart Camera Training System
-- Run this SQL in Supabase SQL Editor

-- Create table for product training data
CREATE TABLE IF NOT EXISTS product_training_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT,
    image_urls TEXT[] DEFAULT '{}',
    labels TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_training_product_id ON product_training_data(product_id);

-- Enable RLS
ALTER TABLE product_training_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on product_training_data"
    ON product_training_data
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON product_training_data TO authenticated;
GRANT ALL ON product_training_data TO anon;

COMMENT ON TABLE product_training_data IS 'Stores AI training data for Smart Camera product recognition';
COMMENT ON COLUMN product_training_data.image_urls IS 'Array of URLs to training images stored in Supabase Storage';
COMMENT ON COLUMN product_training_data.labels IS 'Array of labels/tags for product recognition (e.g., powder, bottle, herbal, ashwagandha)';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_product_training_data_updated_at
    BEFORE UPDATE ON product_training_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create view for training stats
CREATE OR REPLACE VIEW training_stats AS
SELECT 
    COUNT(DISTINCT product_id) as trained_products,
    COUNT(*) as total_records,
    SUM(CARDINALITY(image_urls)) as total_images
FROM product_training_data;

-- Test query (optional)
-- SELECT * FROM training_stats;