import Background from "@/components/Background";
import ScrollProgress from "@/components/ScrollProgress";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CoursesSection from "@/components/CoursesSection";
import MethodSection from "@/components/MethodSection";
import EnterpriseSection from "@/components/EnterpriseSection";
import InstructorSection from "@/components/InstructorSection";
import BlogSection from "@/components/BlogSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

// Revalida a home periodicamente para refletir novos posts do blog.
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Background />
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <CoursesSection />
        <MethodSection />
        <EnterpriseSection />
        <InstructorSection />
        <BlogSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
