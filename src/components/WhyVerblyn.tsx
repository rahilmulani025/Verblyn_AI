import { Shield, Sparkles, MessageCircle, Heart } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const reasons = [
  {
    icon: Shield,
    text: "Practice without judgment",
  },
  {
    icon: Sparkles,
    text: "Real interview-like experience",
  },
  {
    icon: MessageCircle,
    text: "Personalized AI feedback",
  },
  {
    icon: Heart,
    text: "Build confidence, not just grammar",
  },
];

const WhyVerblyn = () => {
  return (
    <section className="py-24 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-6 relative">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-10 md:p-14">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground text-center mb-12">
                Why Choose <span className="text-gradient">Verblyn</span>?
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {reasons.map((reason, index) => (
                  <ScrollReveal key={index} delay={index * 0.1} direction="left">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors duration-300">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <reason.icon className="w-6 h-6 text-accent" />
                      </div>
                      <span className="font-medium text-foreground">{reason.text}</span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhyVerblyn;
