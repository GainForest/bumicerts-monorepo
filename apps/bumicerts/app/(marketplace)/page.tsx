import { Hero } from "./_components/Home/Hero";
import { FeaturesSection } from "./_components/Home/FeaturesSection";
import { UserOptionCards } from "./_components/Home/UserOptionCards";
import { WhatIsBumicert } from "./_components/Home/WhatIsBumicert";
import { HomeFooter } from "./_components/Home/HomeFooter";

export const metadata = {
  title: "Bumicerts — Fund Regenerative Impact",
  description:
    "Connect with nature stewards doing verified on-ground restoration work. Fund real environmental impact through digital certificates.",
};

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Full-screen hero with atmospheric image */}
      <Hero />
      
      {/* "About Us" style numbered features */}
      <FeaturesSection />
      
      {/* Choose your path - Supporter vs Organization */}
      <UserOptionCards />
      
      {/* What is a Bumicert? - with BumicertArt preview */}
      <WhatIsBumicert />
      
      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
