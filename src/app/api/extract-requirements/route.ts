import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SYSTEM_PROMPT = `You are a legal and procurement expert specializing in analyzing RFP (Request for Proposal) documents. 
Your job is to extract ALL mandatory requirements from the document.
You MUST respond with valid JSON only, no markdown, no explanation.`

export async function POST(req: NextRequest) {
  try {
    const { projectId, text } = await req.json()

    const prompt = `Analyze this RFP document and extract ALL mandatory requirements.

Look for sentences containing: "shall", "must", "required", "mandatory", "will", "is required to", "needs to".

For each requirement, determine its category:
- "Technical": specs, systems, software, hardware, performance
- "Legal": certifications, compliance, regulations, insurance, licensing
- "Financial": pricing, payment, penalties, costs, financial guarantees
- "General": timelines, delivery, support, communication, staffing

Return a JSON array with this exact structure:
[
  {
    "text": "The vendor must provide 24/7 technical support",
    "category": "Technical",
    "source_sentence": "exact sentence from document",
    "priority": "mandatory"
  }
]

RFP Document Text:
${text.slice(0, 15000)}`

    const result = await callClaude(prompt, SYSTEM_PROMPT)
    
    let requirements: any[]
    try {
      requirements = JSON.parse(result)
    } catch {
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Failed to parse AI response')
      requirements = JSON.parse(jsonMatch[0])
    }

    // Insert into DB
    const { data, error } = await supabaseAdmin
      .from('requirements')
      .insert(
        requirements.map((r: any) => ({
          project_id: projectId,
          text: r.text,
          category: r.category,
          source_sentence: r.source_sentence,
          priority: r.priority || 'mandatory',
          is_confirmed: false,
        }))
      )
      .select()

    if (error) throw error

    return NextResponse.json({ requirements: data, count: data?.length })
  } catch (error: any) {
    console.error('Extract requirements error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}