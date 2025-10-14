'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface Seat {
  id: string;
  seat_number: number;
  row_position: number;
  column_position: number;
  current_price: number;
  owner_id: string | null;
  purchase_price: number;
  purchase_date: string | null;
  is_available: boolean;
  owner?: {
    id: string;
    name: string;
  };
}

interface SeatStats {
  total_seats: number;
  owned_seats: number;
  available_seats: number;
  total_value: number;
  current_price: number;
}

export default function ClassroomSeatsAdmin() {
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [manualStudentCount, setManualStudentCount] = useState('');
  const [debugging, setDebugging] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null); // 선택된 좌석 (모달용)
  const [stats, setStats] = useState<SeatStats>({
    total_seats: 30,
    owned_seats: 0,
    available_seats: 30,
    total_value: 0,
    current_price: 0
  });

  const fetchSeats = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/real-estate/seats');
      const data = await response.json();
      
      if (data.seats) {
        setSeats(data.seats);
        calculateStats(data.seats);
        
        // 좌석 가격이 0이면 자동으로 가격 업데이트 시도
        const hasZeroPrice = data.seats.some((seat: Seat) => seat.current_price === 0);
        if (hasZeroPrice) {
          console.log('Found zero price seats, auto-updating prices...');
          // updateSeatPrices 대신 직접 API 호출로 순환 참조 방지
          setTimeout(async () => {
            try {
              const updateResponse = await fetch('/api/real-estate/price-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              if (updateResponse.ok) {
                // 가격 업데이트 후 좌석 정보 다시 가져오기
                window.location.reload();
              }
            } catch (error) {
              console.error('Auto update failed:', error);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching seats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = async (seatData: Seat[]) => {
    const owned = seatData.filter(seat => seat.owner_id).length;
    const available = seatData.filter(seat => !seat.owner_id).length;
    const totalValue = seatData
      .filter(seat => seat.owner_id)
      .reduce((sum, seat) => sum + seat.purchase_price, 0);

    // 실시간 시세 계산: API를 통해 현재 통화량 기반으로 계산된 가격 가져오기
    let currentPrice = 0;
    try {
      const priceResponse = await fetch('/api/real-estate/current-price');
      const priceData = await priceResponse.json();
      currentPrice = priceData.current_price || 0;
    } catch (error) {
      console.error('Failed to fetch current price:', error);
      // 실패 시 기존 로직: 구매 가능한 좌석의 가격 사용
      currentPrice = seatData.find(seat => !seat.owner_id)?.current_price || 0;
      if (currentPrice === 0 && seatData.length > 0) {
        currentPrice = Math.max(...seatData.map(seat => seat.current_price));
      }
    }

    setStats({
      total_seats: 30,
      owned_seats: owned,
      available_seats: available,
      total_value: totalValue,
      current_price: currentPrice
    });
  };

  const updateSeatPrices = useCallback(async () => {
    setUpdating(true);
    try {
      const requestBody: { manual_student_count?: number } = {};
      
      // 수동 학생 수가 입력된 경우 포함
      if (manualStudentCount && parseInt(manualStudentCount) > 0) {
        requestBody.manual_student_count = parseInt(manualStudentCount);
      }

      const response = await fetch('/api/real-estate/price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (result.message) {
        const message = result.manual_student_count 
          ? `좌석 가격이 업데이트되었습니다! (학생 수: ${result.manual_student_count}명 기준)`
          : '좌석 가격이 업데이트되었습니다!';
        alert(message);
        await fetchSeats(); // 좌석 정보 새로고침
      } else {
        alert('가격 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('가격 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  }, [manualStudentCount, fetchSeats]);

  const getSeatColor = (seat: Seat) => {
    if (seat.owner_id) {
      return 'bg-red-500 text-white'; // 소유된 좌석
    } else {
      return 'bg-green-500 text-white'; // 구매 가능한 좌석
    }
  };

  useEffect(() => {
    fetchSeats();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(fetchSeats, 30000);
    return () => clearInterval(interval);
  }, [fetchSeats]);

  const testSeatsData = async () => {
    setDebugging(true);
    try {
      const response = await fetch('/api/debug/seats-test');
      const result = await response.json();
      
      if (result.message) {
        alert(`좌석 테스트 완료: ${result.message}`);
        await fetchSeats(); // 좌석 정보 새로고침
      } else {
        alert('좌석 테스트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error testing seats:', error);
      alert('좌석 테스트 중 오류가 발생했습니다.');
    } finally {
      setDebugging(false);
    }
  };

  const recreateSeats = async () => {
    if (!confirm('모든 좌석을 삭제하고 다시 생성하시겠습니까?')) return;
    
    setDebugging(true);
    try {
      const response = await fetch('/api/debug/seats-test', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.message) {
        alert(`좌석 재생성 완료: ${result.message}`);
        await fetchSeats(); // 좌석 정보 새로고침
      } else {
        alert('좌석 재생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error recreating seats:', error);
      alert('좌석 재생성 중 오류가 발생했습니다.');
    } finally {
      setDebugging(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">좌석 정보를 불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  // 좌석을 가로 행으로 재구성 (칠판 기준: 열은 좌우, 행은 앞뒤)
  const maxColumn = seats.length > 0 ? Math.max(...seats.map(s => s.row_position)) : 0;
  const maxRow = seats.length > 0 ? Math.max(...seats.map(s => s.column_position)) : 0;

  // 행별로 그리드 구성 (각 행은 모든 열의 좌석을 포함, 빈 자리도 유지)
  const seatGrid = Array.from({ length: maxRow }, (_, rowIndex) => {
    const rowSeats: (Seat | null)[] = [];
    for (let colIndex = 1; colIndex <= maxColumn; colIndex++) {
      const seat = seats.find(s => s.row_position === colIndex && s.column_position === rowIndex + 1);
      rowSeats.push(seat || null); // null로 빈 자리 유지
    }
    return rowSeats;
  }).filter(row => row.some(seat => seat !== null)); // 최소 1개 이상의 좌석이 있는 행만 유지

  return (
    <div className="space-y-6">
      {/* 좌석 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total_seats}</div>
            <div className="text-sm text-gray-600">총 좌석</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.owned_seats}</div>
            <div className="text-sm text-gray-600">소유된 좌석</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.available_seats}</div>
            <div className="text-sm text-gray-600">구매 가능</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-purple-600">
              ₩{stats.total_value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">총 거래액</div>
          </CardContent>
        </Card>
      </div>

      {/* 현재 가격 및 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">📍 좌석 거래 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                현재 좌석 가격: ₩{stats.current_price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                새로운 가격 계산 공식: <strong>(총 학생 자산 × 60%) ÷ 학생 수</strong><br/>
                화폐량이 증가할수록 좌석 가격이 상승합니다
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-count">학생 수 (수동 설정)</Label>
                <Input
                  id="student-count"
                  type="number"
                  min="1"
                  placeholder="실제 학생 수로 자동 계산"
                  value={manualStudentCount}
                  onChange={(e) => setManualStudentCount(e.target.value)}
                  className="text-center"
                />
                <div className="text-xs text-gray-500">
                  비워두면 실제 등록된 학생 수({stats.owned_seats + stats.available_seats}명)로 계산됩니다
                </div>
              </div>
              
              <Button
                onClick={updateSeatPrices}
                disabled={updating}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                {updating ? '가격 업데이트 중...' : '가격 업데이트'}
              </Button>

              {/* 좌석 배치 설정 버튼 */}
              <Button
                onClick={() => router.push('/teacher/seats/layout')}
                variant="outline"
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                좌석 배치 설정
              </Button>

              {/* 디버그 버튼들 */}
              <div className="flex gap-2">
                <Button 
                  onClick={testSeatsData}
                  disabled={debugging}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {debugging ? '테스트 중...' : '좌석 데이터 확인'}
                </Button>
                <Button 
                  onClick={recreateSeats}
                  disabled={debugging}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                >
                  {debugging ? '재생성 중...' : '좌석 재생성'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 교실 좌석 배치도 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">🏫 교실 좌석 현황</CardTitle>
          <div className="text-center">
            <div className="inline-block bg-gray-800 text-white px-8 py-2 rounded-lg mb-4">
              📚 칠판 📚
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 범례 */}
          <div className="flex justify-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>구매 가능 ({stats.available_seats}석)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>소유됨 ({stats.owned_seats}석)</span>
            </div>
          </div>

          {/* 좌석 그리드 */}
          <div className="space-y-3">
            {seatGrid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2">
                {row.map((seat, colIndex) => (
                  <div key={seat ? seat.id : `empty-${rowIndex}-${colIndex}`}>
                    {seat ? (
                      <button
                        onClick={() => setSelectedSeat(seat)}
                        className={`w-16 h-16 text-xs font-bold flex flex-col items-center justify-center rounded cursor-pointer transition-all hover:scale-110 hover:shadow-lg ${getSeatColor(seat)}`}
                      >
                        <div>{seat.seat_number}</div>
                        {seat.owner_id && (
                          <div className="text-[8px] mt-1 truncate w-14">{seat.owner?.name}</div>
                        )}
                      </button>
                    ) : (
                      <div className="w-16 h-16 bg-transparent" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 새로고침 안내 */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <div>좌석 정보는 30초마다 자동으로 새로고침됩니다</div>
            <div className="font-semibold text-blue-600">💡 좌석을 클릭하면 상세 정보를 볼 수 있습니다</div>
          </div>
        </CardContent>
      </Card>

      {/* 소유 현황 상세 */}
      <Card>
        <CardHeader>
          <CardTitle>📊 좌석 소유 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {seats
              .filter(seat => seat.owner_id)
              .map(seat => (
                <div key={seat.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">좌석 {seat.seat_number}</Badge>
                    <span className="font-medium">{seat.owner?.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      구매가: ₩{seat.purchase_price.toLocaleString()}
                    </div>
                    <div className={`text-sm font-semibold ${
                      stats.current_price > seat.purchase_price ? 'text-green-600' : 'text-red-600'
                    }`}>
                      평가손익: {stats.current_price > seat.purchase_price ? '+' : ''}
                      ₩{(stats.current_price - seat.purchase_price).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            {seats.filter(seat => seat.owner_id).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                아직 소유된 좌석이 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 좌석 상세 정보 모달 */}
      {selectedSeat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSeat(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                좌석 {selectedSeat.seat_number}번
              </h3>
              <button
                onClick={() => setSelectedSeat(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* 좌석 상태 배지 */}
            <div className="mb-4">
              {selectedSeat.owner_id ? (
                <Badge className="bg-red-500 text-white text-sm px-3 py-1">소유됨</Badge>
              ) : (
                <Badge className="bg-green-500 text-white text-sm px-3 py-1">구매 가능</Badge>
              )}
            </div>

            {/* 좌석 정보 */}
            <div className="space-y-4">
              {selectedSeat.owner_id ? (
                <>
                  <div className="border-b pb-3">
                    <div className="text-sm text-gray-600 mb-1">소유자</div>
                    <div className="text-xl font-bold text-gray-900">
                      {selectedSeat.owner?.name || '알 수 없음'}
                    </div>
                  </div>

                  <div className="border-b pb-3">
                    <div className="text-sm text-gray-600 mb-1">구매가</div>
                    <div className="text-xl font-bold text-gray-900">
                      ₩{selectedSeat.purchase_price.toLocaleString()}
                    </div>
                  </div>

                  <div className="border-b pb-3">
                    <div className="text-sm text-gray-600 mb-1">구매일</div>
                    <div className="text-lg text-gray-900">
                      {selectedSeat.purchase_date
                        ? new Date(selectedSeat.purchase_date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '-'}
                    </div>
                  </div>

                  <div className="border-b pb-3">
                    <div className="text-sm text-gray-600 mb-1">현재 시세</div>
                    <div className="text-xl font-bold text-blue-600">
                      ₩{stats.current_price.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">평가손익</div>
                    <div className={`text-2xl font-bold ${
                      stats.current_price > selectedSeat.purchase_price
                        ? 'text-green-600'
                        : stats.current_price < selectedSeat.purchase_price
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                      {stats.current_price > selectedSeat.purchase_price ? '+' : ''}
                      ₩{(stats.current_price - selectedSeat.purchase_price).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ({stats.current_price > selectedSeat.purchase_price ? '+' : ''}
                      {selectedSeat.purchase_price > 0
                        ? ((stats.current_price - selectedSeat.purchase_price) / selectedSeat.purchase_price * 100).toFixed(2)
                        : '0.00'}%)
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b pb-3">
                    <div className="text-sm text-gray-600 mb-1">상태</div>
                    <div className="text-xl font-bold text-green-600">
                      구매 가능
                    </div>
                  </div>

                  <div className="border-b pb-3">
                    <div className="text-sm text-gray-600 mb-1">현재 가격</div>
                    <div className="text-2xl font-bold text-blue-600">
                      ₩{selectedSeat.current_price.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                    💡 학생들이 구매할 수 있는 좌석입니다
                  </div>
                </>
              )}
            </div>

            {/* 닫기 버튼 */}
            <div className="mt-6">
              <Button
                onClick={() => setSelectedSeat(null)}
                className="w-full bg-gray-600 hover:bg-gray-700"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}