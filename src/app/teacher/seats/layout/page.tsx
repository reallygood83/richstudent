'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SeatLayoutConfig from '@/components/teacher/SeatLayoutConfig';
import { useEffect } from 'react';

export default function SeatLayoutPage() {
  const router = useRouter();
  const { teacher, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !teacher) {
      router.push('/auth/login');
    }
  }, [teacher, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/teacher/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>대시보드로</span>
              </Button>

              <div className="text-2xl">🪑</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">좌석 배치 설정</h1>
                <p className="text-xs text-gray-500">학생 수에 맞게 교실 좌석을 배치하세요</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SeatLayoutConfig />
      </main>
    </div>
  );
}
