'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, User, LogOut } from 'lucide-react';
import ClassroomSeats from '@/components/student/ClassroomSeats';

interface StudentSession {
  studentId: string;
  studentName: string;
  studentCode: string;
  teacherId: string;
  teacherName: string;
  sessionCode: string;
}

export default function StudentRealEstatePage() {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/student/me');
        const data = await response.json();

        if (data.success) {
          setSession(data.session);
        } else {
          setError(data.error);
          if (data.error === '인증이 필요합니다.') {
            router.push('/student/login');
          }
        }
      } catch {
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/student/logout', { method: 'POST' });
      router.push('/student/login');
    } catch {
      router.push('/student/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!session) {
    router.push('/student/login');
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
                onClick={() => router.push('/student/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>대시보드로</span>
              </Button>
              
              <div className="text-2xl">🏠</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">교실 좌석 거래소</h1>
                <p className="text-xs text-gray-500">{session.teacherName} 선생님 ({session.sessionCode})</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {session.studentName}
                </p>
                <p className="text-xs text-gray-500">{session.studentCode}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClassroomSeats />
      </main>
    </div>
  );
}