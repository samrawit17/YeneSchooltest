"use client";

import { useState, useRef, useCallback } from "react";
import {
  Printer,
  Download,
  CreditCard,
  User,
  School,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building2,
  Hash,
  Users,
  CheckCircle,
  Upload,
  Settings,
  Eye,
  RotateCcw,
  FileJson,
  Palette,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// ===================== TYPES =====================

export interface StudentIdCardData {
  studentId: string;
  studentCode: string;
  name: string;
  grade: number;
  section: string;
  stream?: string;
  academicYear: string;
  dateOfBirth?: string | null;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  phone?: string;
  email?: string;
  rollNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  photoUrl?: string;
}

export interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  tagline?: string;
  code?: string;
}

export interface IdCardTemplate {
  id: string;
  name: string;
  type: "vertical" | "horizontal" | "compact";
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  showQR?: boolean;
  showBack?: boolean;
  fontFamily?: string;
}

// ===================== QR CODE GENERATOR =====================
// Simple QR-like pattern using SVG for student ID verification

function generateQRSvg(data: string, size: number = 80): string {
  // Generate a deterministic pattern from the data string
  const hash = Array.from(data).reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const modules = 21; // 21x21 grid (Version 1 QR)
  const cellSize = size / modules;
  let rects = "";

  // Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isOuter = i === 0 || i === 6 || j === 0 || j === 6;
        const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (isOuter || isInner) {
          rects += `<rect x="${(x + j) * cellSize}" y="${(y + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Data area - deterministic pattern based on input
  for (let i = 0; i < modules; i++) {
    for (let j = 0; j < modules; j++) {
      // Skip finder pattern areas
      if ((i < 8 && j < 8) || (i < 8 && j >= modules - 8) || (i >= modules - 8 && j < 8)) continue;
      // Timing patterns
      if (i === 6 || j === 6) {
        if ((i + j) % 2 === 0) {
          rects += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
        }
        continue;
      }
      // Data modules
      const seed = (hash + i * 31 + j * 37 + data.charCodeAt(Math.abs(i - j) % data.length)) % 100;
      if (seed < 45) {
        rects += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}

// ===================== TEMPLATES =====================

const cardTemplates: IdCardTemplate[] = [
  { id: "standard", name: "Standard", type: "vertical", primaryColor: "#1e40af", secondaryColor: "#3b82f6", showQR: true },
  { id: "modern", name: "Modern", type: "vertical", primaryColor: "#7c3aed", secondaryColor: "#a78bfa", showQR: true },
  { id: "classic", name: "Classic", type: "vertical", primaryColor: "#059669", secondaryColor: "#34d399" },
  { id: "horizontal", name: "Horizontal", type: "horizontal", primaryColor: "#dc2626", secondaryColor: "#f87171", showQR: true },
  { id: "compact", name: "Compact", type: "compact", primaryColor: "#ea580c", secondaryColor: "#fb923c" },
  { id: "executive", name: "Executive", type: "vertical", primaryColor: "#18181b", secondaryColor: "#3f3f46", accentColor: "#d4a843", showQR: true, showBack: true },
  { id: "gradient", name: "Gradient", type: "vertical", primaryColor: "#6366f1", secondaryColor: "#ec4899", accentColor: "#8b5cf6", showQR: true },
  { id: "minimalist", name: "Minimalist", type: "vertical", primaryColor: "#334155", secondaryColor: "#64748b", showQR: true },
];

// ===================== DEFAULT DATA =====================

const defaultSchoolInfo: SchoolInfo = {
  name: "School Name",
  address: "City, Country",
  phone: "+000 00 000 0000",
  email: "info@school.edu",
  tagline: "Excellence in Education",
};

const defaultStudentData: StudentIdCardData = {
  studentId: "student-001",
  studentCode: "SCH-2025-001",
  name: "Student Name",
  grade: 10,
  section: "A",
  academicYear: "2025-2026",
  gender: "Male",
  photoUrl: "",
};

// ===================== INITIALS AVATAR =====================

function InitialsAvatar({ name, size = "lg", bgColor }: { name: string; size?: "sm" | "lg"; bgColor?: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#4f46e5", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#059669", "#0d9488", "#2563eb"];
  const colorIdx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const bg = bgColor || colors[colorIdx];
  const dim = size === "lg" ? "w-24 h-24" : "w-20 h-20";
  const textSize = size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div className={`${dim} rounded-full flex items-center justify-center border-4 border-white shadow-lg`} style={{ backgroundColor: bg }}>
      <span className={`${textSize} font-bold text-white`}>{initials}</span>
    </div>
  );
}

// ===================== SINGLE CARD COMPONENT =====================

interface StudentIdCardProps {
  student: StudentIdCardData;
  school?: SchoolInfo;
  template?: IdCardTemplate;
  showBack?: boolean;
}

const StudentIdCard = ({
  student,
  school = defaultSchoolInfo,
  template = cardTemplates[0],
  showBack = false,
}: StudentIdCardProps) => {
  const accent = template.accentColor || template.secondaryColor;

  // ---- VERTICAL CARD (front) ----
  const renderVerticalFront = () => (
    <div
      className="w-[320px] h-[500px] rounded-xl overflow-hidden shadow-2xl bg-white relative flex flex-col"
      style={{ borderTop: `6px solid ${template.primaryColor}` }}
    >
      {/* Header */}
      <div className="px-4 py-3 text-white relative" style={{ background: `linear-gradient(135deg, ${template.primaryColor}, ${template.secondaryColor})` }}>
        <div className="flex items-center gap-2">
          {school.logo ? (
            <img src={school.logo} alt="" className="w-10 h-10 rounded-full bg-white/20 p-0.5 object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-sm leading-tight truncate">{school.name}</h3>
            {school.tagline && <p className="text-[9px] opacity-90 truncate">{school.tagline}</p>}
          </div>
        </div>
        <Badge variant="outline" className="absolute top-2 right-2 bg-white/10 border-white/30 text-white text-[8px] px-1.5 py-0.5">
          STUDENT ID
        </Badge>
      </div>

      {/* Photo + Name */}
      <div className="flex flex-col items-center -mt-8 relative z-10 px-4">
        {student.photoUrl ? (
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200">
            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <InitialsAvatar name={student.name} bgColor={template.primaryColor} />
        )}
        <h2 className="mt-2 font-bold text-base text-center text-gray-900 leading-tight">{student.name}</h2>
        <div className="mt-1 px-3 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: template.primaryColor }}>
          Grade {student.grade} {student.stream ? `• ${student.stream}` : ""} • Section {student.section}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 px-5 mt-3 space-y-1.5">
        {[
          { icon: Hash, label: "ID Number", value: student.studentCode },
          { icon: Calendar, label: "Academic Year", value: student.academicYear },
          ...(student.rollNumber ? [{ icon: Users, label: "Roll No.", value: student.rollNumber }] : []),
          ...(student.gender ? [{ icon: User, label: "Gender", value: student.gender }] : []),
          ...(student.bloodGroup ? [{ icon: CheckCircle, label: "Blood Group", value: student.bloodGroup }] : []),
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center text-[12px]">
            <span className="text-gray-500 flex items-center gap-1">
              <item.icon className="w-3 h-3" /> {item.label}
            </span>
            <span className="font-semibold text-gray-800">{item.value}</span>
          </div>
        ))}
      </div>

      {/* QR + Footer */}
      <div className="mt-auto">
        {template.showQR && (
          <div className="flex justify-center py-2">
            <div dangerouslySetInnerHTML={{ __html: generateQRSvg(student.studentCode, 60) }} />
          </div>
        )}
        <div className="px-3 py-2 bg-gray-50 border-t text-center">
          <p className="text-[8px] text-gray-500 flex items-center justify-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> {school.address}
          </p>
          <p className="text-[7px] text-gray-400 mt-0.5">Valid: {student.academicYear}</p>
        </div>
      </div>
    </div>
  );

  // ---- VERTICAL CARD BACK ----
  const renderVerticalBack = () => (
    <div
      className="w-[320px] h-[500px] rounded-xl overflow-hidden shadow-2xl bg-white relative flex flex-col"
      style={{ borderTop: `6px solid ${template.primaryColor}` }}
    >
      <div className="px-4 py-3 text-white text-center" style={{ background: `linear-gradient(135deg, ${template.primaryColor}, ${template.secondaryColor})` }}>
        <h3 className="font-bold text-sm">{school.name}</h3>
        <p className="text-[9px] opacity-90">Student Identity Card - Back</p>
      </div>

      <div className="flex-1 px-5 py-4 space-y-4 text-[11px]">
        {/* Emergency Contact */}
        {student.emergencyContact && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="font-bold text-red-700 text-xs mb-1">Emergency Contact</p>
            <p className="text-gray-700"><strong>{student.emergencyContact.name}</strong> ({student.emergencyContact.relation})</p>
            <p className="text-gray-600">{student.emergencyContact.phone}</p>
          </div>
        )}

        {/* Contact */}
        <div className="space-y-1.5">
          <p className="font-bold text-gray-700 text-xs">Contact Information</p>
          {student.phone && (
            <p className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" /> {student.phone}</p>
          )}
          {student.email && (
            <p className="flex items-center gap-1 text-gray-600"><Mail className="w-3 h-3" /> {student.email}</p>
          )}
          {student.address && (
            <p className="flex items-center gap-1 text-gray-600"><MapPin className="w-3 h-3" /> {student.address}</p>
          )}
        </div>

        {/* Rules */}
        <div className="space-y-1">
          <p className="font-bold text-gray-700 text-xs">Terms of Use</p>
          <ul className="text-[10px] text-gray-500 space-y-0.5 list-disc pl-3">
            <li>This card must be carried at all times on campus.</li>
            <li>Report lost cards to the school office immediately.</li>
            <li>This card is non-transferable.</li>
            <li>Misuse will result in disciplinary action.</li>
          </ul>
        </div>
      </div>

      <div className="mt-auto px-5 py-3 border-t">
        <div className="flex items-center justify-between text-[9px] text-gray-400">
          <span>{school.phone}</span>
          <span>{school.email}</span>
        </div>
        <div className="mt-2 pt-3 border-t border-dashed border-gray-200">
          <p className="text-[8px] text-gray-400 text-center">Authorized Signature</p>
          <div className="h-6 border-b border-gray-300 mt-1 w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );

  // ---- HORIZONTAL CARD ----
  const renderHorizontalCard = () => (
    <div
      className="w-[540px] h-[310px] rounded-xl overflow-hidden shadow-2xl bg-white flex"
      style={{ borderLeft: `8px solid ${template.primaryColor}` }}
    >
      {/* Left - Photo */}
      <div className="w-[180px] flex flex-col items-center justify-center p-4" style={{ background: `linear-gradient(180deg, ${template.primaryColor}08, ${template.primaryColor}15)` }}>
        {student.photoUrl ? (
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200">
            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <InitialsAvatar name={student.name} size="lg" bgColor={template.primaryColor} />
        )}
        <h3 className="mt-2 font-bold text-sm text-center text-gray-900">{student.name}</h3>
        <p className="text-[11px] text-gray-500">{student.studentCode}</p>
      </div>

      {/* Right - Details */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {school.logo ? (
              <img src={school.logo} alt="" className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                <School className="w-4 h-4 text-gray-600" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm text-gray-900">{school.name}</h3>
              {school.tagline && <p className="text-[9px] text-gray-500">{school.tagline}</p>}
            </div>
          </div>
          <Badge className="text-[9px]" style={{ backgroundColor: template.primaryColor }}>STUDENT ID</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { icon: Users, label: "Grade & Section", value: `${student.grade}${student.section}${student.stream ? ` ${student.stream}` : ""}` },
            { icon: Calendar, label: "Academic Year", value: student.academicYear },
            { icon: MapPin, label: "Address", value: student.address || school.address },
            { icon: Phone, label: "Contact", value: student.phone || school.phone },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-[11px]">
              <item.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-gray-500">{item.label}</p>
                <p className="font-semibold text-gray-800 truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between mt-2 pt-2 border-t">
          <div className="text-[9px] text-gray-500">
            {student.emergencyContact && <p>Emergency: {student.emergencyContact.name} - {student.emergencyContact.phone}</p>}
          </div>
          <div className="flex items-center gap-2">
            {template.showQR && (
              <div dangerouslySetInnerHTML={{ __html: generateQRSvg(student.studentCode, 40) }} />
            )}
            <div className="flex items-center gap-0.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[9px] font-bold text-green-600">VALID</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- COMPACT CARD ----
  const renderCompactCard = () => (
    <div
      className="w-[400px] h-[230px] rounded-lg overflow-hidden shadow-xl bg-white flex"
      style={{ borderLeft: `6px solid ${template.primaryColor}` }}
    >
      <div className="w-[110px] bg-gray-50 flex flex-col items-center justify-center p-2">
        {student.photoUrl ? (
          <div className="w-20 h-20 rounded-full border-2 border-white overflow-hidden bg-gray-200">
            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <InitialsAvatar name={student.name} size="sm" bgColor={template.primaryColor} />
        )}
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded text-white font-semibold" style={{ backgroundColor: template.primaryColor }}>STUDENT</span>
            {student.bloodGroup && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">{student.bloodGroup}</span>
            )}
          </div>
          <h3 className="font-bold text-sm text-gray-900">{student.name}</h3>
          <p className="text-[11px] text-gray-500">{student.studentCode}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">Grade/Section</span>
            <span className="font-semibold">{student.grade}-{student.section}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">Academic Year</span>
            <span className="font-semibold">{student.academicYear}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[8px] text-gray-400 pt-1 border-t">
          <span>{school.name}</span>
          {template.showQR ? (
            <div dangerouslySetInnerHTML={{ __html: generateQRSvg(student.studentCode, 28) }} />
          ) : (
            <span className="font-mono tracking-widest">{student.studentCode}</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderFront = () => {
    switch (template.type) {
      case "horizontal": return renderHorizontalCard();
      case "compact": return renderCompactCard();
      default: return renderVerticalFront();
    }
  };

  if (showBack && template.type === "vertical") {
    return (
      <div className="flex gap-6 flex-wrap justify-center">
        {renderVerticalFront()}
        {renderVerticalBack()}
      </div>
    );
  }

  return renderFront();
};

// ===================== PRINT HTML GENERATOR =====================

function generatePrintHTML(
  students: StudentIdCardData[],
  school: SchoolInfo,
  template: IdCardTemplate,
  cardsPerRow: number = 2,
): string {
  const isVertical = template.type === "vertical";
  const cardW = isVertical ? 320 : template.type === "compact" ? 400 : 540;
  const cardH = isVertical ? 500 : template.type === "compact" ? 230 : 310;

  const cards = students.map((s) => {
    const initials = s.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const colors = ["#4f46e5","#7c3aed","#db2777","#dc2626","#ea580c","#059669","#0d9488","#2563eb"];
    const colorIdx = s.name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%colors.length;

    const qr = template.showQR ? `<div style="display:flex;justify-content:center;padding:4px 0">${generateQRSvg(s.studentCode, 50)}</div>` : "";

    const details = [
      `<div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:#6b7280">ID Number</span><span style="font-weight:600">${s.studentCode}</span></div>`,
      `<div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:#6b7280">Academic Year</span><span style="font-weight:600">${s.academicYear}</span></div>`,
      s.rollNumber ? `<div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:#6b7280">Roll No.</span><span style="font-weight:600">${s.rollNumber}</span></div>` : "",
    ].filter(Boolean).join("");

    const photo = s.photoUrl
      ? `<img src="${s.photoUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15)"/>`
      : `<div style="width:80px;height:80px;border-radius:50%;background:${colors[colorIdx]};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center"><span style="font-size:28px;font-weight:bold;color:white">${initials}</span></div>`;

    if (isVertical) {
      return `<div style="width:${cardW}px;height:${cardH}px;border-radius:12px;overflow:hidden;background:white;border-top:6px solid ${template.primaryColor};display:flex;flex-direction:column;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
        <div style="padding:10px 14px;background:linear-gradient(135deg,${template.primaryColor},${template.secondaryColor});color:white;display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:16px">🎓</div>
          <div><div style="font-weight:bold;font-size:12px">${school.name}</div>${school.tagline?`<div style="font-size:8px;opacity:0.9">${school.tagline}</div>`:""}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;margin-top:-28px;position:relative;z-index:2">
          ${photo}
          <div style="margin-top:6px;font-weight:bold;font-size:14px;text-align:center;color:#111">${s.name}</div>
          <div style="margin-top:3px;padding:1px 10px;border-radius:9999px;font-size:10px;color:white;background:${template.primaryColor};font-weight:600">Grade ${s.grade} • Section ${s.section}</div>
        </div>
        <div style="padding:8px 18px;flex:1;display:flex;flex-direction:column;gap:4px">${details}</div>
        ${qr}
        <div style="padding:6px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:7px;color:#9ca3af">${school.address} | Valid: ${s.academicYear}</div>
      </div>`;
    }

    // Horizontal/Compact - simplified for print
    return `<div style="width:${cardW}px;height:${cardH}px;border-radius:10px;overflow:hidden;background:white;border-left:6px solid ${template.primaryColor};display:flex;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
      <div style="width:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;background:${template.primaryColor}08">
        ${photo}
        <div style="margin-top:6px;font-weight:bold;font-size:12px;text-align:center">${s.name}</div>
        <div style="font-size:10px;color:#6b7280">${s.studentCode}</div>
      </div>
      <div style="flex:1;padding:12px;display:flex;flex-direction:column;justify-content:space-between">
        <div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-weight:bold;font-size:12px">${school.name}</div><div style="background:${template.primaryColor};color:white;padding:2px 6px;border-radius:4px;font-size:8px;font-weight:600">STUDENT ID</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">${details}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px">
          <div style="font-size:8px;color:#9ca3af">${school.address}</div>
          ${qr ? `<div>${generateQRSvg(s.studentCode, 32)}</div>` : ""}
        </div>
      </div>
    </div>`;
  });

  const gap = 16;
  return `<!DOCTYPE html><html><head><title>Student ID Cards - ${school.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#fff}
.page{display:flex;flex-wrap:wrap;gap:${gap}px;justify-content:center;align-items:flex-start;padding:12mm;page-break-after:always}
.page:last-child{page-break-after:auto}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4;margin:8mm}
}
</style></head><body>
${(() => {
    const perPage = isVertical ? 4 : template.type === "compact" ? 6 : 2;
    let pages = "";
    for (let i = 0; i < cards.length; i += perPage) {
      pages += `<div class="page">${cards.slice(i, i + perPage).join("")}</div>`;
    }
    return pages;
  })()}
</body></html>`;
}

