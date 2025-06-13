'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { 
  Building2, 
  FileText, 
  BarChart3, 
  Calendar,
  DollarSign,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'

type Deal = Database['public']['Tables']['deals']['Row'] & {
  company: Database['public']['Tables']['companies']['Row']
  documents: Database['public']['Tables']['documents']['Row'][]
  deal_analyses: Database['public']['Tables']['deal_analyses']['Row'][]
  investment_memos: Database['public']['Tables']['investment_memos']['Row'][]
}

interface DealDetailProps {
  deal: Deal
}

const stageNames = {
  thesis_fit: 'Thesis Fit',
  signals: 'Signals',
  validation: 'Validation',
  conviction: 'Conviction',
  term_sheet: 'Term Sheet',
  due_diligence: 'Due Diligence',
  closed: 'Closed',
}

export default function DealDetail({ deal }: DealDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [generatingMemo, setGeneratingMemo] = useState(false)

  const latestAnalysis = deal.deal_analyses
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  const handleGenerateMemo = async () => {
    setGeneratingMemo(true)
    try {
      const response = await fetch('/api/memos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id }),
      })
      
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error generating memo:', error)
    } finally {
      setGeneratingMemo(false)
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'analysis', name: 'AI Analysis', icon: Target },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'memos', name: 'Memos', icon: FileText },
  ]

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Building2 className="w-12 h-12 text-gray-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{deal.company.name}</h1>
              <p className="text-lg text-gray-600">{deal.title}</p>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  {stageNames[deal.stage]}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(new Date(deal.created_at), 'MMM d, yyyy')}
                </span>
                {deal.check_size_max && (
                  <span className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    ${(deal.check_size_max / 1000000).toFixed(1)}M
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleGenerateMemo}
            disabled={generatingMemo || !latestAnalysis}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingMemo ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Generating...
              </>
            ) : (
              'Generate Memo'
            )}
          </button>
        </div>
        
        {/* Scores */}
        {(deal.thesis_fit_score || deal.market_score || deal.team_score || deal.product_score) && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {deal.thesis_fit_score && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{deal.thesis_fit_score}/10</div>
                <div className="text-sm text-gray-600">Thesis Fit</div>
              </div>
            )}
            {deal.market_score && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{deal.market_score}/10</div>
                <div className="text-sm text-gray-600">Market</div>
              </div>
            )}
            {deal.team_score && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{deal.team_score}/10</div>
                <div className="text-sm text-gray-600">Team</div>
              </div>
            )}
            {deal.product_score && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{deal.product_score}/10</div>
                <div className="text-sm text-gray-600">Product</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deal.company.website && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Website</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={deal.company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                          {deal.company.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  {deal.company.location && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">{deal.company.location}</dd>
                    </div>
                  )}
                  {deal.round_size && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Round Size</dt>
                      <dd className="mt-1 text-sm text-gray-900">${(deal.round_size / 1000000).toFixed(1)}M</dd>
                    </div>
                  )}
                  {deal.valuation && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Valuation</dt>
                      <dd className="mt-1 text-sm text-gray-900">${(deal.valuation / 1000000).toFixed(1)}M</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              {deal.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div>
              {latestAnalysis ? (
                <div className="prose max-w-none">
                  <ReactMarkdown>
                    {(latestAnalysis.result as any)?.content || 'No analysis content available'}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No analysis available yet. Upload documents to generate an analysis.</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              {deal.documents.length > 0 ? (
                <div className="space-y-4">
                  {deal.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-8 h-8 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                          <p className="text-sm text-gray-500">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {format(new Date(doc.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doc.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : doc.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-700'
                          : doc.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No documents uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {/* Memos Tab */}
          {activeTab === 'memos' && (
            <div>
              {deal.investment_memos.length > 0 ? (
                <div className="space-y-4">
                  {deal.investment_memos.map((memo) => (
                    <div key={memo.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{memo.title}</h4>
                        <span className="text-sm text-gray-500">
                          v{memo.version} • {format(new Date(memo.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Status: <span className="font-medium">{memo.status}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No memos generated yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}