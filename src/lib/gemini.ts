// Gemini AI 서비스 라이브러리

import { GoogleGenerativeAI } from '@google/generative-ai'
import { StudentLevel } from '@/types/news'

export class GeminiNewsService {
  private apiKey: string
  private genAI: GoogleGenerativeAI
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' })
  }

  /**
   * 뉴스 내용을 학생 수준에 맞게 파인만 기법으로 설명
   */
  async explainNews(
    title: string,
    content: string,
    level: StudentLevel
  ): Promise<string> {
    const prompt = this.buildPrompt(title, content, level)

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return text.trim()
    } catch (error) {
      console.error('Gemini AI explanation error:', error)
      throw new Error('AI 해설 생성에 실패했습니다.')
    }
  }

  /**
   * 학생 수준별 프롬프트 생성 (파인만 기법 적용)
   */
  private buildPrompt(title: string, content: string, level: StudentLevel): string {
    const levelDescriptions = {
      elementary: {
        age: '초등학교 5-6학년',
        approach: '일상생활 예시를 활용하여 용돈, 저금통, 게임 아이템 같은 친숙한 비유',
        vocabulary: '쉬운 단어와 짧은 문장'
      },
      middle: {
        age: '중학생',
        approach: '학교 매점, 용돈 관리, 스마트폰 요금제 같은 실생활 경험',
        vocabulary: '기본 경제 용어 설명 포함'
      },
      high: {
        age: '고등학생',
        approach: '대학 등록금, 아르바이트, 주식 투자 같은 구체적 경제 활동',
        vocabulary: '경제 전문 용어와 개념'
      }
    }

    const levelInfo = levelDescriptions[level]

    return `
당신은 경제 교육 전문가입니다. 다음 뉴스 기사를 **${levelInfo.age}** 수준에 맞게 설명해주세요.

**파인만 기법 적용 규칙**:
1. ${levelInfo.vocabulary}를 사용하세요
2. ${levelInfo.approach}을 활용하여 설명하세요
3. 어려운 경제 용어는 쉬운 말로 바꾸어 설명하세요
4. 학생들이 실제 투자나 경제 결정을 할 때 도움이 되는 인사이트를 제공하세요
5. 3-5문장으로 요약하세요

**뉴스 제목**: ${title}

**뉴스 내용**: ${content}

**출력 형식**:
- 간단명료하게 핵심만 전달
- 투자나 경제 활동에 어떤 영향을 미치는지 설명
- "이 뉴스는..." 같은 불필요한 서두 없이 바로 본론부터 시작
`.trim()
  }

  /**
   * API 키 유효성 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = '안녕하세요라고 간단히 답변해주세요.'
      const result = await this.model.generateContent(testPrompt)
      await result.response

      return true
    } catch {
      return false
    }
  }

  /**
   * 퀴즈 생성 (향후 확장 기능)
   */
  async generateQuiz(title: string, content: string, level: StudentLevel): Promise<string> {
    const prompt = `
다음 경제 뉴스를 읽고 ${level === 'elementary' ? '초등학교 5-6학년' : level === 'middle' ? '중학생' : '고등학생'} 수준의 3지선다 퀴즈를 1개 만들어주세요.

**뉴스**: ${title}
${content}

**출력 형식**:
질문: (질문 내용)
1) 선택지 1
2) 선택지 2
3) 선택지 3
정답: (번호)
해설: (간단한 설명)
`.trim()

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text().trim()
    } catch (error) {
      console.error('Quiz generation error:', error)
      throw new Error('퀴즈 생성에 실패했습니다.')
    }
  }
}
