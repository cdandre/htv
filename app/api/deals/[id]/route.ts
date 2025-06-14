import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete this deal
    const { data: deal, error: fetchError } = await supabase
      .from('deals')
      .select('id, organization_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Check if user belongs to the organization and has appropriate role
    const { data: userRole, error: roleError } = await supabase
      .from('organization_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', deal.organization_id)
      .single();

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only admins and partners can delete deals
    if (!['admin', 'partner'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete the deal (this will cascade delete related records due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('deals')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting deal:', deleteError);
      return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/deals/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}