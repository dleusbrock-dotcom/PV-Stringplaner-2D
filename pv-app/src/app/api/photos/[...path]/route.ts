import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { auth } from '@/lib/auth/config'

const STORAGE_DIR = process.env.STORAGE_LOCAL_PATH ?? join(process.cwd(), 'storage')

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
}

interface Params { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, { params }: Params) {
  // Auth check
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { path } = await params
  // path is something like ["photos", "projectId", "filename.jpg"]
  const relativePath = path.join('/')

  // Security: prevent path traversal
  if (relativePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const filePath = join(STORAGE_DIR, relativePath)

  try {
    await stat(filePath)
    const buffer = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
