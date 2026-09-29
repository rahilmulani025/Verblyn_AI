import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Logo from "./Logo";

const Navbar = () => {
  const { user, signOut, loading } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
      <div className="container mx-auto px-6 py-4">
        <div className="relative flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex-shrink-0 z-10">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          
          {/* Center: Navigation - absolutely positioned for true centering */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              How It Works
            </a>
            {user && (
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                Dashboard
              </Link>
            )}
          </div>
          
          {/* Right: Auth buttons */}
          <div className="flex items-center gap-3 z-10">
            {loading ? (
              <div className="w-20 h-8 bg-muted/20 rounded animate-pulse" />
            ) : user ? (
              <>
                <Link 
                  to="/profile"
                  className="px-4 py-2 rounded-lg bg-muted/20 text-foreground font-medium text-sm hover:bg-muted/30 transition-all duration-300"
                >
                  Profile
                </Link>
                <Link 
                  to="/practice"
                  className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:shadow-lg hover:shadow-accent/30 transition-all duration-300"
                >
                  Practice
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 hidden sm:block"
                >
                  Login
                </Link>
                <Link 
                  to="/auth"
                  className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:shadow-lg hover:shadow-accent/30 transition-all duration-300"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
