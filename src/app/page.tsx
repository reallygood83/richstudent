export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          💰 RichStudent
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          경제 교육의 새로운 시작
        </p>
        <div className="space-x-4">
          <a href="/auth/login" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            로그인
          </a>
          <a href="/auth/register" className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600">
            회원가입
          </a>
        </div>
      </div>
    </div>
  )
}