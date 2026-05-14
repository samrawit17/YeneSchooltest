'use client';

import { useState, useEffect } from 'react';
import { credentialsAPI, PendingCredential, CredentialStats } from '@/lib/api/admin';
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
  RefreshCw,
  Copy,
  Trash2,
  Send,
  UserPlus,
  GraduationCap,
  BookOpen,
  UserCheck,
  Loader2
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
      toast.error(error?.response?.data?.message || 'Failed to load credentials');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadData(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleMarkAsSent = async (id: string) => {
    setActionLoading(true);
    try {
      await credentialsAPI.markAsSent(id);
      toast.success('Credential marked as sent');
      loadData(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    
    setActionLoading(true);
    try {
      await credentialsAPI.delete(id);
      toast.success('Credential deleted');
      loadData(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Credentials Management</h1>
            <p className="text-gray-500">View and manage generated user credentials</p>
          </div>
          <Button onClick={() => loadData(false)} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>



        {/* Credentials Table */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-lg dark:text-white">
                Credentials List ({totalItems} total)
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Search by name, username, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 w-[350px] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[120px] dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[130px] dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="PARENT">Parent</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="IT_MANAGER">IT Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : credentials.length === 0 ? (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No credentials found</p>
              </div>
            ) : (
              <>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-slate-800">
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Name</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Username</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Role</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Status</TableHead>
                      <TableHead className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Created</TableHead>
                      <TableHead className="py-3 px-4 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credentials.map((cred) => (
                      <TableRow key={cred.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <TableCell className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{cred.name}</p>
                            {cred.email && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{cred.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-sm text-gray-800 dark:text-gray-200">
                            {cred.username}
                          </code>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className={roleColors[cred.role] || 'text-gray-700 dark:text-gray-300'}>
                            {roleIcons[cred.role]}
                            <span className="ml-1">{cred.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {cred.isSent ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Sent
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(cred.createdAt)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewCredential(cred)}>
                              <Key className="w-4 h-4" />
                            </Button>
                            {!cred.isSent && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleMarkAsSent(cred.id)}
                                disabled={actionLoading}
                              >
                                <Send className="w-4 h-4 text-green-500" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(cred.id)}
                              disabled={actionLoading}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4">
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
        <DialogContent className="max-w-md dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Credential Details</DialogTitle>
          </DialogHeader>
          {selectedCredential && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                  {roleIcons[selectedCredential.role]}
                </div>
                <div>
                  <p className="font-semibold dark:text-white">{selectedCredential.name}</p>
                  <Badge variant="outline" className={roleColors[selectedCredential.role]}>
                    {selectedCredential.role}
                  </Badge>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-gray-500 dark:text-gray-400">Username</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-slate-700 px-3 py-2 rounded border dark:border-slate-600 dark:text-white">
                      {selectedCredential.username}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(selectedCredential.username, 'Username')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500 dark:text-gray-400">Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-slate-700 px-3 py-2 rounded border dark:border-slate-600 dark:text-white">
                      {selectedCredential.temporaryPassword}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(selectedCredential.temporaryPassword, 'Password')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedCredential.email && (
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400">Email</Label>
                    <p className="font-medium dark:text-white">{selectedCredential.email}</p>
                  </div>
                )}

                <div>
                  <Label className="text-gray-500 dark:text-gray-400">Created</Label>
                  <p className="text-sm dark:text-gray-300">{formatDate(selectedCredential.createdAt)}</p>
                </div>

                <div>
                  <Label className="text-gray-500 dark:text-gray-400">Expires</Label>
                  <p className="text-sm dark:text-gray-300">{formatDate(selectedCredential.expiresAt)}</p>
                </div>

                {selectedCredential.isSent && (
                  <div className="pt-2 border-t dark:border-slate-600">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Sent via {selectedCredential.sentVia}
                      {selectedCredential.sentAt && ` on ${formatDate(selectedCredential.sentAt)}`}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
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
              >
                <Send className="w-4 h-4 mr-2" />
                Mark as Sent
              </Button>
            )}
            <Button variant="secondary" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
