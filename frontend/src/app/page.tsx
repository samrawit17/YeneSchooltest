"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  MapPin, Phone, Mail, Megaphone, BookOpen, ChevronRight,
  School as SchoolIcon, GraduationCap, Users, Trophy, Quote,
  BookCheck, Bus, Utensils, Microscope, Palette, Shield,
  ArrowUp, Menu, X, ChevronDown, Star, CalendarCheck,
  Globe, MessageSquare, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { announcementsAPI, type Announcement } from "@/lib/api/content";
import { enrollmentAPI } from "@/lib/api/enrollment";
import { resolveAssetUrl } from "@/lib/asset-url";
import {
  findSchoolByUrlSlug,
  getHostSchoolSlug,
  type PublicSchoolSummary,
} from "@/lib/school-resolver";

interface SchoolDetail {
  id: string;
  name: string;
  code: string | null;
  publicUrlSlug: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  accentColor: string | null;
  schoolStartsAt?: string | null;
  registrationStartsAt?: string | null;
}

interface Program {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

interface StatItem {
  icon: ReactNode;
  value: number;
  suffix: string;
  label: string;
}

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Programs", href: "#programs" },
  { label: "Announcements", href: "#announcements" },
  { label: "Contact", href: "#contact" },
];

const defaultPrograms: Program[] = [
  {
    icon: <BookCheck className="w-8 h-8" />,
    title: "General Education",
    description: "Comprehensive K-12 curriculum following national standards with focus on academic excellence.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: <Microscope className="w-8 h-8" />,
    title: "Science & Technology",
    description: "Advanced STEM programs with modern laboratories and hands-on experimental learning.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: <Palette className="w-8 h-8" />,
    title: "Arts & Culture",
    description: "Rich arts education including music, visual arts, drama, and cultural appreciation programs.",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Sports & Athletics",
    description: "Competitive sports programs fostering teamwork, discipline, and physical well-being.",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: <Globe className="w-8 h-8" />,
    title: "Language Programs",
    description: "Multilingual education with emphasis on global communication and cultural understanding.",
    color: "from-rose-500 to-rose-600",
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: "Leadership & Clubs",
    description: "Student government, clubs, and community service initiatives building future leaders.",
    color: "from-cyan-500 to-cyan-600",
  },
];

const defaultStats: StatItem[] = [
  { icon: <Users className="w-6 h-6" />, value: 2500, suffix: "+", label: "Students Enrolled" },
  { icon: <GraduationCap className="w-6 h-6" />, value: 98, suffix: "%", label: "Graduation Rate" },
  { icon: <Trophy className="w-6 h-6" />, value: 150, suffix: "+", label: "Awards Won" },
  { icon: <BookCheck className="w-6 h-6" />, value: 45, suffix: "+", label: "Academic Programs" },
];

