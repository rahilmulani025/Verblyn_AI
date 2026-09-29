import { ReactNode } from "react";
import useParallax from "@/hooks/useParallax";
import { cn } from "@/lib/utils";

interface ParallaxLayerProps {
  children?: ReactNode;
  speed?: number;
  className?: string;
  direction?: "up" | "down";
}

export const ParallaxLayer = ({ 
  children, 
  speed = 0.3, 
  className,
  direction = "up" 
}: ParallaxLayerProps) => {
  const offset = useParallax(speed);
  const translateY = direction === "up" ? -offset : offset;

  return (
    <div 
      className={cn("will-change-transform", className)}
      style={{ transform: `translateY(${translateY}px)` }}
    >
      {children}
    </div>
  );
};

interface ParallaxOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "accent" | "mixed";
  position: { top?: string; bottom?: string; left?: string; right?: string };
  speed?: number;
  blur?: "md" | "lg" | "xl" | "2xl" | "3xl";
}

export const ParallaxOrb = ({ 
  size = "md", 
  color = "accent", 
  position,
  speed = 0.2,
  blur = "3xl"
}: ParallaxOrbProps) => {
  const offset = useParallax(speed);
  
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-64 h-64",
    lg: "w-96 h-96",
    xl: "w-[500px] h-[500px]",
  };

  const colorClasses = {
    primary: "bg-primary/10",
    accent: "bg-accent/10",
    mixed: "bg-gradient-to-br from-primary/10 to-accent/10",
  };

  return (
    <div 
      className={cn(
        "absolute rounded-full pointer-events-none will-change-transform",
        sizeClasses[size],
        colorClasses[color],
        `blur-${blur}`
      )}
      style={{ 
        ...position,
        transform: `translateY(${offset}px)` 
      }}
    />
  );
};

export default ParallaxLayer;
