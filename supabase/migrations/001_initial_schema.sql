-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'partner', 'analyst');
CREATE TYPE deal_stage AS ENUM ('thesis_fit', 'signals', 'validation', 'conviction', 'term_sheet', 'due_diligence', 'closed');
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'analyst',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sectors table (hierarchical structure)
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    website TEXT,
    sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
    founded_date DATE,
    location TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    crunchbase_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals table
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    stage deal_stage NOT NULL DEFAULT 'thesis_fit',
    analyst_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    partner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    check_size_min DECIMAL(15,2),
    check_size_max DECIMAL(15,2),
    valuation DECIMAL(15,2),
    round_size DECIMAL(15,2),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    thesis_fit_score INTEGER CHECK (thesis_fit_score >= 1 AND thesis_fit_score <= 10),
    market_score INTEGER CHECK (market_score >= 1 AND market_score <= 10),
    team_score INTEGER CHECK (team_score >= 1 AND team_score <= 10),
    product_score INTEGER CHECK (product_score >= 1 AND product_score <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    status document_status NOT NULL DEFAULT 'pending',
    uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    processing_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks for RAG
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- for text-embedding-3-small
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal analyses
CREATE TABLE deal_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    response_id TEXT UNIQUE, -- OpenAI response ID
    analysis_type TEXT NOT NULL,
    status analysis_status NOT NULL DEFAULT 'pending',
    result JSONB DEFAULT '{}'::jsonb,
    token_usage JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    requested_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment memos
CREATE TABLE investment_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    response_id TEXT UNIQUE, -- OpenAI response ID
    version INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    content JSONB NOT NULL, -- Structured memo content
    status analysis_status NOT NULL DEFAULT 'pending',
    token_usage JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge articles
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT,
    content TEXT NOT NULL,
    sector_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    published_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article chunks for RAG
CREATE TABLE article_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- for text-embedding-3-small
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_deals_organization_stage ON deals(organization_id, stage);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_documents_deal ON documents(deal_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_article_chunks_embedding ON article_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_knowledge_articles_sector ON knowledge_articles USING GIN (sector_ids);
CREATE INDEX idx_knowledge_articles_tags ON knowledge_articles USING GIN (tags);

-- Row Level Security (RLS) policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_chunks ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (id = get_user_organization_id());

-- RLS Policies for user_profiles
CREATE POLICY "Users can view profiles in their organization" ON user_profiles
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- RLS Policies for sectors
CREATE POLICY "Users can view sectors in their organization" ON sectors
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage sectors" ON sectors
    FOR ALL USING (
        organization_id = get_user_organization_id() AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for companies
CREATE POLICY "Users can view companies in their organization" ON companies
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create companies" ON companies
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update companies" ON companies
    FOR UPDATE USING (organization_id = get_user_organization_id());

-- RLS Policies for deals
CREATE POLICY "Users can view deals in their organization" ON deals
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create deals" ON deals
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update deals" ON deals
    FOR UPDATE USING (organization_id = get_user_organization_id());

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their organization" ON documents
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can upload documents" ON documents
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

-- RLS Policies for document_chunks
CREATE POLICY "Users can view document chunks" ON document_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_chunks.document_id
            AND documents.organization_id = get_user_organization_id()
        )
    );

-- RLS Policies for deal_analyses
CREATE POLICY "Users can view analyses" ON deal_analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = deal_analyses.deal_id
            AND deals.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can create analyses" ON deal_analyses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = deal_analyses.deal_id
            AND deals.organization_id = get_user_organization_id()
        )
    );

-- RLS Policies for investment_memos
CREATE POLICY "Users can view memos" ON investment_memos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = investment_memos.deal_id
            AND deals.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can create memos" ON investment_memos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = investment_memos.deal_id
            AND deals.organization_id = get_user_organization_id()
        )
    );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view activity logs" ON activity_logs
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "System can create activity logs" ON activity_logs
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

-- RLS Policies for knowledge_articles
CREATE POLICY "Users can view knowledge articles" ON knowledge_articles
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create knowledge articles" ON knowledge_articles
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

-- RLS Policies for article_chunks
CREATE POLICY "Users can view article chunks" ON article_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM knowledge_articles 
            WHERE knowledge_articles.id = article_chunks.article_id
            AND knowledge_articles.organization_id = get_user_organization_id()
        )
    );

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON sectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_analyses_updated_at BEFORE UPDATE ON deal_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_memos_updated_at BEFORE UPDATE ON investment_memos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_updated_at BEFORE UPDATE ON knowledge_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();