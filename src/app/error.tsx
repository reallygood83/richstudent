'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <AlertCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
          <h2 className="text-3xl font-semibold text-gray-800 mb-2">
            오류가 발생했습니다
          </h2>
          <p className="text-gray-600 mb-4">
            페이지를 표시하는 중 문제가 발생했습니다.
          </p>
          {error.message && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-mono">{error.message}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => reset()} className="w-full sm:w-auto" size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.href = '/'}
            className="w-full sm:w-auto"
          >
            홈으로 가기
          </Button>
        </div>
      </div>
    </div>
  )
}
