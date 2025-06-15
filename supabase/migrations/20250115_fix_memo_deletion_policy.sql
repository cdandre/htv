-- Add missing RLS policies for investment_memos

-- Policy for updating memos
CREATE POLICY "Users can update memos" ON investment_memos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = investment_memos.deal_id
            AND deals.organization_id = get_user_organization_id()
        )
    );

-- Policy for deleting memos
CREATE POLICY "Users can delete memos" ON investment_memos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = investment_memos.deal_id
            AND deals.organization_id = get_user_organization_id()
        )
    );