import verblynLogo from "@/assets/verblyn-logo.jpeg";

const Logo = () => {
  return (
    <img 
      src={verblynLogo} 
      alt="Verblyn.AI" 
      className="h-9 w-auto rounded-lg shadow-lg shadow-accent/20 ring-1 ring-white/10"
    />
  );
};

export default Logo;
