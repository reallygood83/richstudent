'use client'

import { useState } from 'react'
import { Menu, X, Home, Users, GraduationCap, LogOut } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface MobileNavProps {
  userType?: 'teacher' | 'student' | 'guest'
  userName?: string
  userSchool?: string
  onLogout?: () => void
}

export default function MobileNav({
  userType = 'guest',
  userName,
  userSchool,
  onLogout
}: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const handleLinkClick = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-white/10"
          aria-label="메뉴 열기"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">💰</span>
            </div>
            <span>RichStudent</span>
          </SheetTitle>
          {userName && (
            <SheetDescription>
              {userName}
              {userSchool && ` • ${userSchool}`}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-8 flex flex-col space-y-4">
          {userType === 'guest' && (
            <>
              <a
                href="/"
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={handleLinkClick}
              >
                <Home className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900 font-medium">홈</span>
              </a>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-3 px-3">선생님</p>
                <a
                  href="/auth/login"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
                  onClick={handleLinkClick}
                >
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-900 font-medium">로그인</span>
                </a>
                <a
                  href="/auth/register"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
                  onClick={handleLinkClick}
                >
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-900 font-medium">회원가입</span>
                </a>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-3 px-3">학생</p>
                <a
                  href="/student/login"
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 transition-colors"
                  onClick={handleLinkClick}
                >
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900 font-medium">세션 코드로 접속</span>
                </a>
              </div>
            </>
          )}

          {userType === 'teacher' && (
            <>
              <a
                href="/teacher/dashboard"
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={handleLinkClick}
              >
                <Home className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900 font-medium">대시보드</span>
              </a>

              {onLogout && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => {
                      handleLinkClick()
                      onLogout()
                    }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut className="w-5 h-5 text-red-600" />
                    <span className="text-gray-900 font-medium">로그아웃</span>
                  </button>
                </div>
              )}
            </>
          )}

          {userType === 'student' && (
            <>
              <a
                href="/student/dashboard"
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={handleLinkClick}
              >
                <Home className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900 font-medium">내 대시보드</span>
              </a>

              {onLogout && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => {
                      handleLinkClick()
                      onLogout()
                    }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut className="w-5 h-5 text-red-600" />
                    <span className="text-gray-900 font-medium">로그아웃</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-xs text-gray-500 text-center">
            <p>RichStudent v1.0</p>
            <p className="mt-1">Financial Education Platform</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
