import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Password protection is disabled in self-hosted version
  // If you need authentication, implement it in the server instead
  return NextResponse.next()
}
