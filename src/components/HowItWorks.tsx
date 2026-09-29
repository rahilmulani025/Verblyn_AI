import { Target, Brain, Mic, BarChart3 } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { ParallaxOrb } from "./ParallaxLayer";

const steps = [
  {
    icon: Target,
    title: "Get a speaking topic",
    description: "AI generates relevant topics based on your goals",
  },
  {
    icon: Brain,
    title: "AI gives keywords & structure",
    description: "Get talking points and organization tips",
  },
  {
    icon: Mic,
    title: "Speak freely",
    description: "Practice for a few minutes at your own pace",
  },
  {
    icon: BarChart3,
    title: "Get instant feedback",
    description: "Receive your confidence score and improvements",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Parallax background orbs */}
      <ParallaxOrb size="xl" color="mixed" position={{ top: "0%", right: "-15%" }} speed={0.2} />
      <ParallaxOrb size="md" color="primary" position={{ bottom: "20%", left: "-10%" }} speed={0.3} />
      
      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              How <span className="text-gradient">Verblyn</span> Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four simple steps to improve your speaking confidence
            </p>
          </div>
        </ScrollReveal>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <ScrollReveal key={index} delay={index * 0.15}>
              <div className="relative group h-full">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-accent/50 to-transparent" />
                )}
                
                <div className="glass-card-hover p-6 text-center h-full">
                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-accent/20 transition-all duration-300">
                    <step.icon className="w-8 h-8 text-accent" />
                  </div>
                  
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
