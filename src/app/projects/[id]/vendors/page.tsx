'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useDropzone } from 'react-dropzone'
import { Plus, Loader2, CheckCircle2, AlertCircle, Clock, BarChart3, Upload, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Vendor = {
  id: string
  name: string
  proposal_file_name: string
  compliance_score: number
  risk_count: number
  status: string
}

export default function VendorsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [newVendorName, setNewVendorName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [adding, setAdding] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)

  const loadData = async () => {
    const [proj, vens] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('vendors').select('*').eq('project_id', id).order('created_at'),
    ])
    setProject(proj.data)
    setVendors(vens.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  const onDrop = useCallback((files: File[]) => setFile(files[0]), [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  const addVendor = async () => {
    if (!newVendorName || !file) return
    setAdding(true)

    const { data: vendor } = await supabase
      .from('vendors')
      .insert({ project_id: id, name: newVendorName, status: 'pending' })
      .select().single()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'proposal')
    formData.append('vendorId', vendor.id)

    await fetch('/api/upload', { method: 'POST', body: formData })

    setNewVendorName('')
    setFile(null)
    setAdding(false)
    loadData()
  }

  const analyzeVendor = async (vendorId: string) => {
    setAnalyzing(vendorId)
    await supabase.from('vendors').update({ status: 'analyzing' }).eq('id', vendorId)

    await Promise.all([
      fetch('/api/analyze-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, projectId: id }),
      }),
      fetch('/api/detect-risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId }),
      }),
    ])

    setAnalyzing(null)
    loadData()
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  const analyzedVendors = vendors.filter(v => v.status === 'analyzed')

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            <Link href="/" className="hover:text-white">Projects</Link>
            <span className="mx-2">/</span>
            <span>{project?.name}</span>
          </div>
          <h1 className="text-lg font-bold">Step 2: Add Vendor Proposals</h1>
        </div>
        {analyzedVendors.length >= 1 && (
          <Link
            href={`/projects/${id}/dashboard`}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
          >
            <BarChart3 size={16} /> View Compliance Dashboard
          </Link>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Add Vendor Form */}
        <div className="border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Plus size={18} className="text-amber-400" /> Add Vendor Proposal
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Vendor Name</label>
              <input
                value={newVendorName}
                onChange={e => setNewVendorName(e.target.value)}
                placeholder="e.g. Acme Construction Ltd."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/60 placeholder-slate-600"
              />
            </div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                isDragActive ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <span className="text-amber-400 text-xs">📎 {file.name}</span>
              ) : (
                <span className="text-slate-500 text-xs">Drop proposal PDF/DOCX here</span>
              )}
            </div>
          </div>
          <button
            onClick={addVendor}
            disabled={adding || !newVendorName || !file}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {adding ? 'Adding...' : 'Add Vendor'}
          </button>
        </div>

        {/* Vendor List */}
        <div className="space-y-3">
          {vendors.map(vendor => (
            <div key={vendor.id} className="border border-white/10 rounded-xl p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {vendor.status === 'analyzed' && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {vendor.status === 'pending' && <Clock size={16} className="text-slate-500" />}
                  {vendor.status === 'analyzing' && <Loader2 size={16} className="animate-spin text-amber-400" />}
                  <h3 className="font-semibold">{vendor.name}</h3>
                </div>
                <p className="text-xs text-slate-500">{vendor.proposal_file_name}</p>
              </div>

              <div className="flex items-center gap-4">
                {vendor.status === 'analyzed' && (
                  <>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${scoreColor(vendor.compliance_score)}`}>
                        {vendor.compliance_score}%
                      </span>
                      <p className="text-xs text-slate-500">compliance</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-red-400">{vendor.risk_count}</span>
                      <p className="text-xs text-slate-500">risks</p>
                    </div>
                    <Link
                      href={`/projects/${id}/vendors/${vendor.id}`}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors"
                    >
                      Deep Dive →
                    </Link>
                  </>
                )}
                {vendor.status === 'pending' && (
                  <button
                    onClick={() => analyzeVendor(vendor.id)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-semibold transition-colors"
                  >
                    Analyze with AI
                  </button>
                )}
                {vendor.status === 'analyzing' && (
                  <span className="text-xs text-slate-500 animate-pulse">AI analyzing...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

