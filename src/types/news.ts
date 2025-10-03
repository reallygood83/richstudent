// 경제뉴스 피드 시스템 타입 정의

export type StudentLevel = 'elementary' | 'middle' | 'high'
export type NewsSource = 'maeil' | 'yonhap'

export interface NewsSettings {
  id: string
  teacher_id: string
  gemini_api_key: string | null
  student_level: StudentLevel
  auto_refresh_enabled: boolean
  refresh_interval_minutes: number
  created_at: string
  updated_at: string
  has_api_key?: boolean  // API 응답에서만 사용
}

export interface NewsFeed {
  id: string
  source: NewsSource
  title: string
  description: string | null
  link: string
  pub_date: string | null
  image_url: string | null
  original_content: string | null
  cached_at: string
}

export interface NewsExplanation {
  id: string
  news_id: string
  student_level: StudentLevel
  explanation: string
  created_at: string
}

export interface NewsWithExplanation extends NewsFeed {
  explanation: NewsExplanation | null
}

export interface RSSFeedItem {
  title: string
  link: string
  pubDate?: string
  contentSnippet?: string
  content?: string
  enclosure?: {
    url: string
  }
  'media:thumbnail'?: Array<{
    $: {
      url: string
    }
  }>
}
