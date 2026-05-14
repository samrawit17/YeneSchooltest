'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { enrollmentAPI } from "@/lib/api/enrollment";

const Homepage = () => {
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("schoolId");
  const enrollmentKey = searchParams.get("key");
  const [fallbackSchoolId, setFallbackSchoolId] = useState<string | null>(null);

  useEffect(() => {
    if (schoolId || enrollmentKey) return;

    const loadFallbackSchool = async () => {
      try {
        const response = await enrollmentAPI.getSchools();
        const schools = response.data?.data || [];
        if (schools.length === 1) {
          setFallbackSchoolId(schools[0].id);
        }
      } catch {
        setFallbackSchoolId(null);
      }
    };

    loadFallbackSchool();
  }, [enrollmentKey, schoolId]);

  const enrollHref = schoolId
    ? `/enroll?schoolId=${encodeURIComponent(schoolId)}`
    : enrollmentKey
      ? `/enroll?key=${encodeURIComponent(enrollmentKey)}`
      : fallbackSchoolId
        ? `/enroll?schoolId=${encodeURIComponent(fallbackSchoolId)}`
        : "/enroll";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="School Management System"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-blue-600">
                SMS Portal
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium">
                About
              </Link>
              <Link href="/features" className="text-gray-700 hover:text-blue-600 font-medium">
                Features
              </Link>
              <Link href={enrollHref} className="text-blue-600 hover:text-blue-700 font-semibold">
                Admission
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 font-medium">
                Contact
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-in"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-[clamp(1.8rem,3vw,3rem)] font-bold leading-tight mb-6">
                Streamline Your School Management
              </h1>
              <p className="text-lg mb-8 text-blue-100">
                A comprehensive, modern school management system designed to simplify administrative tasks, enhance communication, and improve student outcomes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/sign-in"
                  className="px-8 py-3 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-semibold transition-colors text-center"
                >
                  Sign In
                </Link>
                <Link
                  href={enrollHref}
                  className="px-8 py-3 bg-yellow-400 text-blue-700 rounded-md hover:bg-yellow-300 font-semibold transition-colors text-center"
                >
                  Enroll Now
                </Link>
                <Link
                  href="/about"
                  className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-md hover:bg-white hover:text-blue-600 font-semibold transition-colors text-center"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="relative">
              <Image
                src="/cnergy-v2.jpg"
                alt="School Management Dashboard"
                width={600}
                height={400}
                className="rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-[clamp(1.4rem,2vw,2rem)] font-bold text-gray-900 mb-4">
              Powerful Features for Modern Schools
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools you need to manage your school efficiently and effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Image
                  src="/student.png"
                  alt="Student Management"
                  width={28}
                  height={28}
                  className="text-blue-600"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Student Management
              </h3>
              <p className="text-gray-600">
                Comprehensive student profiles, enrollment tracking, and academic records management system.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Image
                  src="/teacher.png"
                  alt="Teacher Management"
                  width={28}
                  height={28}
                  className="text-blue-600"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Teacher Management
              </h3>
              <p className="text-gray-600">
                Manage teacher profiles, assignments, schedules, and performance tracking with ease.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Image
                  src="/class.png"
                  alt="Class Management"
                  width={28}
                  height={28}
                  className="text-blue-600"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Class Management
              </h3>
              <p className="text-gray-600">
                Create and manage classes, sections, and academic programs with intuitive tools.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Image
                  src="/exam.png"
                  alt="Examination Management"
                  width={28}
                  height={28}
                  className="text-blue-600"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Examination Management
              </h3>
              <p className="text-gray-600">
                Streamline exam scheduling, grading, and results management with automated processes.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Image
                  src="/attendance.png"
                  alt="Attendance Tracking"
                  width={28}
                  height={28}
                  className="text-blue-600"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Attendance Tracking
              </h3>
              <p className="text-gray-600">
                Real-time attendance tracking with automated reports and notifications.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Image
                  src="/finance.png"
                  alt="Finance Management"
                  width={28}
                  height={28}
                  className="text-blue-600"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Finance Management
              </h3>
              <p className="text-gray-600">
                Complete financial management including fees, expenses, and reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Schools</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50K+</div>
              <div className="text-blue-100">Students</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">5K+</div>
              <div className="text-blue-100">Teachers</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">99%</div>
              <div className="text-blue-100">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
