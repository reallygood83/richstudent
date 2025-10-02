'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import confetti from 'canvas-confetti';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  seatNumber: string;
  price: number;
}

export function CelebrationModal({
  isOpen,
  onClose,
  seatNumber,
  price,
}: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && !showConfetti) {
      setShowConfetti(true);

      // 🎉 Confetti 애니메이션
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // 3초 후 자동 닫기
      setTimeout(() => {
        onClose();
        setShowConfetti(false);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isOpen, showConfetti, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-green-600">
            🎉 축하합니다! 🎉
          </DialogTitle>
          <DialogDescription className="text-center space-y-4 pt-4">
            <div className="text-lg font-semibold text-gray-800">
              좌석 <span className="text-blue-600 text-xl">{seatNumber}번</span>을
              <br />
              성공적으로 구매했습니다!
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">구매 가격</p>
              <p className="text-2xl font-bold text-green-700">
                ₩{price.toLocaleString()}
              </p>
            </div>

            <div className="text-sm text-gray-500 animate-pulse">
              이 창은 3초 후 자동으로 닫힙니다...
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