const CountUp = ({ value, suffix, duration = 2 }: { value: number; suffix: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = Math.ceil(value / (duration * 60));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

const CountdownTimer = ({ targetDate, label }: { targetDate: string; label: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</span>
      <div className="flex items-center gap-2 text-white">
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold leading-tight">{timeLeft.days}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/60">Days</div>
        </div>
        <span className="text-xl font-bold text-white/40 pt-1">:</span>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold leading-tight">{String(timeLeft.hours).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/60">Hrs</div>
        </div>
        <span className="text-xl font-bold text-white/40 pt-1">:</span>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold leading-tight">{String(timeLeft.minutes).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/60">Min</div>
        </div>
        <span className="text-xl font-bold text-white/40 pt-1">:</span>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold leading-tight">{String(timeLeft.seconds).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/60">Sec</div>
        </div>
      </div>
    </div>
  );
};

const SectionHeading = ({ badge, title, description }: { badge: string; title: string; description: string }) => (
  <div className="text-center mb-12 md:mb-16">
    <Badge
      className="mb-4 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border-0"
      style={{ backgroundColor: "rgba(var(--brand-color-rgb), 0.12)", color: "var(--brand-color)" }}
    >
      {badge}
    </Badge>
    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
      {title}
    </h2>
    <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
      {description}
    </p>
  </div>
);

const ProgramCard = ({ program, index }: { program: Program; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="group relative bg-white dark:bg-slate-800/80 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-700/50"
  >
    <div
      className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${program.color} text-white mb-5 shadow-lg transition-transform duration-300 group-hover:scale-110`}
    >
      {program.icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{program.title}</h3>
    <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{program.description}</p>
  </motion.div>
);

const TestimonialCard = ({ quote, name, role, index }: { quote: string; name: string; role: string; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.15 }}
    className="relative bg-white dark:bg-slate-800/80 rounded-2xl p-6 md:p-8 shadow-md border border-gray-100 dark:border-slate-700/50"
  >
    <Quote className="w-8 h-8 mb-4" style={{ color: "rgba(var(--brand-color-rgb), 0.25)" }} />
    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 italic">&ldquo;{quote}&rdquo;</p>
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: "var(--brand-color)" }}
      >
        {name.charAt(0)}
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{name}</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs">{role}</p>
      </div>
    </div>
  </motion.div>
);

const defaultTestimonials = [
  { quote: "This school has transformed my child's learning experience. The teachers are dedicated and the facilities are outstanding.", name: "Sarah Johnson", role: "Parent" },
  { quote: "The supportive environment and excellent teaching helped me achieve my academic goals. I'm proud to be an alum.", name: "Michael Chen", role: "Alumnus, Class of 2023" },
  { quote: "As a teacher here, I'm constantly inspired by the passion for learning and the collaborative community we've built.", name: "Emily Rodriguez", role: "Mathematics Teacher" },
];

const Homepage = () => {
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("schoolId");
  const enrollmentKey = searchParams.get("key");
  const schoolSlug = searchParams.get("school") || searchParams.get("slug");

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [availableSchools, setAvailableSchools] = useState<PublicSchoolSummary[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const resolveSchool = async () => {
      setLoading(true);
      setResolveError(null);
      setResolvedSchoolId(null);
      setSchool(null);
      setAnnouncements([]);

      if (schoolId) {
        setResolvedSchoolId(schoolId);
        return;
      }
      if (enrollmentKey) {
        try {
          const res = await enrollmentAPI.resolveSchoolByKey(enrollmentKey);
          if (res.data?.school?.id) {
            setResolvedSchoolId(res.data.school.id);
            return;
          }
        } catch {}
      }
      try {
        const response = await enrollmentAPI.getSchools();
        const schools = response.data?.data || [];
        setAvailableSchools(schools);

        const requestedSlug = schoolSlug || getHostSchoolSlug();
        if (requestedSlug) {
          const matchedSchool = findSchoolByUrlSlug(schools, requestedSlug);
          if (matchedSchool) {
            setResolvedSchoolId(matchedSchool.id);
            return;
          }
          setResolveError("School Not Found");
          setLoading(false);
          return;
        }

        if (schools.length === 1) {
          setResolvedSchoolId(schools[0].id);
          return;
        }
        setLoading(false);
      } catch {
        setResolveError("Unable to load schools");
        setLoading(false);
      }
    };
    resolveSchool();
  }, [schoolId, enrollmentKey, schoolSlug]);

  useEffect(() => {
    if (!resolvedSchoolId) return;

    const fetchData = async () => {
      try {
        const [schoolRes, announcementRes] = await Promise.all([
          enrollmentAPI.getSchoolById(resolvedSchoolId),
          announcementsAPI.getPublic(resolvedSchoolId),
        ]);

        if (schoolRes.data?.success && schoolRes.data?.data) {
          setSchool(schoolRes.data.data);
        }
        const data = announcementRes.data;
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch {
        setSchool(null);
        setResolveError("Unable to load school home page");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [resolvedSchoolId]);

  useEffect(() => {
    if (currentSlide >= announcements.length) {
      setCurrentSlide(0);
    }
  }, [announcements.length, currentSlide]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const brandColor = school?.accentColor || "#e35336";
  const logoUrl = resolveAssetUrl(school?.logoUrl);
  const publicSlug = school?.publicUrlSlug || "";
  const schoolLoginHref = publicSlug
    ? `/schools/${encodeURIComponent(publicSlug)}/login`
    : `/sign-in?schoolId=${encodeURIComponent(school?.id || "")}`;
  const schoolEnrollHref = publicSlug
    ? `/enroll?school=${encodeURIComponent(publicSlug)}`
    : `/enroll?schoolId=${encodeURIComponent(school?.id || "")}`;

  const scrollTo = (id: string) => {
    setMobileNavOpen(false);
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const Navbar = () => (
    <header
      className={`fixed left-0 right-0 top-0 z-50 max-w-full overflow-x-clip transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="#home" className="flex items-center gap-3 shrink-0" onClick={() => scrollTo("#home")}>
            {logoUrl ? (
              <img src={logoUrl} alt={school?.name || "School"} className="h-9 w-9 md:h-10 md:w-10 rounded-lg object-cover ring-2 ring-white shadow-sm" />
            ) : (
              <div
                className="h-9 w-9 md:h-10 md:w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {(school?.name || "S").charAt(0)}
              </div>
            )}
            <span className={`max-w-[min(52vw,180px)] truncate text-lg font-bold md:max-w-[240px] md:text-xl ${
              scrolled ? "text-gray-900 dark:text-white" : "text-white"
            }`}>
              {school?.name || "School"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10 ${
                  scrolled
                    ? "text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                    : "text-white/90 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="ml-4 pl-4 border-l border-white/20">
              <Link href={schoolLoginHref}>
                <Button
                  size="sm"
                  className="rounded-lg shadow-md"
                  style={{
                    backgroundColor: scrolled ? brandColor : "white",
                    color: scrolled ? "white" : brandColor,
                    borderColor: scrolled ? "transparent" : "white",
                  }}
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className={`rounded-lg p-2 transition-colors lg:hidden ${
              scrolled
                ? "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                : "text-white hover:bg-white/10"
            }`}
          >
            {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 lg:hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                <Link href={schoolLoginHref} className="block">
                  <Button className="w-full" style={{ backgroundColor: brandColor }}>
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );

  const Footer = () => (
    <footer className="relative bg-gray-900 dark:bg-slate-950 text-white">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: brandColor }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover ring-2 ring-white/20" />
              ) : (
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  {(school?.name || "S").charAt(0)}
                </div>
              )}
              <span className="font-bold text-lg">{school?.name || "School"}</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Empowering students with quality education, fostering academic excellence, and building future leaders since our founding.
            </p>
            <div className="flex gap-3">
              {[Globe, MessageSquare, Mail].map((Icon, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <Icon className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {["About Us", "Academic Programs", "Admissions", "Events Calendar", "News & Updates"].map((item) => (
                <li key={item}>
                  <button onClick={() => scrollTo("#about")} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Academics */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Academics</h3>
            <ul className="space-y-3">
              {["Curriculum Overview", "Faculty & Staff", "Library Resources", "Science Labs", "Online Learning"].map((item) => (
                <li key={item}>
                  <button className="text-gray-400 hover:text-white text-sm transition-colors">{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-300 mb-4">Contact</h3>
            <ul className="space-y-3">
              {school?.address && (
                <li className="flex items-start gap-3 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{school.address}</span>
                </li>
              )}
              {school?.email && (
                <li className="flex items-center gap-3 text-gray-400 text-sm">
                  <Mail className="w-4 h-4 shrink-0" />
                  <a href={`mailto:${school.email}`} className="hover:text-white transition-colors">{school.email}</a>
                </li>
              )}
              {school?.phone && (
                <li className="flex items-center gap-3 text-gray-400 text-sm">
                  <Phone className="w-4 h-4 shrink-0" />
                  <a href={`tel:${school.phone}`} className="hover:text-white transition-colors">{school.phone}</a>
                </li>
              )}
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Mon - Fri: 8:00 AM - 4:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} {school?.name || "School"}. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 animate-pulse"
              style={{ backgroundColor: "rgba(var(--brand-color-rgb), 0.2)" }}
            />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <Navbar />
        <div className="pt-32 pb-20 px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {resolveError || "Choose Your School"}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                Select a school to view announcements, enrollment, and contact details.
              </p>
            </div>

            {availableSchools.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {availableSchools.map((item, i) => {
                  const itemLogo = resolveAssetUrl(item.logoUrl);
                  const accent = item.accentColor || brandColor;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      key={item.id}
                    >
                      <Link
                        href={
                          item.publicUrlSlug
                            ? `/schools/${encodeURIComponent(item.publicUrlSlug)}/login`
                            : `/?schoolId=${item.id}`
                        }
                        className="group block rounded-2xl border bg-white dark:bg-slate-800/80 p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 dark:border-slate-700"
                      >
                        <div
                          className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl"
                          style={{ backgroundColor: `${accent}15` }}
                        >
                          {itemLogo ? (
                            <img src={itemLogo} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <SchoolIcon className="h-8 w-8" style={{ color: accent }} />
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[var(--brand-color)] transition-colors">
                          {item.name}
                        </h2>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border bg-white dark:bg-slate-800/80 p-14 text-center shadow-sm dark:border-slate-700"
              >
                <SchoolIcon className="mx-auto mb-5 h-16 w-16 text-gray-300 dark:text-gray-600" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No school is currently available.</h2>
                <p className="text-gray-500 dark:text-gray-400">Please check back later.</p>
              </motion.div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navbar />

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 50%, ${brandColor}88 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-slate-900" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 md:pt-32 md:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge
                className="mb-5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border-0 bg-white/20 text-white backdrop-blur-sm"
              >
                Welcome to {school.name}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6">
                Shaping Future{" "}
                <span className="text-white/70">Leaders Today</span>
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-xl mb-8 leading-relaxed">
                Providing quality education that nurtures curiosity, creativity, and character. Join us in building a brighter tomorrow.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href={schoolEnrollHref}>
                  <Button
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-gray-100 shadow-xl hover:shadow-2xl rounded-xl px-8 h-12 text-base font-semibold"
                  >
                    Enroll Now
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("#programs")}
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-xl px-8 h-12 text-base font-semibold"
                >
                  Explore Programs
                </Button>
              </div>
              {(school.schoolStartsAt || school.registrationStartsAt) && (
                <div className="flex flex-wrap gap-6 mt-8 pt-6 border-t border-white/20">
                  {school.schoolStartsAt && (
                    <CountdownTimer targetDate={school.schoolStartsAt} label="School Starts In" />
                  )}
                  {school.registrationStartsAt && (
                    <CountdownTimer targetDate={school.registrationStartsAt} label="Registration Starts In" />
                  )}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:flex justify-center"
            >
              <div className="relative">
                <div className="w-72 h-72 xl:w-80 xl:h-80 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
                  {logoUrl ? (
                    <img src={logoUrl} alt={school.name} className="w-48 h-48 xl:w-56 xl:h-56 object-contain" />
                  ) : (
                    <SchoolIcon className="w-32 h-32 text-white/60" />
                  )}
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Top Rated</p>
                    <p className="text-gray-500 text-xs">Educational Excellence</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative -mt-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {defaultStats.map((stat, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 md:p-8 text-center hover:shadow-xl transition-shadow duration-300"
              >
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge
                className="mb-4 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border-0"
                style={{ backgroundColor: "rgba(var(--brand-color-rgb), 0.12)", color: "var(--brand-color)" }}
              >
                About Us
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                A Legacy of{" "}
                <span style={{ color: brandColor }}>Academic Excellence</span>
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                <p>
                  {school.name} is dedicated to providing a holistic education that prepares students for success in an ever-changing world. Our experienced faculty, modern facilities, and comprehensive curriculum create an environment where every student can thrive.
                </p>
                <p>
                  We believe in nurturing not just academic achievement, but also character development, critical thinking, and a lifelong love for learning. Our students consistently achieve outstanding results and go on to excel in their chosen paths.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Qualified Teachers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Modern Facilities</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Student-Centered Approach</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <div
                className="rounded-3xl overflow-hidden shadow-2xl"
                style={{ backgroundColor: `${brandColor}10` }}
              >
                <div className="p-8 md:p-10">
                  <Quote className="w-12 h-12 mb-4" style={{ color: `${brandColor}40` }} />
                  <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed italic mb-6">
                    &ldquo;Education is the most powerful weapon which you can use to change the world.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: brandColor }}
                    >
                      NM
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Nelson Mandela</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Inspirational Leader</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section
        id="programs"
        className="py-20 md:py-28"
        style={{ backgroundColor: `${brandColor}03` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Our Programs"
            title="Comprehensive Academic Programs"
            description="We offer a diverse range of programs designed to develop well-rounded students prepared for future challenges."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {defaultPrograms.map((program, i) => (
              <ProgramCard key={i} program={program} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      <section id="announcements" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Announcements"
            title="Latest News & Updates"
            description="Stay informed with the latest announcements, events, and important updates from our school."
          />

          {announcements.length > 0 ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 md:p-10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.35 }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Badge
                          className="text-xs border-0"
                          style={{
                            backgroundColor:
                              announcements[currentSlide].priority === "HIGH"
                                ? "#ef4444"
                                : announcements[currentSlide].priority === "MEDIUM"
                                ? "#f59e0b"
                                : "#3b82f6",
                            color: "white",
                          }}
                        >
                          {announcements[currentSlide].priority}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(announcements[currentSlide].createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {announcements[currentSlide].title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                        {announcements[currentSlide].content}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {announcements.length > 1 && (
                    <div className="flex items-center gap-2 mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                      {announcements.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlide(i)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            i === currentSlide ? "w-8" : "w-2 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400"
                          }`}
                          style={i === currentSlide ? { backgroundColor: brandColor } : {}}
                        />
                      ))}
                      <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                        {currentSlide + 1} / {announcements.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No announcements at this time.</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section
        className="py-20 md:py-28"
        style={{ backgroundColor: `${brandColor}03` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Testimonials"
            title="What People Say About Us"
            description="Hear from our students, parents, and alumni about their experiences at our school."
          />

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {defaultTestimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${brandColor}, ${brandColor}bb)`,
            }}
          >
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative p-8 md:p-12 lg:p-16 text-center">
              <Badge className="mb-4 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border-0 bg-white/20 text-white">
                Start Your Journey
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Begin Your Educational Journey Today
              </h2>
              <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-8">
                Join {school.name} and give your child the gift of quality education. Enroll now for the upcoming academic year.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href={schoolEnrollHref}>
                  <Button
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-gray-100 shadow-xl rounded-xl px-10 h-14 text-base font-semibold"
                  >
                    Apply for Enrollment
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("#contact")}
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-xl px-10 h-14 text-base font-semibold"
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-28 bg-gray-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Contact Us"
            title="Get In Touch"
            description="Have questions? We'd love to hear from you. Reach out to us through any of the channels below."
          />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
            {[
              { icon: MapPin, title: "Address", content: school.address || "123 School Street, City", sub: "Visit us during school hours" },
              { icon: Phone, title: "Phone", content: school.phone || "+1 234 567 890", sub: "Mon - Fri: 8:00 AM - 4:00 PM" },
              { icon: Mail, title: "Email", content: school.email || "info@school.edu", sub: "We'll respond within 24 hours" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-md border border-gray-100 dark:border-slate-700 text-center hover:shadow-lg transition-shadow"
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5 text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 font-medium">{item.content}</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{item.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-40 p-3 rounded-xl shadow-lg text-white"
            style={{ backgroundColor: brandColor }}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Homepage;
