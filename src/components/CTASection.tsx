import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import useParallax from "@/hooks/useParallax";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const CTASection = () => {
  const orbOffset = useParallax(0.25);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartSession = () => {
    if (user) {
      navigate("/practice");
    } else {
      navigate("/auth");
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/10 rounded-full blur-3xl"
        style={{ transform: `translate(-50%, calc(-50% + ${orbOffset}px))` }}
      />
      <div 
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
        style={{ transform: `translateY(${orbOffset * 1.5}px)` }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl"
        style={{ transform: `translateY(${orbOffset * 0.8}px)` }}
      />
      
      <div className="container mx-auto px-6 relative">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Your voice deserves
              <br />
              <span className="text-gradient">confidence.</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Join thousands of speakers who transformed their communication skills with Verblyn's AI-powered coaching.
            </p>
            
            <Button variant="accent" size="xl" className="group pulse-glow" onClick={handleStartSession}>
              Start Your First Session Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • Free forever plan available
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default CTASection;
