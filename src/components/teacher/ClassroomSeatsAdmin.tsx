'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [manualStudentCount, setManualStudentCount] = useState('');
  const [debugging, setDebugging] = useState(false);
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

  const calculateStats = (seatData: Seat[]) => {
    const owned = seatData.filter(seat => seat.owner_id).length;
    const available = seatData.filter(seat => !seat.owner_id).length;
    const totalValue = seatData
      .filter(seat => seat.owner_id)
      .reduce((sum, seat) => sum + seat.purchase_price, 0);
    const currentPrice = seatData.find(seat => !seat.owner_id)?.current_price || 0;

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
  }, [manualStudentCount]);

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

  // 좌석을 6x5 그리드로 배열
  const seatGrid = Array.from({ length: 5 }, (_, rowIndex) =>
    seats.filter(seat => seat.row_position === rowIndex + 1)
      .sort((a, b) => a.column_position - b.column_position)
  );

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
                {row.map(seat => (
                  <div key={seat.id} className="relative group">
                    <div
                      className={`w-16 h-16 text-xs font-bold flex items-center justify-center rounded cursor-pointer transition-all ${getSeatColor(seat)}`}
                    >
                      {seat.seat_number}
                    </div>
                    
                    {/* 좌석 정보 툴팁 */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="bg-black text-white text-xs rounded px-3 py-2 whitespace-nowrap">
                        <div className="font-bold">좌석 {seat.seat_number}번</div>
                        {seat.owner_id ? (
                          <>
                            <div>소유자: {seat.owner?.name}</div>
                            <div>구매가: ₩{seat.purchase_price.toLocaleString()}</div>
                            <div>구매일: {seat.purchase_date ? new Date(seat.purchase_date).toLocaleDateString() : '-'}</div>
                            <div className={`font-semibold ${
                              stats.current_price > seat.purchase_price ? 'text-green-400' : 'text-red-400'
                            }`}>
                              평가손익: {stats.current_price > seat.purchase_price ? '+' : ''}
                              ₩{(stats.current_price - seat.purchase_price).toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>상태: 구매 가능</div>
                            <div>가격: ₩{seat.current_price.toLocaleString()}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 새로고침 안내 */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <div>좌석 정보는 30초마다 자동으로 새로고침됩니다</div>
            <div>좌석에 마우스를 올리면 상세 정보를 볼 수 있습니다</div>
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
    </div>
  );
}