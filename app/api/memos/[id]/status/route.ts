import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get memo with sections
    const { data: memo, error: memoError } = await supabase
      .from('investment_memos')
      .select(`
        *,
        investment_memo_sections(*)
      `)
      .eq('id', params.id)
      .single()

    if (memoError || !memo) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
    }

    // Sort sections by order
    const sections = memo.investment_memo_sections?.sort(
      (a: any, b: any) => a.section_order - b.section_order
    ) || []

    // Calculate progress
    const completedSections = sections.filter((s: any) => s.status === 'completed').length
    const totalSections = memo.total_sections || sections.length
    const progress = totalSections > 0 ? (completedSections / totalSections) * 100 : 0

    return NextResponse.json({
      id: memo.id,
      status: memo.generation_status,
      progress,
      sectionsCompleted: completedSections,
      totalSections,
      sections: sections.map((s: any) => ({
        id: s.id,
        type: s.section_type,
        order: s.section_order,
        status: s.status,
        content: s.content,
        error: s.error,
        startedAt: s.started_at,
        completedAt: s.completed_at
      })),
      content: memo.content,
      createdAt: memo.created_at,
      updatedAt: memo.updated_at
    })
  } catch (error: any) {
    console.error('Error fetching memo status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch memo status' },
      { status: 500 }
    )
  }
}