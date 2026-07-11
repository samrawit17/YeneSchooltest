'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from "@/hooks/useTranslations";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { formatUserDisplayCode } from "@/lib/student-code";
import { credentialsAPI, PendingCredential, CredentialStats } from '@/lib/api/admin';
import { authAPI, userAPI } from '@/lib/api/auth';
import type { User } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Pagination from '@/components/Pagination';
import { 
  Key, 
  Users, 
  CheckCircle, 
  Clock, 
  Mail,
  Copy,
  Trash2,
  Send,
  UserPlus,
  GraduationCap,
  BookOpen,
  UserCheck,
  Loader2,
  Search,
  ShieldAlert,
  EyeOff,
  Pencil
} from 'lucide-react';

const roleIcons: Record<string, React.ReactNode> = {
  STUDENT: <GraduationCap className="w-4 h-4" />,
  TEACHER: <BookOpen className="w-4 h-4" />,
  PARENT: <UserCheck className="w-4 h-4" />,
  ADMIN: <UserPlus className="w-4 h-4" />,
};

const roleColors: Record<string, string> = {
  STUDENT: 'text-blue-700 dark:text-blue-400',
  TEACHER: 'text-green-700 dark:text-green-400',
  PARENT: 'text-purple-700 dark:text-purple-400',
  ADMIN: 'text-orange-700 dark:text-orange-400',
};

