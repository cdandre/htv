-- Create comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('deal', 'memo', 'article')),
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    mentions UUID[] DEFAULT '{}',
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_comments_mentions ON comments USING GIN(mentions);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view comments in their organization" ON comments
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create comments in their organization" ON comments
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (user_id = auth.uid());

-- Function to handle mentions
CREATE OR REPLACE FUNCTION process_comment_mentions(comment_id UUID)
RETURNS VOID AS $$
DECLARE
    comment_record RECORD;
    mentioned_user_id UUID;
BEGIN
    -- Get the comment details
    SELECT * INTO comment_record FROM comments WHERE id = comment_id;
    
    -- Create notifications for each mentioned user
    FOREACH mentioned_user_id IN ARRAY comment_record.mentions
    LOOP
        INSERT INTO notifications (
            organization_id,
            user_id,
            type,
            title,
            message,
            entity_type,
            entity_id,
            action_url
        ) VALUES (
            comment_record.organization_id,
            mentioned_user_id,
            'mention',
            'You were mentioned in a comment',
            substring(comment_record.content, 1, 100),
            comment_record.entity_type,
            comment_record.entity_id,
            '/dashboard/' || comment_record.entity_type || 's/' || comment_record.entity_id || '?comment=' || comment_record.id
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process mentions after comment insert
CREATE TRIGGER process_mentions_trigger
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION process_comment_mentions(NEW.id);