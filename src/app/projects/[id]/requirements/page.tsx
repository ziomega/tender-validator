'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, X, ChevronRight, Loader2, Shield, DollarSign, Settings, FileText } from 'lucide-react'
import Link from 'next/link'

type Requirement = {
  id: string
  text: string
  category: string
  source_sentence: string
  is_confirmed: boolean
  priority: string
}

const CATEGORY_ICONS: Record<string, any> = {
  Technical: Settings,
  Legal: Shield,
  Financial: DollarSign,
  General: FileText,
}

const CATEGORY_COLORS: Record<string, string> = {
  Technical: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Legal: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Financial: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  General: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
}

export default function RequirementsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('requirements').select('*').eq('project_id', id).order('category'),
    ]).then(([proj, reqs]) => {
      setProject(proj.data)
      // Confirm all by default
      const reqsWithDefault = (reqs.data || []).map(r => ({ ...r, is_confirmed: true }))
      setRequirements(reqsWithDefault)
      setLoading(false)
    })
  }, [id])

  const toggleConfirm = (reqId: string) => {
    setRequirements(prev =>
      prev.map(r => r.id === reqId ? { ...r, is_confirmed: !r.is_confirmed } : r)
    )
  }

  const confirmAll = async () => {
    setSaving(true)
    // Save confirmations to DB
    await Promise.all(
      requirements.map(r =>
        supabase.from('requirements').update({ is_confirmed: r.is_confirmed }).eq('id', r.id)
      )
    )
    setSaving(false)
    router.push(`/projects/${id}/vendors`)
  }

  const categories = ['All', ...Array.from(new Set(requirements.map(r => r.category)))]
  const filtered = activeCategory === 'All' ? requirements : requirements.filter(r => r.category === activeCategory)
  const confirmedCount = requirements.filter(r => r.is_confirmed).length

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            <Link href="/" className="hover:text-white transition-colors">Projects</Link>
            <span className="mx-2">/</span>
            <span>{project?.name}</span>
          </div>
          <h1 className="text-lg font-bold">Step 1: Review Extracted Requirements</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{confirmedCount} / {requirements.length} confirmed</span>
          <button
            onClick={confirmAll}
            disabled={saving || confirmedCount === 0}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
            Proceed to Vendor Upload
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 text-sm text-amber-300">
          <strong>Review Required:</strong> AI has extracted {requirements.length} mandatory requirements from your RFP. 
          Uncheck any requirements you want to exclude from vendor evaluation, then proceed.
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {cat} {cat !== 'All' && `(${requirements.filter(r => r.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* Requirements Table */}
        <div className="space-y-2">
          {filtered.map((req, idx) => {
            const Icon = CATEGORY_ICONS[req.category] || FileText
            return (
              <div
                key={req.id}
                className={`border rounded-xl p-4 transition-all ${
                  req.is_confirmed
                    ? 'border-white/10 bg-white/[0.02]'
                    : 'border-white/5 bg-transparent opacity-40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleConfirm(req.id)}
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                      req.is_confirmed
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-2 border-white/20'
                    }`}
                  >
                    {req.is_confirmed && <Check size={12} strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border font-medium ${CATEGORY_COLORS[req.category] || CATEGORY_COLORS.General}`}>
                        <Icon size={10} />
                        {req.category}
                      </span>
                    </div>
                    <p className="text-sm text-white/90">{req.text}</p>
                    {req.source_sentence && req.source_sentence !== req.text && (
                      <p className="text-xs text-slate-600 mt-1.5 italic">Source: "{req.source_sentence}"</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}