export default function CredentialsPage() {
  const { t } = useTranslations<any>("credentials");
  const { currentAcademicYear, formattedYearLabel } = useAcademicYear();
  const displayYear = String(currentAcademicYear?.ethiopianYear || currentAcademicYear?.name || formattedYearLabel || "");
  const [credentials, setCredentials] = useState<PendingCredential[]>([]);
  const [stats, setStats] = useState<CredentialStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  // Filters
  const [statusFilter, setStatusFilter] = useState<'pending' | 'sent' | 'all'>('pending');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<PendingCredential | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Reset password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ user: User; tempPassword: string } | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [selectedResetUser, setSelectedResetUser] = useState<User | null>(null);

  const selectResetUser = (user: User) => {
    setSelectedResetUser(user);
    setSearchResults([user]);
    setUserSearch(user.name || user.username || user.email || '');
  };

  useEffect(() => {
    loadData(false);
  }, [currentPage, statusFilter, roleFilter]);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [credRes, statsRes] = await Promise.all([
        credentialsAPI.list({
          status: statusFilter,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          search: searchTerm || undefined,
          page: currentPage,
          limit: pageSize,
        }),
        credentialsAPI.getStats(),
      ]);

      setCredentials(credRes.data?.data || []);
      setStats(statsRes.data);
      
      const meta = credRes.data?.meta;
      if (meta) {
        setTotalPages(meta.totalPages);
        setTotalItems(meta.total);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t.toasts.loadFailed);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadDataRef.current(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleMarkAsSent = async (id: string) => {
    setActionLoading(true);
    try {
      await credentialsAPI.markAsSent(id);
      toast.success(t.toasts.markedAsSent);
      loadData(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t.toasts.updateFailed);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.toasts.deleteConfirm)) return;
    
    setActionLoading(true);
    try {
      await credentialsAPI.delete(id);
      toast.success(t.toasts.deleted);
      loadData(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t.toasts.deleteFailed);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.toasts.copied.replace("{label}", label));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const viewCredential = (credential: PendingCredential) => {
    setSelectedCredential(credential);
    setViewDialogOpen(true);
  };

  const handleSearchUsers = async () => {
    const search = userSearch.trim();
    if (!search) {
      setSearchResults([]);
      setSelectedResetUser(null);
      return;
    }
    if (selectedResetUser && search === (selectedResetUser.name || selectedResetUser.username || selectedResetUser.email || '')) {
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await authAPI.getUsers({ search, limit: 20 });
      setSearchResults(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      toast.error(t.toasts.searchFailed);
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    if (!resetDialogOpen || resetResult) return;

    const search = userSearch.trim();
    if (!search) {
      setSearchResults([]);
      setSelectedResetUser(null);
      setSearchingUsers(false);
      return;
    }
    if (selectedResetUser && search !== (selectedResetUser.name || selectedResetUser.username || selectedResetUser.email || '')) {
      setSelectedResetUser(null);
    }

    const timer = setTimeout(() => {
      handleSearchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch, resetDialogOpen, resetResult]);

  const handleResetUserPassword = async (user: User) => {
    const nextPassword = temporaryPassword.trim();
    if (!nextPassword) {
      toast.error(t.toasts.enterPassword);
      return;
    }

    setResettingUserId(user.id);
    try {
      const res = await userAPI.adminResetUserPassword(user.id, nextPassword);
      setResetResult({ user, tempPassword: res.data.temporaryPassword });
      toast.success(t.toasts.resetSuccess);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t.toasts.resetFailed);
    } finally {
      setResettingUserId(null);
    }
  };

  const openResetDialog = () => {
    setResetDialogOpen(true);
    setUserSearch('');
    setSearchResults([]);
    setSelectedResetUser(null);
    setResetResult(null);
    setTemporaryPassword('');
  };

  const openResetDialogForCredential = (credential: PendingCredential) => {
    if (!credential.userId) {
      toast.error(t.toasts.noUserLink);
      return;
    }

    setResetDialogOpen(true);
    setUserSearch(credential.username);
    setSearchResults([
      {
        id: credential.userId,
        email: credential.email || '',
        username: credential.username,
        name: credential.name,
        role: credential.role as User['role'],
        schoolId: credential.schoolId,
      },
    ]);
    const resetUser = {
      id: credential.userId,
      email: credential.email || '',
      username: credential.username,
      name: credential.name,
      role: credential.role as User['role'],
      schoolId: credential.schoolId,
    };
    setSelectedResetUser(resetUser);
    setSearchResults([resetUser]);
    setResetResult(null);
    setTemporaryPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] p-3 sm:p-6">
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white">{t.title}</h1>
            <p className="text-sm text-gray-500">{t.description}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={openResetDialog} variant="outline" className="w-full sm:w-auto">
              <ShieldAlert className="w-4 h-4 mr-2" />
              {t.resetPassword}
            </Button>
          </div>
        </div>



        {/* Credentials Table */}
        <Card className="dark:bg-[#111111] dark:border-[#2A2A2A]">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-base sm:text-lg dark:text-white">
                {t.listTitle.replace("{total}", String(totalItems))}
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[350px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t.filters.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 w-full pl-10 dark:bg-[#1A1A1A] dark:border-[#2A2A2A] dark:text-white"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-full sm:w-[120px] dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
                    <SelectValue placeholder={t.filters.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.filters.all}</SelectItem>
                    <SelectItem value="pending">{t.filters.pending}</SelectItem>
                    <SelectItem value="sent">{t.filters.sent}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-full sm:w-[130px] dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
                    <SelectValue placeholder={t.filters.role} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.filters.allRoles}</SelectItem>
                    <SelectItem value="STUDENT">{t.filters.roles.STUDENT}</SelectItem>
                    <SelectItem value="TEACHER">{t.filters.roles.TEACHER}</SelectItem>
                    <SelectItem value="PARENT">{t.filters.roles.PARENT}</SelectItem>
                    <SelectItem value="ADMIN">{t.filters.roles.ADMIN}</SelectItem>
                    <SelectItem value="IT_MANAGER">{t.filters.roles.IT_MANAGER}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[var(--brand-color,#e35336)]" />
              </div>
            ) : credentials.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Key className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">{t.empty}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="w-full min-w-[640px]">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-[#1A1A1A]">
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t.table.name}</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t.table.username}</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t.table.role}</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t.table.status}</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t.table.created}</TableHead>
                      <TableHead className="py-3 px-4 text-right font-semibold text-gray-600 dark:text-gray-300">{t.table.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credentials.map((cred) => (
                      <TableRow key={cred.id} className="border-b dark:border-[#2A2A2A] hover:bg-gray-50 dark:hover:bg-[#1A1A1A]/50">
                        <TableCell className="py-3 px-4">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{cred.name}</p>
                            {cred.email && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{cred.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <code className="bg-gray-100 dark:bg-[#1A1A1A] px-2 py-1 rounded text-sm text-gray-800 dark:text-gray-200">
                            {formatUserDisplayCode(cred.username, displayYear)}
                          </code>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className={roleColors[cred.role] || 'text-gray-700 dark:text-gray-300'}>
                            {roleIcons[cred.role]}
                            <span className="ml-1">{t.filters.roles[cred.role] || cred.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {cred.isSent ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t.badges.sent}
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                              <Clock className="w-3 h-3 mr-1" />
                              {t.badges.pending}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(cred.createdAt)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="sm" onClick={() => viewCredential(cred)} className="h-8 w-8 p-0">
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openResetDialogForCredential(cred)}
                              disabled={actionLoading}
                              title={t.actions.editPassword}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </Button>
                            {!cred.isSent && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleMarkAsSent(cred.id)}
                                disabled={actionLoading}
                                className="h-8 w-8 p-0"
                              >
                                <Send className="w-4 h-4 text-green-500" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(cred.id)}
                              disabled={actionLoading}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex justify-end">
                    <Pagination
                      page={currentPage}
                      setPage={setCurrentPage}
                      totalPages={totalPages}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Credential Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] dark:bg-[#111111] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="dark:text-white text-base sm:text-lg">{t.viewDialog.title}</DialogTitle>
          </DialogHeader>
          {selectedCredential && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center shrink-0">
                  {roleIcons[selectedCredential.role]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold dark:text-white text-sm sm:text-base break-words">{selectedCredential.name}</p>
                  <Badge variant="outline" className={roleColors[selectedCredential.role]}>
                    {t.filters.roles[selectedCredential.role] || selectedCredential.role}
                  </Badge>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#1A1A1A] rounded-lg p-3 sm:p-4 space-y-3">
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">{t.viewDialog.username}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 min-w-0 bg-white dark:bg-[#2A2A2A] px-2 sm:px-3 py-2 rounded border dark:border-gray-600 dark:text-white text-xs sm:text-sm break-all leading-relaxed">
                      {formatUserDisplayCode(selectedCredential.username, displayYear)}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(selectedCredential.username, t.viewDialog.username)}
                      className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">{t.viewDialog.tempPassword}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 min-w-0 bg-white dark:bg-[#2A2A2A] px-2 sm:px-3 py-2 rounded border dark:border-gray-600 dark:text-white text-xs sm:text-sm break-all leading-relaxed">
                      {selectedCredential.temporaryPassword}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(selectedCredential.temporaryPassword, t.viewDialog.tempPassword)}
                      className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>

                {selectedCredential.email && (
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">{t.viewDialog.email}</Label>
                    <p className="font-medium dark:text-white text-sm break-all mt-1">{selectedCredential.email}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">{t.viewDialog.created}</Label>
                    <p className="text-xs sm:text-sm dark:text-gray-300 mt-1">{formatDate(selectedCredential.createdAt)}</p>
                  </div>

                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">{t.viewDialog.expires}</Label>
                    <p className="text-xs sm:text-sm dark:text-gray-300 mt-1">{formatDate(selectedCredential.expiresAt)}</p>
                  </div>
                </div>

                {selectedCredential.isSent && (
                  <div className="pt-2 border-t dark:border-gray-600">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      <span className="break-words">{t.viewDialog.sentVia.replace("{via}", selectedCredential.sentVia || "").replace("{date}", selectedCredential.sentAt ? formatDate(selectedCredential.sentAt) : "")}</span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            {!selectedCredential?.isSent && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (selectedCredential) {
                    handleMarkAsSent(selectedCredential.id);
                    setViewDialogOpen(false);
                  }
                }}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                <Send className="w-4 h-4 mr-2" />
                {t.actions.markAsSent}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setViewDialogOpen(false)} className="w-full sm:w-auto">
              {t.actions.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] dark:bg-[#111111] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="dark:text-white text-base sm:text-lg">{t.resetDialog.title}</DialogTitle>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-green-800 dark:text-green-300 text-sm sm:text-base">{t.resetDialog.success}</p>
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 break-words mt-1">
                    {t.resetDialog.user.replace("{name}", resetResult.user.name).replace("{email}", resetResult.user.email || resetResult.user.username || "")}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#1A1A1A] rounded-lg p-3 sm:p-4 space-y-3">
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">{t.resetDialog.username}</Label>
                  <code className="block mt-1 bg-white dark:bg-[#2A2A2A] px-2 sm:px-3 py-2 rounded border dark:border-gray-600 dark:text-white text-xs sm:text-sm break-all">
                    {resetResult.user.username || resetResult.user.email}
                  </code>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-xs">{t.resetDialog.tempPassword}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 min-w-0 bg-white dark:bg-[#2A2A2A] px-2 sm:px-3 py-2 rounded border dark:border-gray-600 dark:text-white font-mono text-xs sm:text-sm break-all leading-relaxed">
                      {resetResult.tempPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(resetResult.tempPassword, 'Password')}
                      className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <EyeOff className="w-3 h-3 flex-shrink-0" />
                    {t.resetDialog.copyWarning}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={() => { setResetDialogOpen(false); setResetResult(null); }} className="w-full sm:w-auto">
                  {t.actions.done}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-search" className="dark:text-gray-300 text-xs">{t.resetDialog.searchUser}</Label>
                <div className="relative">
                  {searchingUsers ? (
                    <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--brand-color,#e35336)]" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  )}
                  <Input
                    id="user-search"
                    placeholder={t.resetDialog.searchPlaceholder}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 dark:bg-[#1A1A1A] dark:border-[#2A2A2A] dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temporary-password" className="dark:text-gray-300 text-xs">{t.resetDialog.newPassword}</Label>
                <Input
                  id="temporary-password"
                  type="text"
                  placeholder={t.resetDialog.passwordPlaceholder}
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  className="font-mono dark:bg-[#1A1A1A] dark:border-[#2A2A2A] dark:text-white text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.resetDialog.passwordHint}
                </p>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-40 sm:max-h-64 overflow-y-auto space-y-1">
                  {searchResults.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => selectResetUser(user)}
                      className={`flex w-full items-center justify-between rounded-lg border p-2.5 sm:p-3 text-left transition-colors dark:border-[#2A2A2A] ${
                        selectedResetUser?.id === user.id
                          ? 'border-[var(--brand-color,#e35336)] bg-[rgba(var(--brand-color-rgb),0.10)] dark:bg-[rgba(var(--brand-color-rgb),0.18)]'
                          : 'hover:bg-gray-50 dark:hover:bg-[#1A1A1A]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm dark:text-white truncate">{user.name}</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.username || user.email} &middot; {t.filters.roles[user.role] || user.role}
                        </p>
                      </div>
                      <span className="ml-2 text-[11px] sm:text-xs font-semibold text-[var(--brand-color,#e35336)] shrink-0">
                        {selectedResetUser?.id === user.id ? t.resetDialog.selected : t.resetDialog.select}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedResetUser && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 sm:p-3 text-xs sm:text-sm dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/60">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedResetUser.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedResetUser.username || selectedResetUser.email} &middot; {t.filters.roles[selectedResetUser.role] || selectedResetUser.role}
                  </p>
                </div>
              )}

              {searchResults.length === 0 && userSearch.trim() && !searchingUsers && (
                <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-6 sm:py-8">
                  {t.resetDialog.noUsers}
                </p>
              )}

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="secondary" onClick={() => setResetDialogOpen(false)} className="w-full sm:w-auto">
                  {t.actions.cancel}
                </Button>
                <Button
                  onClick={() => selectedResetUser && handleResetUserPassword(selectedResetUser)}
                  disabled={!selectedResetUser || !temporaryPassword.trim() || resettingUserId === selectedResetUser?.id}
                  className="w-full sm:w-auto"
                >
                  {resettingUserId === selectedResetUser?.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {t.resetDialog.resetPassword}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
