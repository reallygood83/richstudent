// Gemini API를 활용한 퀴즈 자동 생성 유틸리티
// AI가 영어, 한자, 사자성어 문제를 자동으로 생성

import { GoogleGenerativeAI } from '@google/generative-ai'

// 퀴즈 문제 타입 정의
export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

// 퀴즈 타입
export type QuizType = 'english' | 'chinese' | 'idiom'

/**
 * AI로 퀴즈 문제 자동 생성 (교사별 API 키 사용)
 * @param apiKey - 교사의 Gemini API 키 (news_settings 테이블에서 가져옴)
 * @param quizType - 퀴즈 종류 (english, chinese, idiom)
 * @param questionCount - 생성할 문제 개수 (기본 5개)
 * @returns 생성된 퀴즈 문제 배열
 */
export async function generateQuizWithGemini(
  apiKey: string,
  quizType: QuizType,
  questionCount: number = 5
): Promise<QuizQuestion[]> {
  try {
    // 교사별 API 키로 Gemini 클라이언트 생성
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = getPromptForQuizType(quizType, questionCount)

    console.log('🤖 Gemini API 호출 시작:', { quizType, questionCount })

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    console.log('✅ Gemini API 응답 받음:', text.substring(0, 200))

    // JSON 파싱 (마크다운 코드 블록 제거)
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(jsonText)

    // 검증
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response format: questions array not found')
    }

    interface RawQuestion {
      question: string
      options: string[]
      correct_answer: string
      explanation: string
    }
    const questions: QuizQuestion[] = parsed.questions.map((q: RawQuestion) => ({
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }))

    console.log(`✅ ${questions.length}개 문제 생성 완료`)

    return questions

  } catch (error) {
    console.error('❌ Gemini API 에러:', error)
    throw new Error(`퀴즈 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 퀴즈 타입별 프롬프트 생성
 */
function getPromptForQuizType(quizType: QuizType, count: number): string {
  const baseInstructions = `
응답은 반드시 다음 JSON 형식으로만 제공하세요:

{
  "questions": [
    {
      "question": "문제 텍스트",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correct_answer": "정답",
      "explanation": "해설 (1-2문장)"
    }
  ]
}
`

  switch (quizType) {
    case 'english':
      return `
초등학생을 위한 영어 단어 문제 ${count}개를 생성해주세요.

요구사항:
1. 난이도: 쉬움 (초등 3-4학년 수준)
2. 형식: 객관식 4지선다
3. 주제: 일상생활 관련 영어 단어 (과일, 동물, 색깔, 숫자, 가족, 학용품 등)
4. 문제 유형:
   - 한글 뜻을 보고 영어 단어 고르기
   - 영어 단어를 보고 한글 뜻 고르기
   - 간단한 영어 문장의 빈칸 채우기

${baseInstructions}

예시:
{
  "questions": [
    {
      "question": "다음 중 '사과'를 영어로 옳게 쓴 것은?",
      "options": ["Apple", "Banana", "Orange", "Grape"],
      "correct_answer": "Apple",
      "explanation": "사과는 영어로 Apple입니다. 빨간색이나 초록색을 띄는 과일이에요."
    }
  ]
}
`

    case 'chinese':
      return `
초등학생을 위한 한자 문제 ${count}개를 생성해주세요.

요구사항:
1. 난이도: 8급 수준 (쉬운 한자)
2. 형식: 객관식 4지선다
3. 주제: 자주 쓰이는 기본 한자 (숫자, 방향, 가족, 자연, 색깔 등)
4. 한자 예시: 一二三四五六七八九十, 大小中, 上下左右, 父母兄弟, 山水火木金 등
5. 문제 유형:
   - 한자를 보고 뜻 고르기
   - 뜻을 보고 한자 고르기
   - 한자의 음(소리) 고르기

${baseInstructions}

예시:
{
  "questions": [
    {
      "question": "다음 한자의 뜻으로 옳은 것은? 一",
      "options": ["하나", "둘", "셋", "넷"],
      "correct_answer": "하나",
      "explanation": "一(일)은 '하나'라는 뜻입니다. 숫자 1을 나타내는 가장 기본적인 한자예요."
    }
  ]
}
`

    case 'idiom':
      return `
초등학생을 위한 사자성어 문제 ${count}개를 생성해주세요.

요구사항:
1. 난이도: 쉬움 (자주 쓰이는 사자성어)
2. 형식: 객관식 4지선다
3. 주제: 교훈이나 생활에 도움이 되는 사자성어
4. 사자성어 예시: 일석이조, 금상첨화, 동고동락, 역지사지, 백발백중, 새옹지마 등
5. 문제 유형:
   - 사자성어의 뜻 고르기
   - 뜻에 맞는 사자성어 고르기
   - 사자성어를 사용하기 적절한 상황 고르기

${baseInstructions}

예시:
{
  "questions": [
    {
      "question": "'일석이조(一石二鳥)'의 뜻으로 옳은 것은?",
      "options": [
        "한 가지 일로 두 가지 이익을 얻음",
        "하나에만 집중해야 함",
        "두 가지 일을 동시에 못함",
        "돌을 던져 새를 쫓음"
      ],
      "correct_answer": "한 가지 일로 두 가지 이익을 얻음",
      "explanation": "일석이조는 '돌(石) 하나로 새(鳥) 두 마리를 잡는다'는 뜻으로, 한 번의 행동으로 두 가지 이익을 동시에 얻는다는 의미예요."
    }
  ]
}
`

    default:
      throw new Error(`Unknown quiz type: ${quizType}`)
  }
}

/**
 * 퀴즈 문제 검증 (생성된 문제가 올바른지 확인)
 */
export function validateQuizQuestions(questions: QuizQuestion[]): boolean {
  for (const q of questions) {
    // 필수 필드 확인
    if (!q.question || !q.options || !q.correct_answer || !q.explanation) {
      console.error('❌ 필수 필드 누락:', q)
      return false
    }

    // 선택지 개수 확인 (4개여야 함)
    if (q.options.length !== 4) {
      console.error('❌ 선택지 개수 오류:', q.options)
      return false
    }

    // 정답이 선택지에 포함되어 있는지 확인
    if (!q.options.includes(q.correct_answer)) {
      console.error('❌ 정답이 선택지에 없음:', q)
      return false
    }
  }

  return true
}

/**
 * 테스트용 샘플 퀴즈 생성 (API 키 없을 때 사용)
 */
export function generateSampleQuiz(quizType: QuizType): QuizQuestion[] {
  const samples: Record<QuizType, QuizQuestion[]> = {
    english: [
      {
        question: "다음 중 '사과'를 영어로 옳게 쓴 것은?",
        options: ["Apple", "Banana", "Orange", "Grape"],
        correct_answer: "Apple",
        explanation: "사과는 영어로 Apple입니다. 빨간색이나 초록색을 띄는 과일이에요."
      },
      {
        question: "'강아지'를 영어로 어떻게 쓸까요?",
        options: ["Dog", "Cat", "Bird", "Fish"],
        correct_answer: "Dog",
        explanation: "강아지는 영어로 Dog입니다. 사람의 가장 친한 동물 친구예요."
      },
      {
        question: "다음 중 '빨간색'을 영어로 옳게 쓴 것은?",
        options: ["Red", "Blue", "Yellow", "Green"],
        correct_answer: "Red",
        explanation: "빨간색은 영어로 Red입니다. 사과나 딸기의 색깔이에요."
      },
      {
        question: "'학교'를 영어로 어떻게 쓸까요?",
        options: ["School", "Home", "Park", "Store"],
        correct_answer: "School",
        explanation: "학교는 영어로 School입니다. 우리가 공부하러 가는 곳이에요."
      },
      {
        question: "다음 중 '책'을 영어로 옳게 쓴 것은?",
        options: ["Book", "Pencil", "Paper", "Desk"],
        correct_answer: "Book",
        explanation: "책은 영어로 Book입니다. 우리가 읽고 배우는 도구예요."
      }
    ],
    chinese: [
      {
        question: "다음 한자의 뜻으로 옳은 것은? 一",
        options: ["하나", "둘", "셋", "넷"],
        correct_answer: "하나",
        explanation: "一(일)은 '하나'라는 뜻입니다. 숫자 1을 나타내는 가장 기본적인 한자예요."
      },
      {
        question: "다음 한자의 뜻으로 옳은 것은? 大",
        options: ["크다", "작다", "높다", "낮다"],
        correct_answer: "크다",
        explanation: "大(대)는 '크다'라는 뜻입니다. 사람이 팔을 벌린 모습을 본뜬 한자예요."
      },
      {
        question: "다음 한자의 뜻으로 옳은 것은? 山",
        options: ["산", "강", "바다", "하늘"],
        correct_answer: "산",
        explanation: "山(산)은 '산'을 뜻합니다. 세 개의 봉우리가 솟은 모습을 본뜬 한자예요."
      },
      {
        question: "다음 한자의 뜻으로 옳은 것은? 水",
        options: ["물", "불", "흙", "나무"],
        correct_answer: "물",
        explanation: "水(수)는 '물'을 뜻합니다. 물이 흐르는 모습을 본뜬 한자예요."
      },
      {
        question: "다음 한자의 뜻으로 옳은 것은? 上",
        options: ["위", "아래", "왼쪽", "오른쪽"],
        correct_answer: "위",
        explanation: "上(상)은 '위'를 뜻합니다. 선 위에 점이 있어서 위쪽을 나타내요."
      }
    ],
    idiom: [
      {
        question: "'일석이조(一石二鳥)'의 뜻으로 옳은 것은?",
        options: [
          "한 가지 일로 두 가지 이익을 얻음",
          "하나에만 집중해야 함",
          "두 가지 일을 동시에 못함",
          "돌을 던져 새를 쫓음"
        ],
        correct_answer: "한 가지 일로 두 가지 이익을 얻음",
        explanation: "일석이조는 '돌(石) 하나로 새(鳥) 두 마리를 잡는다'는 뜻으로, 한 번의 행동으로 두 가지 이익을 동시에 얻는다는 의미예요."
      },
      {
        question: "'역지사지(易地思之)'의 뜻으로 옳은 것은?",
        options: [
          "상대방의 입장에서 생각함",
          "어려운 일을 쉽게 해결함",
          "다른 곳으로 이동함",
          "생각을 바꿈"
        ],
        correct_answer: "상대방의 입장에서 생각함",
        explanation: "역지사지는 '처지를 바꿔 생각한다'는 뜻으로, 상대방의 입장이 되어 생각해보라는 의미예요."
      },
      {
        question: "'백발백중(百發百中)'의 뜻으로 옳은 것은?",
        options: [
          "모든 시도가 성공함",
          "머리카락이 하얗게 됨",
          "백 번 쏘면 백 번 빗나감",
          "여러 번 시도해야 함"
        ],
        correct_answer: "모든 시도가 성공함",
        explanation: "백발백중은 '백 번 쏘면 백 번 맞는다'는 뜻으로, 시도하는 일마다 모두 성공한다는 의미예요."
      },
      {
        question: "'동고동락(同苦同樂)'의 뜻으로 옳은 것은?",
        options: [
          "괴로움과 즐거움을 함께함",
          "같은 곳에서 공부함",
          "동시에 움직임",
          "같은 취미를 가짐"
        ],
        correct_answer: "괴로움과 즐거움을 함께함",
        explanation: "동고동락은 '괴로움(苦)과 즐거움(樂)을 함께(同) 한다'는 뜻으로, 좋을 때나 나쁠 때나 함께한다는 의미예요."
      },
      {
        question: "'새옹지마(塞翁之馬)'의 뜻으로 옳은 것은?",
        options: [
          "인생의 길흉화복을 예측할 수 없음",
          "말을 잘 타는 노인",
          "변방의 말이 빠름",
          "노인이 말을 잃어버림"
        ],
        correct_answer: "인생의 길흉화복을 예측할 수 없음",
        explanation: "새옹지마는 '변방 노인의 말'이라는 뜻으로, 인생의 좋고 나쁜 일을 미리 알 수 없다는 의미예요. 나쁜 일이 좋은 일로, 좋은 일이 나쁜 일로 바뀔 수 있어요."
      }
    ]
  }

  return samples[quizType]
}
