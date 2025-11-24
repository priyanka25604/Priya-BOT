import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  level: number;
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ level, isActive }) => {
  // Use a ref to smooth the level animation
  const barsRef = useRef<HTMLDivElement[]>([]);
  
  useEffect(() => {
    if (!isActive) {
      barsRef.current.forEach(bar => {
        if (bar) bar.style.height = '4px';
      });
      return;
    }

    // Create a wave effect
    barsRef.current.forEach((bar, index) => {
      if (!bar) return;
      
      // Offset the phase for each bar to create a wave
      const phase = index * 0.5;
      const variedLevel = Math.max(0.1, level + Math.sin(Date.now() / 100 + phase) * 0.2);
      
      // Randomize slightly for organic feel
      const height = Math.min(100, Math.max(4, variedLevel * 100 * (0.8 + Math.random() * 0.4)));
      
      bar.style.height = `${height}px`;
      
      // Dynamic color based on intensity
      if (height > 60) {
        bar.style.backgroundColor = '#38bdf8'; // bright blue
        bar.style.boxShadow = '0 0 15px #38bdf8';
      } else {
        bar.style.backgroundColor = '#0ea5e9'; // standard blue
        bar.style.boxShadow = 'none';
      }
    });
  }, [level, isActive]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-32">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          ref={el => { if (el) barsRef.current[i] = el; }}
          className="w-3 rounded-full bg-sky-500 transition-all duration-75 visualizer-bar"
          style={{ height: '4px' }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
