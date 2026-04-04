import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SYSTEM_PROMPT = `You are a contract compliance expert. 
Analyze vendor proposals against RFP requirements using semantic understanding.
Respond with valid JSON only.`

export async function POST(req: NextRequest) {
  try {
    const { vendorId, projectId } = await req.json()

    // Fetch vendor and all confirmed requirements
    const [vendorRes, requirementsRes] = await Promise.all([
      supabaseAdmin.from('vendors').select('*').eq('id', vendorId).single(),
      supabaseAdmin.from('requirements').select('*')
        .eq('project_id', projectId)
        .eq('is_confirmed', true),
    ])

    if (vendorRes.error) throw vendorRes.error
    if (requirementsRes.error) throw requirementsRes.error

    const vendor = vendorRes.data
    const requirements = requirementsRes.data
    const proposalText = vendor.proposal_text?.slice(0, 15000) || ''

    // Process requirements in batches of 10
    const batchSize = 10
    const allMatches: any[] = []

    for (let i = 0; i < requirements.length; i += batchSize) {
      const batch = requirements.slice(i, i + batchSize)
      
      const prompt = `You are checking if a vendor's proposal satisfies each RFP requirement.
      
For each requirement, find the most relevant section in the proposal and assess compliance.

Requirements to check:
${batch.map((r, idx) => `${idx + 1}. [ID: ${r.id}] ${r.text}`).join('\n')}

Vendor Proposal Text:
${proposalText}

Return a JSON array with one entry per requirement:
[
  {
    "requirement_id": "the-uuid-here",
    "status": "met" | "partial" | "missing",
    "confidence": 0.0-1.0,
    "matched_text": "the exact excerpt from the proposal that addresses this (or null if missing)",
    "explanation": "brief explanation of why this status was assigned"
  }
]

Guidelines:
- "met": clearly and specifically addressed (confidence > 0.7)
- "partial": vaguely mentioned or implied (confidence 0.3-0.7)  
- "missing": not addressed at all (confidence < 0.3)`

      const result = await callClaude(prompt, SYSTEM_PROMPT)
      
      let matches: any[]
      try {
        matches = JSON.parse(result)
      } catch {
        const jsonMatch = result.match(/\[[\s\S]*\]/)
        if (!jsonMatch) continue
        matches = JSON.parse(jsonMatch[0])
      }
      
      allMatches.push(...matches)
    }

    // Insert all matches
    const { error: matchError } = await supabaseAdmin
      .from('requirement_matches')
      .insert(
        allMatches.map((m: any) => ({
          vendor_id: vendorId,
          requirement_id: m.requirement_id,
          status: m.status,
          confidence: m.confidence,
          matched_text: m.matched_text,
          explanation: m.explanation,
        }))
      )

    if (matchError) throw matchError

    // Calculate compliance score
    const metCount = allMatches.filter(m => m.status === 'met').length
    const partialCount = allMatches.filter(m => m.status === 'partial').length
    const total = allMatches.length

    const score = total > 0
      ? Math.round(((metCount + partialCount * 0.5) / total) * 100)
      : 0

    // Update vendor score
    await supabaseAdmin
      .from('vendors')
      .update({ compliance_score: score, status: 'analyzed' })
      .eq('id', vendorId)

    return NextResponse.json({ score, matches: allMatches.length })
  } catch (error: any) {
    console.error('Analyze vendor error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

