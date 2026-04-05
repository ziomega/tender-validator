'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Vendor = {
  id: string
  name: string
  compliance_score: number
  risk_count: number
  status: string
}

export default function DashboardPage() {
  const { id } = useParams()
  const [project, setProject] = useState<any>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('vendors').select('*').eq('project_id', id).eq('status', 'analyzed').order('compliance_score', { ascending: false }),
      supabase.from('requirements').select('*').eq('project_id', id).eq('is_confirmed', true),
    ]).then(([proj, vens, reqs]) => {
      setProject(proj.data)
      setVendors(vens.data || [])
      setRequirements(reqs.data || [])
      setLoading(false)
    })
  }, [id])

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Tender Compliance Report: ${project?.name}`, 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)

    autoTable(doc, {
      startY: 35,
      head: [['Vendor', 'Compliance Score', 'Risk Flags', 'Status']],
      body: vendors.map(v => [
        v.name,
        `${v.compliance_score}%`,
        v.risk_count.toString(),
        v.compliance_score >= 80 ? 'RECOMMENDED' : v.compliance_score >= 60 ? 'REVIEW' : 'DISQUALIFY',
      ]),
      theme: 'grid',
    })

    doc.save(`tender-report-${project?.name}.pdf`)
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const heatmapData = vendors.map(v => ({
    name: v.name.length > 15 ? v.name.slice(0, 15) + '…' : v.name,
    score: v.compliance_score,
    risks: v.risk_count,
  }))

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
            <Link href="/" className="hover:text-white">Projects</Link>
            <span className="mx-2">/</span>
            <Link href={`/projects/${id}/vendors`} className="hover:text-white">{project?.name}</Link>
            <span className="mx-2">/</span>
            <span>Dashboard</span>
          </div>
          <h1 className="text-lg font-bold">Compliance Comparison Dashboard</h1>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Download size={15} /> Export PDF Report
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {vendors.map(vendor => (
            <div
              key={vendor.id}
              className="border border-white/10 rounded-2xl p-6"
              style={{ borderColor: scoreColor(vendor.compliance_score) + '30' }}
            >
              <h3 className="font-semibold text-sm mb-4 truncate">{vendor.name}</h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-bold" style={{ color: scoreColor(vendor.compliance_score) }}>
                    {vendor.compliance_score}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Compliance Score</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-red-400 flex items-center gap-1 justify-end">
                    <AlertTriangle size={16} /> {vendor.risk_count}
                  </div>
                  <div className="text-xs text-slate-500">Risk Flags</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${vendor.compliance_score}%`, backgroundColor: scoreColor(vendor.compliance_score) }}
                />
              </div>
              <Link
                href={`/projects/${id}/vendors/${vendor.id}`}
                className="mt-4 block text-center text-xs py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                View Full Analysis →
              </Link>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-6">Compliance vs Risk Comparison</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={heatmapData} barGap={8}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="score" name="Compliance %" radius={[4, 4, 0, 0]}>
                {heatmapData.map((entry, index) => (
                  <Cell key={index} fill={scoreColor(entry.score)} />
                ))}
              </Bar>
              <Bar dataKey="risks" name="Risk Flags" fill="#ef4444" opacity={0.6} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking Table */}
        <div className="border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Board Recommendation</h2>
          <div className="space-y-2">
            {vendors.map((vendor, rank) => (
              <div key={vendor.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-slate-700">#{rank + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{vendor.name}</p>
                    <p className="text-xs text-slate-500">{vendor.risk_count} risk flags</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: scoreColor(vendor.compliance_score) }}>
                    {vendor.compliance_score}%
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    vendor.compliance_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                    vendor.compliance_score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {vendor.compliance_score >= 80 ? 'RECOMMENDED' : vendor.compliance_score >= 60 ? 'NEEDS REVIEW' : 'DISQUALIFY'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}