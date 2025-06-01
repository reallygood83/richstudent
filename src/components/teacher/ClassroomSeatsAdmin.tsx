'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [stats, setStats] = useState<SeatStats>({
    total_seats: 30,
    owned_seats: 0,
    available_seats: 30,
    total_value: 0,
    current_price: 0
  });

  const fetchSeats = useCallback(async () => {
    try {
      const response = await fetch('/api/real-estate/seats');
      const data = await response.json();
      
      if (data.seats) {
        setSeats(data.seats);
        calculateStats(data.seats);
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

  const updateSeatPrices = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/real-estate/price-update', {
        method: 'POST'
      });

      const result = await response.json();
      
      if (result.message) {
        alert('좌석 가격이 업데이트되었습니다!');
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
  };

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
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold text-blue-600">
              현재 좌석 가격: ₩{stats.current_price.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              가격은 학생들의 총 자산에 따라 자동으로 계산됩니다<br/>
              (총 학생 자산 ÷ 학생 수 ÷ 10)
            </div>
            <Button 
              onClick={updateSeatPrices}
              disabled={updating}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {updating ? '가격 업데이트 중...' : '가격 수동 업데이트'}
            </Button>
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