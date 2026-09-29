import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import DashboardPreview from "@/components/DashboardPreview";
import WhoItsFor from "@/components/WhoItsFor";
import WhyVerblyn from "@/components/WhyVerblyn";
import CTASection from "@/components/CTASection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import CursorEffect from "@/components/CursorEffect";

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <CursorEffect />
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <Features />
      <DashboardPreview />
      <WhoItsFor />
      <WhyVerblyn />
      <CTASection />
      <ContactSection />
      <Footer />
    </main>
  );
};

export default Index;