// ===================== MAIN GENERATOR COMPONENT =====================

interface StudentIdCardGeneratorProps {
  students?: StudentIdCardData[];
  school?: SchoolInfo;
}

export default function StudentIdCardGenerator({
  students = [defaultStudentData],
  school = defaultSchoolInfo,
}: StudentIdCardGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<IdCardTemplate>(cardTemplates[0]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [previewStudent, setPreviewStudent] = useState<StudentIdCardData>(students[0] || defaultStudentData);
  const [localSchool, setLocalSchool] = useState<SchoolInfo>(school);
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [showCardBack, setShowCardBack] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync school info if prop changes
  useState(() => { setLocalSchool(school); });
  useState(() => { if (students.length > 0) setPreviewStudent(students[0]); });

  const handlePrintAll = useCallback(() => {
    const toPrint = students.filter(
      (s) => selectedStudents.length === 0 || selectedStudents.includes(s.studentId)
    );
    if (toPrint.length === 0) {
      toast.error("No students selected");
      return;
    }
    const html = generatePrintHTML(toPrint, localSchool, selectedTemplate);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 600);
    }
  }, [students, selectedStudents, localSchool, selectedTemplate]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedStudents((prev) =>
      prev.length === students.length ? [] : students.map((s) => s.studentId)
    );
  };

  const exportTemplate = () => {
    const config = { template: selectedTemplate, school: localSchool };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `id-card-template-${selectedTemplate.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template exported!");
  };

  const importTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const config = JSON.parse(ev.target?.result as string);
        if (config.template) setSelectedTemplate({ ...selectedTemplate, ...config.template });
        if (config.school) setLocalSchool({ ...localSchool, ...config.school });
        toast.success("Template imported successfully!");
      } catch {
        toast.error("Invalid template file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const printCount = selectedStudents.length || students.length;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto p-1 bg-white dark:bg-slate-900 border rounded-xl shadow-sm">
          <TabsTrigger value="preview" className="rounded-lg gap-1.5"><Eye className="w-4 h-4" /> Preview</TabsTrigger>
          <TabsTrigger value="students" className="rounded-lg gap-1.5"><Users className="w-4 h-4" /> Students ({students.length})</TabsTrigger>
          <TabsTrigger value="school" className="rounded-lg gap-1.5"><Building2 className="w-4 h-4" /> School Info</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg gap-1.5"><Palette className="w-4 h-4" /> Templates</TabsTrigger>
        </TabsList>

        {/* ---- PREVIEW TAB ---- */}
        <TabsContent value="preview">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5" /> Card Preview
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedTemplate.type === "vertical" && (
                  <Button variant="outline" size="sm" onClick={() => setShowCardBack(!showCardBack)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    {showCardBack ? "Front Only" : "Show Back"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Preview Student Selector */}
              {students.length > 1 && (
                <div className="mb-4">
                  <Label className="text-xs text-gray-500 mb-1 block">Preview student:</Label>
                  <Select
                    value={previewStudent.studentId}
                    onValueChange={(id) => {
                      const s = students.find((x) => x.studentId === id);
                      if (s) setPreviewStudent(s);
                    }}
                  >
                    <SelectTrigger className="w-64 dark:bg-slate-800 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {students.slice(0, 50).map((s) => (
                        <SelectItem key={s.studentId} value={s.studentId}>
                          {s.name} ({s.studentCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-xl">
                <StudentIdCard
                  student={previewStudent}
                  school={localSchool}
                  template={selectedTemplate}
                  showBack={showCardBack}
                />
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={handlePrintAll} className="shadow-md">
                  <Printer className="w-4 h-4 mr-2" />
                  Print {printCount} Card{printCount !== 1 ? "s" : ""}
                </Button>
                <Button variant="outline" onClick={handlePrintAll}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- STUDENTS TAB ---- */}
        <TabsContent value="students">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-5 h-5" /> Select Students</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedStudents.length} selected</Badge>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No students available</p>
                  <p className="text-sm">Import students via Bulk Upload first, then generate ID cards.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {students.map((student) => (
                    <div
                      key={student.studentId}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedStudents.includes(student.studentId)
                          ? "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800"
                          : "hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700"
                      }`}
                      onClick={() => toggleStudent(student.studentId)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.studentId)}
                        onChange={() => toggleStudent(student.studentId)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <InitialsAvatar name={student.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium dark:text-white truncate">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.studentCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium dark:text-white">Grade {student.grade}-{student.section}</p>
                        <p className="text-xs text-gray-500">{student.academicYear}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- SCHOOL INFO TAB ---- */}
        <TabsContent value="school">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Building2 className="w-5 h-5" /> School Information</span>
                <Button variant="outline" size="sm" onClick={() => setIsEditingSchool(!isEditingSchool)}>
                  {isEditingSchool ? "Done" : "Edit"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "School Name", key: "name" as const, placeholder: "School Name" },
                  { label: "Tagline", key: "tagline" as const, placeholder: "Excellence in Education" },
                  { label: "Address", key: "address" as const, placeholder: "City, Country" },
                  { label: "Phone", key: "phone" as const, placeholder: "+000 00 000 0000" },
                  { label: "Email", key: "email" as const, placeholder: "info@school.edu" },
                  { label: "Website", key: "website" as const, placeholder: "www.school.edu" },
                ].map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      value={(localSchool as any)[field.key] || ""}
                      onChange={(e) => setLocalSchool({ ...localSchool, [field.key]: e.target.value })}
                      disabled={!isEditingSchool}
                      placeholder={field.placeholder}
                      className="dark:bg-slate-800"
                    />
                  </div>
                ))}
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Logo URL</Label>
                  <Input
                    value={localSchool.logo || ""}
                    onChange={(e) => setLocalSchool({ ...localSchool, logo: e.target.value })}
                    disabled={!isEditingSchool}
                    placeholder="https://example.com/logo.png"
                    className="dark:bg-slate-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TEMPLATES TAB ---- */}
        <TabsContent value="settings">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Palette className="w-5 h-5" /> Card Templates</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportTemplate}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1" /> Import
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importTemplate} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Grid */}
              <div>
                <Label className="text-xs text-gray-500 mb-2 block">Select Template</Label>
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                  {cardTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedTemplate.id === tmpl.id
                          ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 scale-[1.02]"
                          : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTemplate(tmpl)}
                    >
                      <div
                        className="w-full h-10 rounded-lg mb-1.5"
                        style={{ background: `linear-gradient(135deg, ${tmpl.primaryColor}, ${tmpl.secondaryColor})` }}
                      />
                      <p className="text-[10px] text-center font-semibold dark:text-white">{tmpl.name}</p>
                      <p className="text-[8px] text-center text-gray-500">{tmpl.type}</p>
                      {tmpl.showQR && <Star className="w-2.5 h-2.5 mx-auto mt-0.5 text-amber-400" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Customization */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedTemplate.primaryColor}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={selectedTemplate.primaryColor}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, primaryColor: e.target.value })}
                      className="dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Secondary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedTemplate.secondaryColor}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={selectedTemplate.secondaryColor}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, secondaryColor: e.target.value })}
                      className="dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTemplate.showQR ?? false}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, showQR: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  Show QR Code
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { StudentIdCard, cardTemplates };
