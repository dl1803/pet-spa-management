"use client";

import { useEffect, useState } from "react";

// Thời điểm hiện tại (mili giây), cập nhật mỗi phút để màn hiển thị giờ trả thực tế và số phút trễ.
export function useMinuteClock() {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return nowMs;
}
