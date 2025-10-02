'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';

interface ColumnConfig {
  column: number;
  seats: number;
}

interface SeatLayoutConfig {
  total_seats: number;
  layout_type: 'auto' | 'manual';
  columns: ColumnConfig[];
}

export default function SeatLayoutConfig() {
  const [layoutType, setLayoutType] = useState<'auto' | 'manual'>('auto');
  const [studentCount, setStudentCount] = useState(30);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { column: 1, seats: 6 },
    { column: 2, seats: 6 },
    { column: 3, seats: 6 },
    { column: 4, seats: 6 },
    { column: 5, seats: 6 }
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 자동 배치: 학생 수에 맞게 균등 분배 (칠판 기준: 5열 기본)
  const generateAutoLayout = (count: number) => {
    // 학생 수에 따라 적절한 열 수 결정
    let numColumns = 5; // 기본 5열
    if (count > 35) numColumns = 6;  // 36명 이상: 6열
    if (count > 42) numColumns = 7;  // 43명 이상: 7열

    const baseSeatsPerColumn = Math.floor(count / numColumns);
    const extraSeats = count % numColumns;

    const newColumns: ColumnConfig[] = [];
    for (let i = 1; i <= numColumns; i++) {
      // 앞열부터 여분 좌석 배치
      const seatsInColumn = baseSeatsPerColumn + (i <= extraSeats ? 1 : 0);
      newColumns.push({ column: i, seats: seatsInColumn });
    }

    return newColumns;
  };

  // 학생 수 변경 시 자동 배치 업데이트
  useEffect(() => {
    if (layoutType === 'auto') {
      setColumns(generateAutoLayout(studentCount));
    }
  }, [studentCount, layoutType]);

  // 열 추가
  const addColumn = () => {
    const newColumn = columns.length + 1;
    setColumns([...columns, { column: newColumn, seats: 1 }]);
  };

  // 열 삭제
  const removeColumn = (columnIndex: number) => {
    if (columns.length <= 1) {
      setMessage({ type: 'error', text: '최소 1개 열은 필요합니다.' });
      return;
    }
    const newColumns = columns.filter((_, index) => index !== columnIndex);
    // 열 번호 재정렬
    setColumns(newColumns.map((col, index) => ({ ...col, column: index + 1 })));
  };

  // 특정 열의 좌석 수 변경
  const updateColumnSeats = (columnIndex: number, seats: number) => {
    if (seats < 1) return;
    const newColumns = [...columns];
    newColumns[columnIndex].seats = seats;
    setColumns(newColumns);
  };

  // 총 좌석 수 계산
  const totalSeats = columns.reduce((sum, col) => sum + col.seats, 0);

  // 좌석 배치 저장
  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const layoutConfig: SeatLayoutConfig = {
        total_seats: totalSeats,
        layout_type: layoutType,
        columns: columns
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
        const errorMsg = result.details
          ? `${result.error}: ${result.details}`
          : result.error || '좌석 배치 업데이트에 실패했습니다.';
        setMessage({ type: 'error', text: errorMsg });
        console.error('API Error:', result);
      }
    } catch (error) {
      console.error('Error saving seat layout:', error);
      setMessage({ type: 'error', text: '좌석 배치 저장 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" />
          좌석 배치 설정
        </CardTitle>
        <CardDescription>
          학생 수에 맞게 교실 좌석을 배치하세요. 자동 배치는 균등하게 분배하고, 수동 배치는 직접 조정할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 배치 방식 선택 */}
        <div>
          <Label className="text-base font-semibold mb-3 block">배치 방식</Label>
          <RadioGroup value={layoutType} onValueChange={(value) => setLayoutType(value as 'auto' | 'manual')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="cursor-pointer">자동 배치 (균등 분배)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="cursor-pointer">수동 배치 (행별 직접 수 지정)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 학생 수 입력 */}
        <div>
          <Label htmlFor="studentCount" className="text-base font-semibold mb-2 block">학생 수</Label>
          <Input
            id="studentCount"
            type="number"
            min="1"
            max="100"
            value={studentCount}
            onChange={(e) => setStudentCount(parseInt(e.target.value) || 1)}
            className="w-48"
          />
          <p className="text-sm text-gray-500 mt-1">
            입력한 학생 수에 맞게 5개 열에 균등 분배됩니다.
          </p>
        </div>

        {/* 미리보기 */}
        <div>
          <Label className="text-base font-semibold mb-3 block">미리보기</Label>
          <div className="flex gap-3 items-end">
            {columns.map((col) => (
              <div key={col.column} className="flex flex-col items-center">
                <div className="bg-blue-100 rounded-lg p-3 mb-2 min-w-[80px] text-center">
                  <div className="font-bold text-blue-700">{col.column}열</div>
                  <div className="text-sm text-blue-600">{col.seats}개</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">
            자동 균등 배치 결과
          </p>
        </div>

        {/* 수동 배치 설정 */}
        {layoutType === 'manual' && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">열별 좌석 수 설정</Label>
              <Button onClick={addColumn} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                열 추가
              </Button>
            </div>

            <div className="space-y-3">
              {columns.map((col, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Label className="w-16">{col.column}열</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={col.seats}
                    onChange={(e) => updateColumnSeats(index, parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">개</span>
                  <Button
                    onClick={() => removeColumn(index)}
                    size="sm"
                    variant="ghost"
                    disabled={columns.length <= 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              총 {columns.length}개 열 × 좌석 = <strong>{totalSeats}개</strong>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* 저장 버튼 */}
        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? '저장 중...' : '좌석 배치 저장 및 생성'}
          </Button>
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ 주의: 좌석 배치를 저장하면 기존의 소유자가 없는 좌석이 삭제되고 새로운 좌석이 생성됩니다. 학생들이 소유한 좌석은 유지됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
