'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-gray-800 mb-2">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
        </div>

        <div className="flex justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto" size="lg">
              <Home className="w-4 h-4 mr-2" />
              홈으로 가기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
