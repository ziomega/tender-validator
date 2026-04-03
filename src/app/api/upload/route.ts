import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from "@/lib/supabase-admin"
import { extractTextFromFile } from '@/lib/pdf-parser'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'rfp' | 'proposal'
    const projectId = formData.get('projectId') as string
    const vendorId = formData.get('vendorId') as string

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Extract text
    const text = await extractTextFromFile(file)

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const path = `${type === 'rfp' ? 'rfp' : `proposals/${vendorId}`}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('tender-documents')
      .upload(path, file, { contentType: file.type })

    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage
      .from('tender-documents')
      .getPublicUrl(path)

    // Update DB record
    if (type === 'rfp' && projectId) {
      await supabaseAdmin.from('projects').update({
        rfp_file_url: urlData.publicUrl,
        rfp_file_name: file.name,
        rfp_text: text,
      }).eq('id', projectId)
    } else if (type === 'proposal' && vendorId) {
      await supabaseAdmin.from('vendors').update({
        proposal_file_url: urlData.publicUrl,
        proposal_file_name: file.name,
        proposal_text: text,
      }).eq('id', vendorId)
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName: file.name,
      textLength: text.length,
      path,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}