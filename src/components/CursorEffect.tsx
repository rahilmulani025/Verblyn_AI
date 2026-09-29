import { useEffect, useState } from "react";

const CursorEffect = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      const target = e.target as HTMLElement;
      const isClickable = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        !!target.closest('button') || 
        !!target.closest('a') ||
        window.getComputedStyle(target).cursor === 'pointer';
      
      setIsPointer(isClickable);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Main glow orb */}
      <div
        className={`fixed pointer-events-none z-[9999] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer glow */}
        <div
          className={`absolute rounded-full bg-accent/20 blur-xl transition-all duration-300 ease-out ${
            isPointer ? 'w-20 h-20' : 'w-32 h-32'
          }`}
          style={{
            transform: 'translate(-50%, -50%)',
          }}
        />
        
        {/* Inner core */}
        <div
          className={`absolute rounded-full bg-accent/40 blur-md transition-all duration-200 ease-out ${
            isPointer ? 'w-8 h-8' : 'w-6 h-6'
          }`}
          style={{
            transform: 'translate(-50%, -50%)',
          }}
        />
        
        {/* Center dot */}
        <div
          className={`absolute rounded-full bg-accent transition-all duration-150 ease-out ${
            isPointer ? 'w-3 h-3 scale-150' : 'w-2 h-2'
          }`}
          style={{
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Trailing gradient */}
      <div
        className={`fixed pointer-events-none z-[9998] w-64 h-64 rounded-full transition-opacity duration-500 ${
          isVisible ? 'opacity-30' : 'opacity-0'
        }`}
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
    </>
  );
};

export default CursorEffect;
