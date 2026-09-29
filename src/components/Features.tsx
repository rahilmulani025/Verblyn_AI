import { AudioLines, Users, MessageSquare, TrendingUp } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { ParallaxOrb } from "./ParallaxLayer";

const features = [
  {
    icon: AudioLines,
    title: "AI Speech Analysis",
    description: "Advanced analysis of fluency, grammar, pronunciation, and confidence in real-time.",
    gradient: "from-primary to-primary/50",
  },
  {
    icon: MessageSquare,
    title: "Interview Mode",
    description: "Practice with HR and behavioral interview questions in a realistic setting.",
    gradient: "from-accent to-accent/50",
  },
  {
    icon: Users,
    title: "Group Discussion Practice",
    description: "Learn to speak clearly, lead conversations, and express ideas effectively.",
    gradient: "from-primary to-accent",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Visualize your confidence growth over time with detailed analytics.",
    gradient: "from-accent to-primary",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Parallax background orbs */}
      <ParallaxOrb size="lg" color="accent" position={{ top: "20%", left: "-10%" }} speed={0.15} />
      <ParallaxOrb size="md" color="primary" position={{ bottom: "10%", right: "-5%" }} speed={0.25} />
      
      <div className="container mx-auto px-6 relative">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Powerful <span className="text-gradient">Features</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to become a confident speaker
            </p>
          </div>
        </ScrollReveal>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="glass-card-hover p-8 group h-full">
                {/* Icon container */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-foreground" />
                </div>
                
                <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
