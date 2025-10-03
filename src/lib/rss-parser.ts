// RSS 피드 파서 라이브러리

import Parser from 'rss-parser'
import { NewsFeed, NewsSource } from '@/types/news'

const RSS_FEEDS = {
  maeil: 'https://www.mk.co.kr/rss/30100041/', // 매일경제 증권 RSS
  yonhap: 'https://www.yna.co.kr/rss/economy.xml', // 연합뉴스 경제 RSS
  hankyung: 'https://www.hankyung.com/feed/finance' // 한국경제 금융 RSS
}

interface ParsedItem {
  title?: string
  link?: string
  pubDate?: string
  contentSnippet?: string
  content?: string
  enclosure?: {
    url: string
  }
  // RSS 피드별 이미지 구조가 다를 수 있음
  [key: string]: unknown
}

export class RSSFeedParser {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:thumbnail', 'mediaThumbnail'],
          ['media:content', 'mediaContent'],
          ['description', 'description']
        ]
      }
    })
  }

  /**
   * 뉴스 소스에서 RSS 피드 파싱
   */
  async fetchNews(source: NewsSource): Promise<Omit<NewsFeed, 'id' | 'cached_at'>[]> {
    try {
      const feedUrl = RSS_FEEDS[source]
      const feed = await this.parser.parseURL(feedUrl)

      return feed.items.slice(0, 20).map(item => {
        const parsedItem = item as unknown as ParsedItem

        return {
          source,
          title: parsedItem.title || '',
          description: this.cleanDescription(parsedItem.contentSnippet || parsedItem.content || ''),
          link: parsedItem.link || '',
          pub_date: parsedItem.pubDate ? new Date(parsedItem.pubDate).toISOString() : null,
          image_url: this.extractImageUrl(parsedItem),
          original_content: parsedItem.content || parsedItem.contentSnippet || null
        }
      }).filter(item => item.title && item.link) // 필수 필드가 있는 항목만 반환
    } catch (error) {
      console.error(`Failed to fetch RSS from ${source}:`, error)
      throw error
    }
  }

  /**
   * HTML 태그 제거 및 설명 정리
   */
  private cleanDescription(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
      .substring(0, 300) // 300자로 제한
  }

  /**
   * RSS 피드에서 이미지 URL 추출 (소스별 구조 다를 수 있음)
   */
  private extractImageUrl(item: ParsedItem): string | null {
    // enclosure 이미지
    if (item.enclosure?.url) {
      return item.enclosure.url
    }

    // media:thumbnail
    const mediaThumbnail = item.mediaThumbnail as Array<{ $: { url: string } }> | undefined
    if (mediaThumbnail && Array.isArray(mediaThumbnail) && mediaThumbnail[0]?.$?.url) {
      return mediaThumbnail[0].$.url
    }

    // media:content
    const mediaContent = item.mediaContent as { $: { url: string } } | undefined
    if (mediaContent?.$?.url) {
      return mediaContent.$.url
    }

    // description에서 img 태그 추출 시도
    const content = item.content || item.description
    if (typeof content === 'string') {
      const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i)
      if (imgMatch) {
        return imgMatch[1]
      }
    }

    return null
  }

  /**
   * 모든 소스에서 뉴스 수집
   */
  async fetchAllNews(): Promise<Omit<NewsFeed, 'id' | 'cached_at'>[]> {
    const sources: NewsSource[] = ['maeil', 'yonhap', 'hankyung']
    const results = await Promise.allSettled(
      sources.map(source => this.fetchNews(source))
    )

    return results
      .filter((result): result is PromiseFulfilledResult<Omit<NewsFeed, 'id' | 'cached_at'>[]> =>
        result.status === 'fulfilled'
      )
      .flatMap(result => result.value)
      .sort((a, b) => {
        const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0
        const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0
        return dateB - dateA // 최신순 정렬
      })
  }
}
