'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'form' | 'uploading' | 'extracting'>('form')
  const [error, setError] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  const handleSubmit = async () => {
    if (!name || !file) { setError('Project name and RFP file are required.'); return }
    setError('')
    setStep('uploading')

    try {
      // Create project record first
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({ name, description, status: 'draft' })
        .select()
        .single()

      if (projectError) throw projectError

      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'rfp')
      formData.append('projectId', project.id)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')

      setStep('extracting')

      // Get text back and extract requirements
      const { textLength } = await uploadRes.json()

      // Fetch the project to get rfp_text
      const { data: updatedProject } = await supabase
        .from('projects').select('rfp_text').eq('id', project.id).single()

      const extractRes = await fetch('/api/extract-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, text: updatedProject?.rfp_text }),
      })

      if (!extractRes.ok) throw new Error('Requirement extraction failed')

      // Update project status
      await supabase.from('projects').update({ status: 'reviewing' }).eq('id', project.id)

      router.push(`/projects/${project.id}/requirements`)
    } catch (err: any) {
      setError(err.message)
      setStep('form')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-8 py-5">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors w-fit">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">New Tender Review</h1>
        <p className="text-slate-400 mb-10">Upload your RFP document to automatically extract compliance requirements.</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. City Metro Infrastructure RFP 2025"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500/60 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this tender..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500/60 placeholder-slate-600 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">RFP Document *</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="text-amber-400" size={24} />
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto text-slate-500 mb-3" size={28} />
                  <p className="text-sm font-medium">Drop your RFP here, or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX, TXT</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={step !== 'form'}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {step === 'uploading' && <><Loader2 size={16} className="animate-spin" /> Uploading document...</>}
            {step === 'extracting' && <><Loader2 size={16} className="animate-spin" /> Extracting requirements with AI...</>}
            {step === 'form' && 'Upload & Extract Requirements →'}
          </button>
        </div>
      </main>
    </div>
  )
}