import Logo from "./Logo";
import { Mail, Twitter, Linkedin, Github } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const email = "foundingteam.verblyn.ai@gmail.com";

  return (
    <footer className="py-12 md:py-16 border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Main footer content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-10">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="text-sm text-muted-foreground mt-3 max-w-xs">
              Speak confidently. Powered by AI. Transform your communication skills with personalized coaching.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#about" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#contact" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Contact Us</h4>
            <a 
              href={`mailto:${email}`}
              className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-2 break-all"
            >
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="break-all">{email}</span>
            </a>
            
            {/* Social icons */}
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-accent/20 flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-accent/20 flex items-center justify-center transition-colors">
                <Linkedin className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-accent/20 flex items-center justify-center transition-colors">
                <Github className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              © {currentYear} Verblyn.AI. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Made with ❤️ for confident speakers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
