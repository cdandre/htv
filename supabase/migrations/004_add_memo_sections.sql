-- Create table for storing individual memo sections
CREATE TABLE investment_memo_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_id UUID REFERENCES investment_memos(id) ON DELETE CASCADE NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN (
    'executive_summary',
    'thesis_alignment', 
    'company_overview',
    'market_analysis',
    'product_technology',
    'business_model',
    'team_execution',
    'investment_rationale',
    'risks_mitigation',
    'recommendation'
  )),
  section_order INTEGER NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(memo_id, section_type)
);

-- Add status tracking to investment_memos table
ALTER TABLE investment_memos 
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS sections_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 10;

-- Create indexes for performance
CREATE INDEX idx_memo_sections_memo_id ON investment_memo_sections(memo_id);
CREATE INDEX idx_memo_sections_status ON investment_memo_sections(status);

-- Add RLS policies
ALTER TABLE investment_memo_sections ENABLE ROW LEVEL SECURITY;

-- Users can view sections for memos in their organization
CREATE POLICY "Users can view memo sections in their organization" ON investment_memo_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investment_memos im
      JOIN deals d ON d.id = im.deal_id
      JOIN user_organizations uo ON uo.organization_id = d.organization_id
      WHERE im.id = investment_memo_sections.memo_id
      AND uo.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE investment_memo_sections;