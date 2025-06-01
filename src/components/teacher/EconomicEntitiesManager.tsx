'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2,
  Landmark,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  DollarSign
} from 'lucide-react'

interface EconomicEntity {
  id: string
  entity_type: 'government' | 'bank' | 'securities'
  name: string
  balance: number
  created_at: string
  updated_at: string
}

interface EconomicEntitiesManagerProps {
  onDataChange?: () => void
}

export default function EconomicEntitiesManager({ onDataChange }: EconomicEntitiesManagerProps) {
  const [entities, setEntities] = useState<EconomicEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 생성 폼 상태
  const [createForm, setCreateForm] = useState({
    entity_type: '' as 'government' | 'bank' | 'securities' | '',
    name: '',
    initial_balance: ''
  })

  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    name: '',
    balance: ''
  })

  useEffect(() => {
    fetchEntities()
  }, [])

  const fetchEntities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/economic-entities')
      const data = await response.json()

      if (data.success) {
        setEntities(data.entities)
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Entities fetch error:', err)
      setError('경제 주체 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInitialize = async () => {
    try {
      setCreating(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/economic-entities/initialize', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        fetchEntities()
        if (onDataChange) onDataChange()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Initialize error:', err)
      setError('경제 주체 초기화에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createForm.entity_type || !createForm.name) {
      setError('경제 주체 유형과 이름을 입력해주세요.')
      return
    }

    try {
      setCreating(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/economic-entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: createForm.entity_type,
          name: createForm.name,
          initial_balance: Number(createForm.initial_balance) || 0
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        setCreateForm({ entity_type: '', name: '', initial_balance: '' })
        fetchEntities()
        if (onDataChange) onDataChange()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Create error:', err)
      setError('경제 주체 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (entity: EconomicEntity) => {
    setEditing(entity.id)
    setEditForm({
      name: entity.name,
      balance: entity.balance.toString()
    })
  }

  const handleUpdate = async (entityId: string) => {
    if (!editForm.name || !editForm.balance) {
      setError('이름과 잔액을 모두 입력해주세요.')
      return
    }

    try {
      setError('')
      setSuccess('')

      const response = await fetch(`/api/economic-entities/${entityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          balance: Number(editForm.balance)
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        setEditing(null)
        fetchEntities()
        if (onDataChange) onDataChange()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Update error:', err)
      setError('경제 주체 수정에 실패했습니다.')
    }
  }

  const handleDelete = async (entityId: string, entityName: string) => {
    if (!confirm(`'${entityName}' 경제 주체를 삭제하시겠습니까?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      const response = await fetch(`/api/economic-entities/${entityId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        fetchEntities()
        if (onDataChange) onDataChange()
      } else {
        setError(data.error)
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('경제 주체 삭제에 실패했습니다.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'government':
        return <Building2 className="w-6 h-6" />
      case 'bank':
        return <Landmark className="w-6 h-6" />
      case 'securities':
        return <TrendingUp className="w-6 h-6" />
      default:
        return <DollarSign className="w-6 h-6" />
    }
  }

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'government':
        return '정부'
      case 'bank':
        return '은행'
      case 'securities':
        return '증권회사'
      default:
        return type
    }
  }

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'government':
        return 'bg-blue-100 text-blue-800'
      case 'bank':
        return 'bg-green-100 text-green-800'
      case 'securities':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>경제 주체 관리</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">경제 주체 정보를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 알림 메시지 */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-600">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* 경제 주체 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>경제 주체 관리</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={fetchEntities}>
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
              <Button onClick={handleInitialize} disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                기본 설정
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            정부, 은행, 증권회사 등 경제 주체들을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entities.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">등록된 경제 주체가 없습니다</p>
              <Button onClick={handleInitialize} disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                기본 경제 주체 생성
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entities.map((entity) => (
                <Card key={entity.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getEntityIcon(entity.entity_type)}
                        <Badge className={getEntityTypeColor(entity.entity_type)} variant="secondary">
                          {getEntityTypeLabel(entity.entity_type)}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(entity)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entity.id, entity.name)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {editing === entity.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`edit-name-${entity.id}`} className="text-sm">이름</Label>
                          <Input
                            id={`edit-name-${entity.id}`}
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-balance-${entity.id}`} className="text-sm">잔액 (원)</Label>
                          <Input
                            id={`edit-balance-${entity.id}`}
                            type="number"
                            value={editForm.balance}
                            onChange={(e) => setEditForm(prev => ({ ...prev, balance: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(entity.id)}
                            className="flex-1"
                          >
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(null)}
                            className="flex-1"
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-bold text-lg mb-2">{entity.name}</h3>
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {formatCurrency(entity.balance)}
                        </div>
                        <p className="text-sm text-gray-500">
                          생성일: {new Date(entity.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 새 경제 주체 생성 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>새 경제 주체 생성</span>
          </CardTitle>
          <CardDescription>
            개별적으로 경제 주체를 생성할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity_type">경제 주체 유형</Label>
                <select
                  id="entity_type"
                  value={createForm.entity_type}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    entity_type: e.target.value as 'government' | 'bank' | 'securities' 
                  }))}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="government">정부</option>
                  <option value="bank">은행</option>
                  <option value="securities">증권회사</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="경제 주체 이름"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_balance">초기 잔액 (원)</Label>
                <Input
                  id="initial_balance"
                  type="number"
                  min="0"
                  value={createForm.initial_balance}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, initial_balance: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? '생성 중...' : '경제 주체 생성'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}