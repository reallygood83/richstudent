import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-600">
          <p>
            © 2025 교사 김문정 | 안양박달초 | 
            <a 
              href="https://www.youtube.com/@%EB%B0%B0%EC%9B%80%EC%9D%98%EB%8B%AC%EC%9D%B8-p5v"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-blue-600 hover:text-blue-800 underline"
            >
              유튜브 배움의 달인
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}