import { Button } from "@/components/ui/button";
import AnimatedBackground from "./AnimatedBackground";
import { ArrowRight, Mic, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartPracticing = () => {
    if (user) {
      navigate("/practice");
    } else {
      navigate("/auth");
    }
  };

  const handleInterviewMode = () => {
    toast.info("Interview Mode coming soon!", {
      description: "We're working on this feature. Stay tuned!",
    });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      
      <div className="container mx-auto px-6 relative z-10 pt-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm mb-8 fade-in-up">
            <div className="sound-wave h-4">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-sm text-muted-foreground">AI-Powered Speaking Coach</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-tight mb-6 fade-in-up stagger-1">
            Speak with confidence.
            <br />
            <span className="text-gradient">Powered by AI.</span>
          </h1>
          
          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 fade-in-up stagger-2">
            Verblyn helps you practice speaking, analyze your voice, and improve confidence for interviews and real conversations.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 fade-in-up stagger-3">
            <Button variant="hero" size="xl" className="group" onClick={handleStartPracticing}>
              <Mic className="w-5 h-5" />
              Start Practicing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="heroOutline" size="xl" onClick={handleInterviewMode} className="relative">
              <Clock className="w-5 h-5" />
              Try Interview Mode
              <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-semibold bg-accent text-accent-foreground rounded-full">
                Soon
              </span>
            </Button>
          </div>
          
          {/* Floating metrics */}
          <div className="flex flex-wrap justify-center gap-8 fade-in-up stagger-4">
            <div className="glass-card px-6 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-muted-foreground">Real-time Analysis</span>
            </div>
            <div className="glass-card px-6 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-muted-foreground">AI Feedback</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator - hidden on mobile where it overlaps with content */}
      <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 fade-in-up stagger-5">
        <span className="text-xs text-muted-foreground">Scroll to explore</span>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-accent animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
