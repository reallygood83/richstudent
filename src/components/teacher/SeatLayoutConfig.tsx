'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';

interface RowConfig {
  row: number;
  seats: number;
}

interface SeatLayoutConfig {
  total_seats: number;
  layout_type: 'auto' | 'manual';
  rows: RowConfig[];
}

export default function SeatLayoutConfig() {
  const [layoutType, setLayoutType] = useState<'auto' | 'manual'>('auto');
  const [studentCount, setStudentCount] = useState(30);
  const [rows, setRows] = useState<RowConfig[]>([
    { row: 1, seats: 6 },
    { row: 2, seats: 6 },
    { row: 3, seats: 6 },
    { row: 4, seats: 6 },
    { row: 5, seats: 6 }
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 자동 배치: 학생 수에 맞게 균등 분배
  const generateAutoLayout = (count: number) => {
    const baseSeatsPerRow = Math.floor(count / 5);
    const extraSeats = count % 5;

    const newRows: RowConfig[] = [];
    for (let i = 1; i <= 5; i++) {
      const seatsInRow = baseSeatsPerRow + (i > 5 - extraSeats ? 1 : 0);
      newRows.push({ row: i, seats: seatsInRow });
    }

    return newRows;
  };

  // 학생 수 변경 시 자동 배치 업데이트
  useEffect(() => {
    if (layoutType === 'auto') {
      setRows(generateAutoLayout(studentCount));
    }
  }, [studentCount, layoutType]);

  // 행 추가
  const addRow = () => {
    const newRow = rows.length + 1;
    setRows([...rows, { row: newRow, seats: 1 }]);
  };

  // 행 삭제
  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) {
      setMessage({ type: 'error', text: '최소 1개 행은 필요합니다.' });
      return;
    }
    const newRows = rows.filter((_, index) => index !== rowIndex);
    // 행 번호 재정렬
    setRows(newRows.map((row, index) => ({ ...row, row: index + 1 })));
  };

  // 특정 행의 좌석 수 변경
  const updateRowSeats = (rowIndex: number, seats: number) => {
    if (seats < 1) return;
    const newRows = [...rows];
    newRows[rowIndex].seats = seats;
    setRows(newRows);
  };

  // 총 좌석 수 계산
  const totalSeats = rows.reduce((sum, row) => sum + row.seats, 0);

  // 좌석 배치 저장
  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const layoutConfig: SeatLayoutConfig = {
        total_seats: totalSeats,
        layout_type: layoutType,
        rows: rows
      };

      const response = await fetch('/api/real-estate/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutConfig)
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: `좌석 배치가 성공적으로 업데이트되었습니다. (총 ${result.total_created}개 좌석 생성)` });
      } else {
        setMessage({ type: 'error', text: result.error || '좌석 배치 업데이트에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Error saving seat layout:', error);
      setMessage({ type: 'error', text: '좌석 배치 저장 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LayoutGrid className="w-6 h-6" />
            <span>좌석 배치 설정</span>
          </CardTitle>
          <CardDescription>
            학생 수에 맞게 교실 좌석을 배치하세요. 자동 배치는 균등하게 분배하고, 수동 배치는 직접 조정할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 배치 방식 선택 */}
          <div className="space-y-3">
            <Label>배치 방식</Label>
            <RadioGroup value={layoutType} onValueChange={(value) => setLayoutType(value as 'auto' | 'manual')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="cursor-pointer">
                  자동 배치 (균등 분배)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="cursor-pointer">
                  수동 배치 (행별 좌석 수 지정)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 학생 수 입력 (자동 배치 모드) */}
          {layoutType === 'auto' && (
            <div className="space-y-2">
              <Label htmlFor="student-count">학생 수</Label>
              <Input
                id="student-count"
                type="number"
                min="1"
                max="100"
                value={studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value) || 1)}
                className="w-40"
              />
              <p className="text-sm text-gray-500">
                입력한 학생 수에 맞게 자동으로 5개 행에 균등 분배됩니다.
              </p>
            </div>
          )}

          {/* 행별 좌석 수 설정 (수동 배치 모드) */}
          {layoutType === 'manual' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>행별 좌석 수</Label>
                <Button size="sm" variant="outline" onClick={addRow}>
                  <Plus className="w-4 h-4 mr-1" />
                  행 추가
                </Button>
              </div>

              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Label className="w-16">{row.row}행:</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={row.seats}
                      onChange={(e) => updateRowSeats(index, parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">좌석</span>
                    {rows.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRow(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 미리보기 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">미리보기</Label>
              <div className="text-sm text-gray-600">
                총 <span className="font-bold text-blue-600">{totalSeats}개</span> 좌석
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 flex-wrap">
              {rows.map((row, index) => (
                <div key={index} className="text-center">
                  <div className="bg-blue-100 border-2 border-blue-300 rounded-lg px-4 py-2">
                    <div className="text-sm font-semibold text-blue-700">{row.row}행</div>
                    <div className="text-xs text-blue-600">{row.seats}개</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500 text-center">
              {layoutType === 'auto' ? '자동 균등 분배 결과' : '수동 배치 결과'}
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* 저장 버튼 */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={handleSave}
              disabled={loading || totalSeats === 0}
              className="w-full sm:w-auto"
            >
              {loading ? '저장 중...' : '좌석 배치 저장 및 생성'}
            </Button>
          </div>

          {/* 주의사항 */}
          <Alert>
            <AlertDescription className="text-sm text-gray-600">
              <strong>⚠️ 주의:</strong> 좌석 배치를 저장하면 기존의 <strong>소유자가 없는 좌석</strong>이 삭제되고 새로운 좌석이 생성됩니다.
              학생들이 소유한 좌석은 유지됩니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
