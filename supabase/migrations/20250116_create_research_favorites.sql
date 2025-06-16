-- Create research_favorites table for saving favorite research articles
CREATE TABLE IF NOT EXISTS public.research_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT,
  source TEXT,
  published_date TIMESTAMPTZ,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, url)
);

-- Create indexes
CREATE INDEX idx_research_favorites_org_user ON public.research_favorites(organization_id, user_id);
CREATE INDEX idx_research_favorites_created_at ON public.research_favorites(created_at DESC);
CREATE INDEX idx_research_favorites_tags ON public.research_favorites USING gin(tags);

-- Enable Row Level Security
ALTER TABLE public.research_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view favorites from their organization"
  ON public.research_favorites FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own favorites"
  ON public.research_favorites FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own favorites"
  ON public.research_favorites FOR DELETE
  USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER set_research_favorites_updated_at
  BEFORE UPDATE ON public.research_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();