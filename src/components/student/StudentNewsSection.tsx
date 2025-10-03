'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Newspaper, ExternalLink, Sparkles, BookOpen } from 'lucide-react'

interface NewsWithExplanation {
  id: string
  source: 'maeil' | 'yonhap' | 'hankyung'
  title: string
  description: string | null
  link: string
  pub_date: string | null
  image_url: string | null
  original_content: string | null
  explanation?: {
    id: string
    news_id: string
    student_level: string
    explanation: string
    created_at: string
  } | null
}

export default function StudentNewsSection() {
  const [news, setNews] = useState<NewsWithExplanation[]>([])
  const [selectedNews, setSelectedNews] = useState<NewsWithExplanation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNews()

    // 30분마다 자동 업데이트
    const interval = setInterval(fetchNews, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNews() {
    try {
      // 25개 뉴스 가져오기 (캐러셀용)
      const res = await fetch('/api/news/list?limit=25&student_level=elementary')
      const data = await res.json()
      if (data.success) {
        setNews(data.news)
      }
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      setLoading(false)
    }
  }

  function getSourceBadge(source: 'maeil' | 'yonhap' | 'hankyung') {
    if (source === 'maeil') {
      return <Badge className="bg-red-500 hover:bg-red-600">매일경제</Badge>
    }
    if (source === 'hankyung') {
      return <Badge className="bg-green-500 hover:bg-green-600">한국경제</Badge>
    }
    return <Badge className="bg-blue-500 hover:bg-blue-600">연합뉴스</Badge>
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '날짜 정보 없음'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    if (hours < 48) return '어제'
    return date.toLocaleDateString('ko-KR')
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">오늘의 경제 뉴스</h3>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-48 w-full max-w-md" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (news.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">오늘의 경제 뉴스</h3>
          </div>
          <div className="text-center py-8 text-muted-foreground">
            아직 표시할 뉴스가 없습니다.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">오늘의 경제 뉴스</h3>
              <Badge variant="secondary">{news.length}개</Badge>
            </div>
          </div>

          <Carousel className="w-full">
            <CarouselContent>
              {news.map((item) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow h-full bg-white dark:bg-slate-900"
                    onClick={() => setSelectedNews(item)}
                  >
                    <CardContent className="p-4 flex flex-col h-full">
                      {item.image_url && (
                        <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden">
                          <Image
                            src={item.image_url}
                            alt={item.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          {getSourceBadge(item.source)}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.pub_date)}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm line-clamp-3 leading-snug">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {item.explanation && (
                          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 pt-2">
                            <Sparkles className="h-3 w-3" />
                            <span className="font-medium">쉬운 설명 보기</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>

          <p className="text-xs text-muted-foreground text-center mt-4">
            30분마다 자동으로 업데이트됩니다
          </p>
        </CardContent>
      </Card>

      {/* News Detail Modal */}
      <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedNews && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {getSourceBadge(selectedNews.source)}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(selectedNews.pub_date)}
                  </span>
                </div>
                <DialogTitle className="text-xl leading-tight">
                  {selectedNews.title}
                </DialogTitle>
                {selectedNews.description && (
                  <DialogDescription className="text-base">
                    {selectedNews.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {selectedNews.image_url && (
                <div className="rounded-lg overflow-hidden relative w-full h-64">
                  <Image
                    src={selectedNews.image_url}
                    alt={selectedNews.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* AI 쉬운 설명 섹션 */}
              {selectedNews.explanation && (
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 border-purple-200 dark:border-purple-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                        AI가 쉽게 설명해줘요
                      </h4>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedNews.explanation.explanation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedNews.original_content && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">원문 내용</h4>
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {selectedNews.original_content}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href={selectedNews.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    원문 보기
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
