'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, RefreshCw, Newspaper, Sparkles } from 'lucide-react'
import type { NewsWithExplanation } from '@/types/news'

export default function NewsCarousel() {
  const [news, setNews] = useState<NewsWithExplanation[]>([])
  const [selectedNews, setSelectedNews] = useState<NewsWithExplanation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)

  useEffect(() => {
    fetchNews()

    // 30분마다 자동 업데이트
    const interval = setInterval(fetchNews, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNews() {
    try {
      const res = await fetch('/api/news/list?limit=25')
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

  async function refreshNews() {
    setRefreshing(true)
    try {
      // RSS 피드 새로고침
      await fetch('/api/news/fetch', { method: 'POST' })
      // 목록 다시 가져오기
      await fetchNews()
    } catch (error) {
      console.error('Failed to refresh news:', error)
    } finally {
      setRefreshing(false)
    }
  }

  async function generateAIExplanation() {
    if (!selectedNews) return

    setGeneratingAI(true)
    try {
      const res = await fetch('/api/news/generate-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsId: selectedNews.id })
      })

      const data = await res.json()

      if (data.success) {
        // 뉴스 목록 새로고침
        await fetchNews()

        // 현재 선택된 뉴스의 설명도 업데이트
        const res = await fetch('/api/news/list?limit=25')
        const listData = await res.json()

        if (listData.success) {
          const updatedNews = listData.news.find((n: NewsWithExplanation) => n.id === selectedNews.id)
          if (updatedNews) {
            setSelectedNews(updatedNews)
          }
        }

        alert('AI 설명이 생성되었습니다!')
      } else {
        alert('AI 설명 생성 실패: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (error) {
      console.error('Failed to generate AI explanation:', error)
      alert('AI 설명 생성 중 오류가 발생했습니다.')
    } finally {
      setGeneratingAI(false)
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
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (news.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">경제 뉴스</h3>
            </div>
            <Button variant="outline" size="sm" onClick={refreshNews} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center py-8">
            뉴스를 불러오는 중입니다...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">경제 뉴스</h3>
              <Badge variant="secondary">{news.length}개</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={refreshNews} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          <Carousel opts={{ align: 'start', loop: true }} className="w-full">
            <CarouselContent>
              {news.map((item) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-slate-900"
                    onClick={() => setSelectedNews(item)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          {getSourceBadge(item.source)}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.pub_date)}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2 leading-snug">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </CardContent>
      </Card>

      {/* 뉴스 상세 모달 */}
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
                        AI가 쉽게 설명해줘요 (초등학생용)
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
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedNews.original_content}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {!selectedNews.explanation && (
                  <Button
                    variant="default"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={generateAIExplanation}
                    disabled={generatingAI}
                  >
                    <Sparkles className={`mr-2 h-4 w-4 ${generatingAI ? 'animate-spin' : ''}`} />
                    {generatingAI ? 'AI 설명 생성 중...' : 'AI 쉬운 설명 생성'}
                  </Button>
                )}
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
