import { GraduationCap, Briefcase, User, Building } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const audiences = [
  {
    icon: GraduationCap,
    title: "Students",
    description: "Ace presentations and campus interviews",
  },
  {
    icon: Briefcase,
    title: "Job Seekers",
    description: "Nail your next interview with confidence",
  },
  {
    icon: User,
    title: "Professionals",
    description: "Excel in meetings and client calls",
  },
  {
    icon: Building,
    title: "Campus Training",
    description: "Prepare students for placement drives",
  },
];

const WhoItsFor = () => {
  return (
    <section id="about" className="py-24 relative">
      <div className="container mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Who Is <span className="text-gradient">Verblyn</span> For?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built for anyone who wants to speak with confidence
            </p>
          </div>
        </ScrollReveal>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {audiences.map((audience, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="glass-card-hover p-6 text-center group h-full">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center mx-auto mb-4 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                  <audience.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {audience.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {audience.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoItsFor;
