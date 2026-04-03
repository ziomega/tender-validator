import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

const SYSTEM_PROMPT = `You are a legal risk analyst specializing in contract review.
Identify problematic clauses, liability traps, and vague commitments in vendor proposals.
Respond with valid JSON only.`

export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await req.json()

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors').select('*').eq('id', vendorId).single()
    if (error) throw error

    const proposalText = vendor.proposal_text?.slice(0, 15000) || ''

    const prompt = `Analyze this vendor proposal for contractual red flags and risky clauses.

Look for:
- LIABILITY LIMITERS: "limited liability", "not responsible for", "excludes liability", "maximum liability shall not exceed"
- VAGUE COMMITMENTS: "subject to change", "best efforts", "where possible", "at our discretion", "as applicable"  
- HIDDEN COSTS: "additional fees may apply", "not included", "at extra cost", "upon request"
- APPROVAL GATES: "pending approval", "subject to review", "conditional upon", "if approved"
- UNILATERAL RIGHTS: "reserves the right", "may modify", "at any time", "without notice"
- WEAK SLAs: "reasonable time", "commercially reasonable", "industry standard" (without defining them)

Vendor Proposal Text:
${proposalText}

Return a JSON array:
[
  {
    "flagged_text": "exact quote from the proposal",
    "risk_type": "liability" | "vague" | "fees" | "approval" | "rights" | "sla" | "other",
    "impact_summary": "2-3 sentence explanation of the business/legal risk this poses",
    "severity": "low" | "medium" | "high"
  }
]`

    const result = await callClaude(prompt, SYSTEM_PROMPT)
    
    let risks: any[]
    try {
      risks = JSON.parse(result)
    } catch {
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Failed to parse risks')
      risks = JSON.parse(jsonMatch[0])
    }

    const { error: insertError } = await supabaseAdmin
      .from('risk_flags')
      .insert(risks.map((r: any) => ({
        vendor_id: vendorId,
        flagged_text: r.flagged_text,
        risk_type: r.risk_type,
        impact_summary: r.impact_summary,
        severity: r.severity,
      })))

    if (insertError) throw insertError

    // Update vendor risk count
    await supabaseAdmin
      .from('vendors')
      .update({ risk_count: risks.length })
      .eq('id', vendorId)

    return NextResponse.json({ risks: risks.length, data: risks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}