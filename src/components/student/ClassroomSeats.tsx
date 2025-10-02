'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CelebrationModal } from './CelebrationModal';
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

interface SeatTransaction {
  success: boolean;
  message: string;
  price?: number;
  sale_price?: number;
}

interface ClassroomSeatsProps {
  studentId?: string;
}

export default function ClassroomSeats({ studentId }: ClassroomSeatsProps) {
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(studentId || null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // 🎉 축하 모달 상태
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState({ seatNumber: '', price: 0 });

  // 학생 ID 가져오기 (prop이 없으면 세션에서)
  useEffect(() => {
    if (!currentStudentId) {
      fetchStudentSession();
    }
  }, [currentStudentId]);

  const fetchStudentSession = async () => {
    try {
      const response = await fetch('/api/student/me');
      const data = await response.json();
      if (data.success && data.session) {
        setCurrentStudentId(data.session.studentId);
      }
    } catch (error) {
      console.error('Error fetching student session:', error);
    }
  };

  const fetchSeats = useCallback(async () => {
    try {
      console.log('Fetching seats from API...');
      const response = await fetch('/api/real-estate/seats');
      console.log('Seats API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Seats API response data:', data);
        
        if (data.seats && Array.isArray(data.seats)) {
          if (data.seats.length > 0) {
            setSeats(data.seats);
            console.log('Seats loaded:', data.seats.length);
            setIsLocalMode(false);
            
            // 첫 번째 빈 좌석의 가격을 현재 가격으로 설정
            const emptySeat = data.seats.find((seat: Seat) => !seat.owner_id);
            if (emptySeat && emptySeat.current_price > 0) {
              setCurrentPrice(emptySeat.current_price);
            } else {
              // 모든 좌석이 소유되었거나 가격이 0인 경우
              const firstSeat = data.seats[0];
              setCurrentPrice(firstSeat?.current_price || 100000);
            }
            return;
          } else {
            // 빈 배열이 반환된 경우 - 좌석이 아직 생성되지 않음
            console.log('Empty seats array, switching to local mode');
          }
        }
      } else {
        // HTTP 에러 응답
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', response.status, errorData);
      }
      
      // API 실패 또는 데이터 없음 - 로컬에서 30개 좌석 생성
      console.log('Switching to local mode due to API issues');
      setIsLocalMode(true);
      createLocalSeats();
      
    } catch (error) {
      console.error('Error fetching seats:', error);
      // 네트워크 오류 등 발생 시 로컬 좌석 생성
      console.log('Network error, switching to local mode');
      setIsLocalMode(true);
      createLocalSeats();
    } finally {
      setLoading(false);
    }
  }, []);

  const createLocalSeats = () => {
    const localSeats: Seat[] = [];
    for (let seatNum = 1; seatNum <= 30; seatNum++) {
      const rowNum = Math.floor((seatNum - 1) / 6) + 1;
      const colNum = ((seatNum - 1) % 6) + 1;
      
      localSeats.push({
        id: `local-seat-${seatNum}`,
        seat_number: seatNum,
        row_position: rowNum,
        column_position: colNum,
        current_price: 100000, // 기본 가격 10만원
        owner_id: null,
        purchase_price: 0,
        purchase_date: null,
        is_available: true
      });
    }
    
    setSeats(localSeats);
    setCurrentPrice(100000);
    console.log('Created 30 local seats');
  };

  const handleBuySeat = async (seatNumber: number) => {
    if (!currentStudentId) return;
    
    setTransactionLoading(seatNumber);
    
    // 로컬 좌석인지 확인 (API 연동이 안 되는 경우)
    const seat = seats.find(s => s.seat_number === seatNumber);
    if (seat?.id.startsWith('local-seat-')) {
      // 로컬 좌석 구매 처리
      handleLocalBuySeat(seatNumber);
      return;
    }
    
    try {
      const response = await fetch('/api/real-estate/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat_number: seatNumber,
          student_id: currentStudentId
        })
      });

      const result: SeatTransaction = await response.json();

      if (result.success) {
        // 🎉 축하 모달 표시
        setCelebrationData({
          seatNumber: `${seatNumber}`,
          price: result.price || 0
        });
        setShowCelebration(true);
        await fetchSeats(); // 좌석 정보 새로고침
      } else {
        alert(result.message || '좌석 구매에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error buying seat:', error);
      // API 오류 시 로컬 처리로 폴백
      handleLocalBuySeat(seatNumber);
    } finally {
      setTransactionLoading(null);
    }
  };

  const handleLocalBuySeat = (seatNumber: number) => {
    const updatedSeats = seats.map(seat => {
      if (seat.seat_number === seatNumber && !seat.owner_id) {
        return {
          ...seat,
          owner_id: currentStudentId,
          purchase_price: seat.current_price,
          purchase_date: new Date().toISOString()
        };
      }
      return seat;
    });
    
    setSeats(updatedSeats);
    // 🎉 축하 모달 표시 (로컬 모드)
    setCelebrationData({
      seatNumber: `${seatNumber}`,
      price: currentPrice
    });
    setShowCelebration(true);
    setTransactionLoading(null);
  };

  const handleSellSeat = async (seatNumber: number) => {
    if (!currentStudentId) return;
    
    setTransactionLoading(seatNumber);
    
    // 로컬 좌석인지 확인 (API 연동이 안 되는 경우)
    const seat = seats.find(s => s.seat_number === seatNumber);
    if (seat?.id.startsWith('local-seat-')) {
      // 로컬 좌석 판매 처리
      handleLocalSellSeat(seatNumber);
      return;
    }
    
    try {
      const response = await fetch('/api/real-estate/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat_number: seatNumber,
          student_id: currentStudentId
        })
      });

      const result: SeatTransaction = await response.json();
      
      if (result.success) {
        alert(`좌석 ${seatNumber}번을 ₩${result.sale_price?.toLocaleString()}에 판매했습니다!`);
        await fetchSeats(); // 좌석 정보 새로고침
      } else {
        alert(result.message || '좌석 판매에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error selling seat:', error);
      // API 오류 시 로컬 처리로 폴백
      handleLocalSellSeat(seatNumber);
    } finally {
      setTransactionLoading(null);
    }
  };

  const handleLocalSellSeat = (seatNumber: number) => {
    const updatedSeats = seats.map(seat => {
      if (seat.seat_number === seatNumber && seat.owner_id === currentStudentId) {
        return {
          ...seat,
          owner_id: null,
          purchase_price: 0,
          purchase_date: null
        };
      }
      return seat;
    });
    
    setSeats(updatedSeats);
    alert(`좌석 ${seatNumber}번을 ₩${currentPrice.toLocaleString()}에 판매했습니다!`);
    setTransactionLoading(null);
  };

  const getSeatColor = (seat: Seat) => {
    if (seat.owner_id === currentStudentId) {
      return 'bg-blue-500 text-white'; // 내 좌석
    } else if (seat.owner_id) {
      return 'bg-red-500 text-white'; // 다른 사람 좌석
    } else {
      return 'bg-green-500 text-white hover:bg-green-600'; // 구매 가능
    }
  };

  const getSeatStatus = (seat: Seat) => {
    if (seat.owner_id === currentStudentId) {
      return '내 좌석';
    } else if (seat.owner_id) {
      return `${seat.owner?.name}님 소유`;
    } else {
      return '구매 가능';
    }
  };

  const canBuySeat = (seat: Seat) => {
    return !seat.owner_id && seat.is_available;
  };

  const canSellSeat = (seat: Seat) => {
    return seat.owner_id === currentStudentId && seat.is_available;
  };

  useEffect(() => {
    fetchSeats();
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

  // 좌석이 없는 경우
  if (seats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">📍 교실 좌석 거래소</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-lg text-gray-600">
              아직 좌석 데이터가 없습니다
            </div>
            <div className="text-sm text-gray-500">
              교사에게 좌석 시스템 설정을 요청하세요
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 좌석을 6x5 그리드로 배열
  const seatGrid = Array.from({ length: 5 }, (_, rowIndex) =>
    seats.filter(seat => seat.row_position === rowIndex + 1)
      .sort((a, b) => a.column_position - b.column_position)
  );

  const mySeats = seats.filter(seat => seat.owner_id === currentStudentId);

  return (
    <div className="space-y-6">
      {/* 현재 좌석 가격 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">📍 교실 좌석 거래소</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            {isLocalMode && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                <div className="text-sm text-yellow-800">
                  <strong>🔧 데모 모드</strong><br/>
                  데이터베이스 연결이 안 되어 임시로 로컬에서 작동합니다.<br/>
                  거래는 브라우저에서만 유지됩니다.
                </div>
              </div>
            )}
            <div className="text-2xl font-bold text-blue-600">
              현재 좌석 가격: ₩{currentPrice.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              새로운 가격 공식: <strong>(총 학생 자산 × 60%) ÷ 학생 수</strong><br/>
              화폐량이 증가할수록 좌석 가격이 상승합니다
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 내 소유 좌석 */}
      {mySeats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🏠 내 소유 좌석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {mySeats.map(seat => (
                <div key={seat.id} className="p-3 border rounded-lg bg-blue-50">
                  <div className="font-semibold">좌석 {seat.seat_number}번</div>
                  <div className="text-sm text-gray-600">
                    구매가: ₩{seat.purchase_price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    현재가: ₩{currentPrice.toLocaleString()}
                  </div>
                  <div className={`text-sm font-semibold ${
                    currentPrice > seat.purchase_price ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentPrice > seat.purchase_price ? '+' : ''}
                    ₩{(currentPrice - seat.purchase_price).toLocaleString()}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSellSeat(seat.seat_number)}
                    disabled={transactionLoading === seat.seat_number}
                    className="w-full mt-2"
                  >
                    {transactionLoading === seat.seat_number ? '판매 중...' : '판매하기'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 교실 좌석 배치도 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">🏫 교실 좌석 배치도</CardTitle>
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
              <span>구매 가능</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>내 좌석</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>다른 학생 소유</span>
            </div>
          </div>

          {/* 좌석 그리드 */}
          <div className="space-y-3">
            {seatGrid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2">
                {row.map(seat => (
                  <div key={seat.id} className="relative">
                    <Button
                      className={`w-16 h-16 text-xs font-bold transition-all ${getSeatColor(seat)}`}
                      onClick={() => {
                        if (canBuySeat(seat)) {
                          handleBuySeat(seat.seat_number);
                        } else if (canSellSeat(seat)) {
                          handleSellSeat(seat.seat_number);
                        }
                      }}
                      disabled={
                        transactionLoading === seat.seat_number ||
                        (!canBuySeat(seat) && !canSellSeat(seat))
                      }
                    >
                      {transactionLoading === seat.seat_number ? '...' : seat.seat_number}
                    </Button>
                    
                    {/* 좌석 정보 툴팁 */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                      <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        <div>좌석 {seat.seat_number}번</div>
                        <div>{getSeatStatus(seat)}</div>
                        <div>₩{seat.current_price.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 좌석 정보 */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <div>좌석을 클릭하여 구매하거나 판매할 수 있습니다</div>
            <div>가격은 학급 총 자산의 60%를 학생 수로 나누어 계산됩니다</div>
            <div>화폐량이 증가할수록 부동산(좌석) 가격도 상승합니다</div>
          </div>
        </CardContent>
      </Card>

      {/* 🎉 축하 모달 */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        seatNumber={celebrationData.seatNumber}
        price={celebrationData.price}
      />
    </div>
  );
}