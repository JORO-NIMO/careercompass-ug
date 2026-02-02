import React from 'react';

type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
};

export function Sparkline({ data, width = 120, height = 32, stroke = 'currentColor', fill = 'none' }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-primary/80">
      <polyline points={points} fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
