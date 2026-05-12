"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { searchAPI, SearchResult } from "@/lib/api/operations";
import { 
  Search, 
  Loader2, 
  User, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  Megaphone, 
  Calendar, 
  Users, 
  School,
  DollarSign,
  Settings,
  CreditCard,
  BarChart3,
  Clock,
  MessageSquare,
  Shield,
  X,
  Lock
} from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

type SearchableEntity = 
    | 'students' 
    | 'teachers' 
    | 'parents' 
    | 'staff'
    | 'exams'
    | 'lessons'
    | 'announcements'
    | 'events'
    | 'classes'
    | 'sections'
    | 'subjects'
    | 'grades'
    | 'attendance'
    | 'payments'
    | 'messages'
    | 'finance';

interface SearchResponse {
    data: SearchResult[];
    permissions?: SearchableEntity[];
    labels?: Record<string, string>;
}

// Role-based quick links
const ROLE_QUICK_LINKS: Record<string, { label: string; href: string; icon: React.ReactNode }[]> = {
    admin: [
        { label: "Dashboard", href: "/admin", icon: <School className="h-4 w-4" /> },
        { label: "Students", href: "/list/students", icon: <GraduationCap className="h-4 w-4" /> },
        { label: "Teachers", href: "/list/teachers", icon: <Users className="h-4 w-4" /> },
        { label: "Classes", href: "/admin/class-sections", icon: <School className="h-4 w-4" /> },
        { label: "Exams", href: "/admin/assessments", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Attendance", href: "/admin/attendance", icon: <Calendar className="h-4 w-4" /> },
        { label: "Finance", href: "/list/finance", icon: <DollarSign className="h-4 w-4" /> },
        { label: "Announcements", href: "/list/announcements", icon: <Megaphone className="h-4 w-4" /> },
    ],
    it_manager: [
        { label: "Dashboard", href: "/it-manager", icon: <School className="h-4 w-4" /> },
        { label: "Teachers", href: "/list/teachers", icon: <Users className="h-4 w-4" /> },
        { label: "Classes", href: "/admin/class-sections", icon: <School className="h-4 w-4" /> },
        { label: "Timetable", href: "/admin/timetable", icon: <Calendar className="h-4 w-4" /> },
        { label: "Assignments", href: "/admin/assignments", icon: <Users className="h-4 w-4" /> },
        { label: "Siren", href: "/admin/siren-management", icon: <Settings className="h-4 w-4" /> },
        { label: "Announcements", href: "/list/announcements", icon: <Megaphone className="h-4 w-4" /> },
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher", icon: <School className="h-4 w-4" /> },
        { label: "My Classes", href: "/teacher/my-class", icon: <School className="h-4 w-4" /> },
        { label: "Grade Entry", href: "/teacher/grading", icon: <BookOpen className="h-4 w-4" /> },
        { label: "Attendance", href: "/teacher/attendance", icon: <Calendar className="h-4 w-4" /> },
        { label: "Lessons", href: "/teacher/lessons", icon: <BookOpen className="h-4 w-4" /> },
    ],
    student: [
        { label: "Dashboard", href: "/student", icon: <School className="h-4 w-4" /> },
        { label: "My Grades", href: "/student/grades", icon: <BookOpen className="h-4 w-4" /> },
        { label: "Schedule", href: "/student/schedule", icon: <Calendar className="h-4 w-4" /> },
        { label: "Announcements", href: "/list/announcements", icon: <Megaphone className="h-4 w-4" /> },
    ],
    parent: [
        { label: "Dashboard", href: "/parent", icon: <School className="h-4 w-4" /> },
        { label: "Children", href: "/parent/children", icon: <Users className="h-4 w-4" /> },
        { label: "Grades", href: "/parent/grades", icon: <BookOpen className="h-4 w-4" /> },
        { label: "Attendance", href: "/parent/children", icon: <Calendar className="h-4 w-4" /> },
        { label: "Payments", href: "/list/finance", icon: <CreditCard className="h-4 w-4" /> },
    ],
    finance: [
        { label: "Dashboard", href: "/list/finance", icon: <DollarSign className="h-4 w-4" /> },
        { label: "Payments", href: "/list/finance", icon: <CreditCard className="h-4 w-4" /> },
        { label: "Students", href: "/list/students", icon: <GraduationCap className="h-4 w-4" /> },
    ],
    registrar: [
        { label: "Dashboard", href: "/registrar", icon: <School className="h-4 w-4" /> },
        { label: "Students", href: "/list/students", icon: <GraduationCap className="h-4 w-4" /> },
        { label: "Grading", href: "/registrar/grading", icon: <BookOpen className="h-4 w-4" /> },
        { label: "Bulk Upload", href: "/admin/bulk-upload", icon: <Users className="h-4 w-4" /> },
    ],
};

// Compact icons mapping
const typeIcons: Record<string, React.ReactNode> = {
    student: <GraduationCap className="h-3.5 w-3.5 shrink-0" />,
    teacher: <User className="h-3.5 w-3.5 shrink-0" />,
    parent: <Users className="h-3.5 w-3.5 shrink-0" />,
    staff: <User className="h-3.5 w-3.5 shrink-0" />,
    exam: <ClipboardList className="h-3.5 w-3.5 shrink-0" />,
    lesson: <BookOpen className="h-3.5 w-3.5 shrink-0" />,
    announcement: <Megaphone className="h-3.5 w-3.5 shrink-0" />,
    event: <Calendar className="h-3.5 w-3.5 shrink-0" />,
    class: <School className="h-3.5 w-3.5 shrink-0" />,
    section: <Users className="h-3.5 w-3.5 shrink-0" />,
    subject: <BookOpen className="h-3.5 w-3.5 shrink-0" />,
    grade: <BarChart3 className="h-3.5 w-3.5 shrink-0" />,
    attendance: <Clock className="h-3.5 w-3.5 shrink-0" />,
    payment: <CreditCard className="h-3.5 w-3.5 shrink-0" />,
    message: <MessageSquare className="h-3.5 w-3.5 shrink-0" />,
    finance: <DollarSign className="h-3.5 w-3.5 shrink-0" />,
};

const typeLabels: Record<string, string> = {
    student: "Students",
    teacher: "Teachers",
    parent: "Parents",
    staff: "Staff",
    exam: "Exams",
    lesson: "Lessons",
    announcement: "Announcements",
    event: "Calendar",
    class: "Classes",
    section: "Sections",
    subject: "Subjects",
    grade: "Grades",
    attendance: "Attendance",
    payment: "Payments",
    message: "Messages",
    finance: "Finance",
};

interface GlobalSearchProps {
    shortcut?: string;
}

export function GlobalSearch({ shortcut = "⌘K" }: GlobalSearchProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [labels, setLabels] = useState<Record<string, string>>({});
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    // Needed for portal to work
    useEffect(() => {
        setMounted(true);
    }, []);

    // Get role key for quick links
    const roleKey = useMemo(() => {
        const role = user?.role?.toLowerCase() || 'admin';
        if (role === 'super_admin') return 'admin';
        return role;
    }, [user?.role]);

    // Quick links based on role
    const quickLinks = ROLE_QUICK_LINKS[roleKey] || ROLE_QUICK_LINKS.admin;

    // Fetch permissions on mount
    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await searchAPI.globalSearch('');
                const data = response.data as SearchResponse;
                if (data.permissions) {
                    setPermissions(data.permissions);
                }
                if (data.labels) {
                    setLabels(data.labels);
                }
            } catch (error) {
                console.error("Failed to fetch search permissions:", error);
            }
        };
        fetchPermissions();
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideWrapper = wrapperRef.current?.contains(target);
            const clickedInsideDropdown = dropdownRef.current?.contains(target);

            if (!clickedInsideWrapper && !clickedInsideDropdown) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle keyboard shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
            if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Search when query changes
    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await searchAPI.globalSearch(query);
                console.log('Search response:', response.data);
                const searchResults = response.data as SearchResponse;
                setResults(searchResults.data || []);
                if (searchResults.permissions) {
                    setPermissions(searchResults.permissions);
                }
                if (searchResults.labels) {
                    setLabels(searchResults.labels);
                }
            } catch (error) {
                console.error("Search error:", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        setOpen(false);
        setQuery("");
        router.push(result.href);
    };

    const handleQuickLink = (href: string) => {
        setOpen(false);
        setQuery("");
        router.push(href);
    };

    // Get allowed navigation links based on role and query
    const navigationResults = useMemo(() => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        const links = ROLE_QUICK_LINKS[user?.role?.toLowerCase() || ""] || [];
        
        return links
            .filter(link => 
                link.label.toLowerCase().includes(lowerQuery) || 
                link.href.toLowerCase().includes(lowerQuery)
            )
            .map(link => ({
                id: `nav-${link.href}`,
                type: 'nav' as any,
                title: link.label,
                subtitle: `Navigate to ${link.label}`,
                href: link.href,
                icon: link.icon
            }));
    }, [query, user?.role]);

    // Group results by type
    const groupedResults = useMemo(() => {
        const acc: Record<string, any[]> = {};
        
        // Add navigation results first
        if (navigationResults.length > 0) {
            acc['navigation'] = navigationResults;
        }

        if (Array.isArray(results)) {
            results.forEach((result) => {
                if (!acc[result.type]) {
                    acc[result.type] = [];
                }
                acc[result.type].push(result);
            });
        }
        return acc;
    }, [results, navigationResults]);

    // Get allowed entity types for the user's role
    const allowedEntities = [
        { key: 'students', icon: <GraduationCap className="h-3 w-3" />, label: 'Students' },
        { key: 'teachers', icon: <User className="h-3 w-3" />, label: 'Teachers' },
        { key: 'parents', icon: <Users className="h-3 w-3" />, label: 'Parents' },
        { key: 'staff', icon: <User className="h-3 w-3" />, label: 'Staff' },
        { key: 'exams', icon: <ClipboardList className="h-3 w-3" />, label: 'Exams' },
        { key: 'lessons', icon: <BookOpen className="h-3 w-3" />, label: 'Lessons' },
        { key: 'classes', icon: <School className="h-3 w-3" />, label: 'Classes' },
        { key: 'sections', icon: <Users className="h-3 w-3" />, label: 'Sections' },
        { key: 'subjects', icon: <BookOpen className="h-3 w-3" />, label: 'Subjects' },
        { key: 'grades', icon: <BarChart3 className="h-3 w-3" />, label: 'Grades' },
        { key: 'attendance', icon: <Clock className="h-3 w-3" />, label: 'Attendance' },
        { key: 'announcements', icon: <Megaphone className="h-3 w-3" />, label: 'Announcements' },
        { key: 'events', icon: <Calendar className="h-3 w-3" />, label: 'Calendar' },
        { key: 'payments', icon: <CreditCard className="h-3 w-3" />, label: 'Payments' },
        { key: 'messages', icon: <MessageSquare className="h-3 w-3" />, label: 'Messages' },
        { key: 'finance', icon: <DollarSign className="h-3 w-3" />, label: 'Finance' },
    ].filter(entity => permissions.includes(entity.key));

    return (
        <div ref={wrapperRef} className="relative z-[9998] w-full mx-auto flex items-center md:h-10 lg:h-10 font-sans">
            <Command 
                className="overflow-visible bg-transparent w-full" 
                shouldFilter={false}
            >
                <div 
                    className="flex items-center w-full h-9 sm:h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111827] overflow-hidden focus-within:border-[var(--brand-color,#e35336)] dark:focus-within:border-[var(--brand-color,#e35336)] shadow-sm transition-all duration-200 focus-within:shadow-inner" 
                    cmdk-input-wrapper=""
                >
                    <div className="pl-4 pr-2 text-gray-500 flex-shrink-0 cursor-pointer" onClick={() => inputRef.current?.focus()}>
                        <Search className="h-4 w-4" />
                    </div>

                    <CommandPrimitive.Input
                        ref={inputRef}
                        placeholder={`Search ${allowedEntities.slice(0, 3).map(e => e.label.toLowerCase()).join(', ')}...`}
                        value={query}
                        onValueChange={(val) => {
                            setQuery(val);
                            if (val.trim() !== "") setOpen(true);
                        }}
                        onFocus={() => {
                            if (query.trim() !== "" || allowedEntities.length > 0) setOpen(true);
                        }}
                        className="flex-1 h-full bg-transparent border-0 px-4 sm:px-2 outline-none text-sm placeholder:text-gray-500"
                    />

                    {query && (
                        <button 
                            type="button"
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
                            onClick={() => {
                                setQuery("");
                                inputRef.current?.focus();
                            }}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {open && mounted && createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed left-0 right-0 mx-auto w-full max-w-2xl z-[9999] bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: '60px' }}
                    >
                        <CommandList className="max-h-[60vh] overflow-y-auto">
                            {/* Empty state - show quick links and search hints */}
                            {!query && (
                                <div className="py-2">
                                    {/* Search scope indicator */}
                                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Shield className="h-3 w-3" />
                                            <span>Searching within your permissions</span>
                                            <div className="flex-1" />
                                            <Badge variant="outline" className="text-xs">
                                                {user?.role?.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Quick links */}
                                    <div className="px-4 py-2">
                                        <p className="text-xs font-semibold text-gray-400 mb-2">Quick Links</p>
                                        <div className="flex flex-wrap gap-2">
                                             {quickLinks.slice(0, 6).map((link) => (
                                                <CommandItem
                                                    key={link.href}
                                                    onSelect={() => handleQuickLink(link.href)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer border-none"
                                                >
                                                    {link.icon}
                                                    {link.label}
                                                </CommandItem>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Available search categories */}
                                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-xs font-semibold text-gray-400 mb-2">You can search</p>
                                        <div className="flex flex-wrap gap-2">
                                            {allowedEntities.slice(0, 8).map((entity) => (
                                                <div
                                                    key={entity.key}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
                                                >
                                                    {entity.icon}
                                                    {entity.label}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Search results */}
                            {query && (
                                <div>
                                    {loading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                        </div>
                                    ) : results.length === 0 ? (
                                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                                            <p>No results found for "{query}"</p>
                                            <p className="text-xs mt-1">Try searching with different keywords</p>
                                        </div>
                                    ) : (
                                        <CommandGroup>
                                            {Object.entries(groupedResults).map(([type, items]) => (
                                                <div key={type}>
                                                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 uppercase">
                                                        {type === 'navigation' ? 'Actions & Pages' : (typeLabels[type] || type)}
                                                    </div>
                                                    {items.map((result) => (
                                                        <CommandItem
                                                            key={result.id}
                                                            onSelect={() => handleSelect(result)}
                                                            className="w-full px-4 py-2 cursor-pointer text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 border-none data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-gray-800"
                                                        >
                                                            {result.type === 'nav' ? result.icon : (typeIcons[result.type] || <Search className="h-4 w-4" />)}
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium dark:text-white">{result.title}</span>
                                                                {result.subtitle && <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{result.subtitle}</span>}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </div>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </div>
                            )}
                        </CommandList>
                    </div>,
                    document.body
                )}
            </Command>
        </div>
    );
}
