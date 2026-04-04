'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Plus, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

type Project = {
  id: string
  name: string
  description: string
  status: string
  created_at: string
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('projects').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProjects(data || []); setLoading(false) })
  }, [])

  const statusIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle className="text-emerald-500" size={16} />
    if (status === 'reviewing') return <Clock className="text-amber-500" size={16} />
    return <FileText className="text-slate-400" size={16} />
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-amber-400">⚖</span> TenderGuard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">AI-Powered Tender Compliance Validator</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} /> New Tender Review
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Tender Reviews</h2>
          <p className="text-slate-400">Manage your RFP compliance validation projects.</p>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">No tender reviews yet</h3>
            <p className="text-slate-500 text-sm mb-6">Start by uploading an RFP document to extract requirements.</p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Plus size={16} /> Create First Review
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(project => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block border border-white/10 rounded-xl p-5 hover:border-amber-500/40 hover:bg-white/[0.02] transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(project.status)}
                      <h3 className="font-semibold group-hover:text-amber-400 transition-colors">{project.name}</h3>
                    </div>
                    <p className="text-slate-500 text-sm">{project.description || 'No description'}</p>
                  </div>
                  <span className="text-xs text-slate-600">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}