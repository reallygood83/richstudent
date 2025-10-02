'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { 
  GraduationCap, 
  Users, 
  DollarSign, 
  BookOpen,
  TrendingUp,
  Shield,
  Award,
  BarChart3,
  Target,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 animated-bg"></div>
      <div className="absolute inset-0 bg-black/20"></div>
      
      {/* Header */}
      <header className="relative z-10 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-financial-teal rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">RichStudent</h1>
                <p className="text-sm text-white/80">Financial Education Platform</p>
              </div>
            </motion.div>
            
            <motion.div
              className="hidden md:flex items-center space-x-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="text-white/90 text-sm">
                <span className="text-financial-gold font-semibold">10,000+</span> 학습자
              </div>
              <div className="text-white/90 text-sm">
                <span className="text-financial-gold font-semibold">500+</span> 학교
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-8 backdrop-blur-sm border border-white/20">
              <Award className="w-5 h-5 text-financial-gold mr-2" />
              <span className="text-white text-sm font-medium">대한민국 최고의 경제교육 플랫폼</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-8 leading-tight">
              미래의 <span className="text-financial-gold">금융 리더</span>를
              <br />키우는 특별한 경험
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-6 max-w-4xl mx-auto leading-relaxed">
              실제 금융 시장과 똑같은 환경에서 투자, 거래, 대출을 체험하며
              <br />경제 원리를 자연스럽게 학습하는 혁신적인 교육 플랫폼
            </p>
            
            <p className="text-lg text-white/70 mb-12 max-w-3xl mx-auto">
              가상이지만 실전 같은 경험으로 학생들의 금융 이해력과 경제적 사고력을 키워주세요
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-financial-gold mb-2">98%</div>
              <div className="text-white/80 text-sm">학습 만족도</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-financial-gold mb-2">5분</div>
              <div className="text-white/80 text-sm">평균 가입 시간</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-financial-gold mb-2">24/7</div>
              <div className="text-white/80 text-sm">실시간 거래</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-financial-gold mb-2">100%</div>
              <div className="text-white/80 text-sm">무료 사용</div>
            </div>
          </motion.div>
        </div>

        {/* Access Cards */}
        <motion.div 
          className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          {/* Teacher Card */}
          <Card className="financial-card bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-tech opacity-20 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-4 text-3xl text-financial-navy">
                <div className="p-3 bg-gradient-tech rounded-xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <span>선생님 접속</span>
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                학급을 관리하고 차세대 금융 교육을 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-teal" />
                  <span className="text-sm text-gray-700">학생 관리</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-teal" />
                  <span className="text-sm text-gray-700">실시간 모니터링</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-teal" />
                  <span className="text-sm text-gray-700">가상 화폐 발행</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-teal" />
                  <span className="text-sm text-gray-700">수업 계획</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">주요 기능</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 벌크 학생 등록 및 계정 관리</li>
                  <li>• 실시간 거래 승인 및 모니터링</li>
                  <li>• 투자 포트폴리오 분석 도구</li>
                  <li>• 세금 징수 및 정부 정책 시뮬레이션</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Button asChild className="w-full bg-gradient-tech text-white hover:shadow-lg glow-effect group">
                  <a href="/auth/login" className="flex items-center justify-center">
                    선생님 로그인
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full border-financial-teal text-financial-teal hover:bg-financial-teal hover:text-white">
                  <a href="/auth/register">선생님 회원가입</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card className="financial-card bg-white/95 backdrop-blur-sm border-0 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-success opacity-20 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-4 text-3xl text-financial-navy">
                <div className="p-3 bg-gradient-success rounded-xl">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <span>학생 접속</span>
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                세션 코드로 접속하여 금융의 세계를 탐험하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-green" />
                  <span className="text-sm text-gray-700">자산 관리</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-green" />
                  <span className="text-sm text-gray-700">실시간 거래</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-green" />
                  <span className="text-sm text-gray-700">투자 체험</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-financial-green" />
                  <span className="text-sm text-gray-700">대출 시스템</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">체험 가능한 활동</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 주식, 암호화폐, 원자재 투자</li>
                  <li>• 부동산(교실 좌석) 거래</li>
                  <li>• 신용 점수 관리 및 대출</li>
                  <li>• 학생 간 자금 이체 및 거래</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Button asChild className="w-full bg-gradient-success text-white hover:shadow-lg glow-effect group">
                  <a href="/student/login" className="flex items-center justify-center">
                    학생 로그인
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    <Shield className="w-4 h-4 inline mr-1" />
                    선생님이 제공한 세션 코드로 안전하게 접속
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-financial-navy mb-6">
              왜 <span className="text-financial-gold">RichStudent</span>인가요?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              실제 금융 시장의 복잡함을 교육에 맞게 단순화하여, 학생들이 쉽고 재미있게 경제를 배울 수 있습니다
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <motion.div 
              className="text-center group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-gold rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-financial-teal rounded-full pulse-financial"></div>
              </div>
              <h3 className="text-2xl font-bold text-financial-navy mb-4">실전 경험</h3>
              <p className="text-gray-600 leading-relaxed">
                Yahoo Finance와 연동된 실시간 시장 데이터로 진짜 투자 경험을 제공하며, 
                이론이 아닌 실전을 통해 경제 원리를 체험합니다
              </p>
            </motion.div>
            
            <motion.div 
              className="text-center group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-success rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-financial-gold rounded-full pulse-financial"></div>
              </div>
              <h3 className="text-2xl font-bold text-financial-navy mb-4">협력 학습</h3>
              <p className="text-gray-600 leading-relaxed">
                학생들 간의 자금 이체, 공동 투자, 경쟁적 거래를 통해 
                사회적 경제 활동과 협력의 중요성을 자연스럽게 학습합니다
              </p>
            </motion.div>
            
            <motion.div 
              className="text-center group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-tech rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-financial-green rounded-full pulse-financial"></div>
              </div>
              <h3 className="text-2xl font-bold text-financial-navy mb-4">혁신 기술</h3>
              <p className="text-gray-600 leading-relaxed">
                최신 웹 기술과 실시간 데이터 연동으로 끊김 없는 사용자 경험을 제공하며, 
                모든 기기에서 언제든지 접속 가능합니다
              </p>
            </motion.div>
          </div>

          {/* Advanced Features */}
          <motion.div 
            className="bg-gradient-to-r from-financial-navy to-financial-slate rounded-3xl p-8 md:p-12 text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6">전문적인 금융 교육 도구</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-6 h-6 text-financial-gold" />
                    <span>실시간 포트폴리오 분석 및 수익률 계산</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-6 h-6 text-financial-gold" />
                    <span>신용 점수 시스템 및 대출 심사 프로세스</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-6 h-6 text-financial-gold" />
                    <span>다중 계좌 관리 (당좌, 저축, 투자)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-6 h-6 text-financial-gold" />
                    <span>정부, 은행, 증권사 시뮬레이션</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 floating">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-financial-gold mb-2">15분</div>
                    <div className="text-white/80 text-sm">마다 자동 시장 업데이트</div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">AAPL</span>
                      <span className="text-financial-green text-sm">+2.4%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Bitcoin</span>
                      <span className="text-financial-green text-sm">+5.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">Gold</span>
                      <span className="text-red-400 text-sm">-1.2%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-financial-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">RichStudent</h3>
                <p className="text-white/70 text-sm">Financial Education Platform</p>
              </div>
            </div>
            <p className="text-white/70 mb-6 max-w-2xl mx-auto">
              미래의 금융 리더를 키우는 혁신적인 경제 교육 플랫폼으로, 
              학생들이 실전 경험을 통해 경제 원리를 배울 수 있도록 돕습니다.
            </p>
            <div className="border-t border-white/20 pt-6">
              <p className="text-white/50 text-sm">
                © 2024 RichStudent. 모든 권리 보유. 
                <span className="mx-2">|</span>
                교육용 시뮬레이션 플랫폼
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}