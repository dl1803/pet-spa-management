"use client";

import { useEffect, useState } from "react";

// Thời điểm hiện tại (mili giây), đồng bộ về mốc đầu phút rồi cập nhật mỗi phút.
export function useMinuteClock() {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = setTimeout(() => {
      setNowMs(Date.now());
      intervalId = setInterval(() => setNowMs(Date.now()), 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, []);
  return nowMs;
}
