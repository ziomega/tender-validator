'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Loader2, Shield } from 'lucide-react'
import Link from 'next/link'

type Match = {
  id: string
  status: string
  confidence: number
  matched_text: string
  explanation: string
  requirements: { text: string; category: string }
}

type Risk = {
  id: string
  flagged_text: string
  risk_type: string
  impact_summary: string
  severity: string
}

export default function VendorDeepDivePage() {
  const { id, vendorId } = useParams()
  const [vendor, setVendor] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'requirements' | 'risks'>('requirements')
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('vendors').select('*').eq('id', vendorId).single(),
      supabase.from('requirement_matches')
        .select('*, requirements(text, category)')
        .eq('vendor_id', vendorId)
        .order('status'),
      supabase.from('risk_flags').select('*').eq('vendor_id', vendorId).order('severity'),
    ]).then(([ven, mat, ris]) => {
      setVendor(ven.data)
      setMatches(mat.data || [])
      setRisks(ris.data || [])
      setLoading(false)
    })
  }, [vendorId])

  const statusConfig = {
    met: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Met' },
    partial: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Partial' },
    missing: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Missing' },
  }

  const severityConfig = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  const missingCount = matches.filter(m => m.status === 'missing').length
  const metCount = matches.filter(m => m.status === 'met').length
  const partialCount = matches.filter(m => m.status === 'partial').length

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-8 py-5">
        <div className="text-xs text-slate-500 mb-2">
          <Link href="/" className="hover:text-white">Projects</Link>
          <span className="mx-2">/</span>
          <Link href={`/projects/${id}/vendors`} className="hover:text-white">Vendors</Link>
          <span className="mx-2">/</span>
          <span>{vendor?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{vendor?.name}</h1>
            <p className="text-sm text-slate-500">Proposal Analysis Deep Dive</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{metCount}</div>
              <div className="text-xs text-slate-500">Met</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">{partialCount}</div>
              <div className="text-xs text-slate-500">Partial</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{missingCount}</div>
              <div className="text-xs text-slate-500">Missing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: vendor?.compliance_score >= 80 ? '#10b981' : vendor?.compliance_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                {vendor?.compliance_score}%
              </div>
              <div className="text-xs text-slate-500">Score</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab('requirements')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'requirements' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            Requirements ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'risks' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            Risk Flags ({risks.length})
          </button>
        </div>

        {activeTab === 'requirements' && (
          <div className="space-y-2">
            {/* Sort: missing first */}
            {[...matches].sort((a, b) => {
              const order = { missing: 0, partial: 1, met: 2 }
              return order[a.status as keyof typeof order] - order[b.status as keyof typeof order]
            }).map(match => {
              const cfg = statusConfig[match.status as keyof typeof statusConfig]
              const Icon = cfg.icon
              const isExpanded = expandedMatch === match.id

              return (
                <div key={match.id} className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
                  <button
                    onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <Icon size={18} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <p className="text-sm">{match.requirements?.text}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-slate-500">
                          {Math.round(match.confidence * 100)}% confidence
                        </span>
                        <span className="text-xs text-slate-600">{match.requirements?.category}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-1">AI Explanation</p>
                        <p className="text-sm text-slate-300">{match.explanation}</p>
                      </div>
                      {match.matched_text && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">Matching Excerpt from Proposal</p>
                          <blockquote className="text-sm text-slate-300 border-l-2 border-amber-500/50 pl-3 italic">
                            "{match.matched_text}"
                          </blockquote>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-3">
            {risks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Shield size={32} className="mx-auto mb-3 text-emerald-500 opacity-50" />
                <p>No risk flags detected in this proposal.</p>
              </div>
            ) : (
              [...risks].sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 }
                return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order]
              }).map(risk => (
                <div key={risk.id} className="border border-white/10 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border capitalize ${severityConfig[risk.severity as keyof typeof severityConfig]}`}>
                      {risk.severity} risk
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{risk.risk_type.replace('_', ' ')}</span>
                  </div>
                  <blockquote className="text-sm text-amber-300/80 italic border-l-2 border-amber-500/40 pl-3 mb-3">
                    "{risk.flagged_text}"
                  </blockquote>
                  <p className="text-sm text-slate-400">{risk.impact_summary}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}