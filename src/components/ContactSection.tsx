import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";
import { ParallaxOrb } from "./ParallaxLayer";

const ContactSection = () => {
  const email = "foundingteam.verblyn.ai@gmail.com";

  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      {/* Parallax background orbs */}
      <ParallaxOrb size="lg" color="accent" position={{ top: "10%", right: "-10%" }} speed={0.2} />
      <ParallaxOrb size="md" color="primary" position={{ bottom: "20%", left: "-5%" }} speed={0.15} />
      
      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Get in <span className="text-gradient">Touch</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Have questions or want to learn more about Verblyn? We'd love to hear from you.
            </p>
            
            <div className="glass-card p-6 md:p-8 inline-block">
              <p className="text-sm text-muted-foreground mb-3">Email us at</p>
              <a 
                href={`mailto:${email}`}
                className="text-lg md:text-xl font-medium text-foreground hover:text-accent transition-colors break-all"
              >
                {email}
              </a>
              
              <div className="mt-6">
                <Button 
                  variant="accent" 
                  size="lg" 
                  className="group"
                  onClick={() => window.location.href = `mailto:${email}`}
                >
                  <Send className="w-4 h-4" />
                  Send us an Email
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ContactSection;
