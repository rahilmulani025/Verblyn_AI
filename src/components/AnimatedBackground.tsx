import useParallax from "@/hooks/useParallax";

const AnimatedBackground = () => {
  const slowOffset = useParallax(0.15);
  const mediumOffset = useParallax(0.3);
  const fastOffset = useParallax(0.5);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-hero-gradient" />
      
      {/* Grid pattern - slow parallax */}
      <div 
        className="absolute inset-0 bg-grid opacity-40"
        style={{ transform: `translateY(${slowOffset}px)` }}
      />
      
      {/* Radial glow - medium parallax */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-glow-gradient"
        style={{ transform: `translate(-50%, calc(-50% + ${mediumOffset}px))` }}
      />
      
      {/* Floating neural nodes - fast parallax */}
      <div 
        className="neural-node w-3 h-3 top-[20%] left-[15%] float" 
        style={{ animationDelay: '0s', transform: `translateY(${fastOffset * 0.8}px)` }} 
      />
      <div 
        className="neural-node w-2 h-2 top-[30%] left-[80%] float" 
        style={{ animationDelay: '1s', transform: `translateY(${fastOffset * 1.2}px)` }} 
      />
      <div 
        className="neural-node w-4 h-4 top-[60%] left-[10%] float" 
        style={{ animationDelay: '2s', transform: `translateY(${fastOffset * 0.6}px)` }} 
      />
      <div 
        className="neural-node w-2 h-2 top-[70%] left-[85%] float" 
        style={{ animationDelay: '0.5s', transform: `translateY(${fastOffset * 1.4}px)` }} 
      />
      <div 
        className="neural-node w-3 h-3 top-[15%] left-[60%] float" 
        style={{ animationDelay: '1.5s', transform: `translateY(${fastOffset * 0.9}px)` }} 
      />
      <div 
        className="neural-node w-2 h-2 top-[80%] left-[40%] float" 
        style={{ animationDelay: '2.5s', transform: `translateY(${fastOffset * 1.1}px)` }} 
      />
      
      {/* Sound wave lines */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-32 opacity-20" 
        viewBox="0 0 1440 120" 
        preserveAspectRatio="none"
        style={{ transform: `translateY(${slowOffset * 0.5}px)` }}
      >
        <path
          d="M0,60 Q180,20 360,60 T720,60 T1080,60 T1440,60"
          fill="none"
          stroke="hsl(185 85% 55%)"
          strokeWidth="2"
          className="animate-pulse"
        />
        <path
          d="M0,80 Q180,40 360,80 T720,80 T1080,80 T1440,80"
          fill="none"
          stroke="hsl(235 70% 60%)"
          strokeWidth="1.5"
          className="animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
      </svg>
      
      {/* Gradient orbs - different parallax speeds */}
      <div 
        className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl float" 
        style={{ transform: `translateY(${mediumOffset * 0.7}px)` }}
      />
      <div 
        className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl float" 
        style={{ animationDelay: '3s', transform: `translateY(${mediumOffset * 1.3}px)` }} 
      />
    </div>
  );
};

export default AnimatedBackground;
