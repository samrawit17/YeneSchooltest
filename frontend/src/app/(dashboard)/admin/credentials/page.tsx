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
  Search,
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
  STUDENT: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800',
  TEACHER: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800',
  PARENT: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800',
  ADMIN: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800',
};

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<PendingCredential[]>([]);
  const [stats, setStats] = useState<CredentialStats | null>(null);
  const [loading, setLoading] = useState(true);
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
    loadData();
  }, [currentPage, statusFilter, roleFilter]);

  const loadData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  const handleMarkAsSent = async (id: string) => {
    setActionLoading(true);
    try {
      await credentialsAPI.markAsSent(id);
      toast.success('Credential marked as sent');
      loadData();
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
      loadData();
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credentials Management</h1>
            <p className="text-gray-500">View and manage generated user credentials</p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Credentials</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.total}</p>
                  </div>
                  <Key className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">Sent</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.sent}</p>
                  </div>
                  <Send className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">By Role</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stats.byRole.map((r) => (
                        <Badge key={r.role} variant="outline" className="text-xs">
                          {r.role}: {r.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="dark:text-gray-200">Search</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Search by name, username, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  <Button onClick={handleSearch} variant="secondary">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="w-[150px]">
                <Label className="dark:text-gray-200">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }}>
                  <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <Label className="dark:text-gray-200">Role</Label>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue />
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
          </CardContent>
        </Card>

        {/* Credentials Table */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">
              Credentials List ({totalItems} total)
            </CardTitle>
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
                          <Badge className={roleColors[cred.role] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}>
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
                  <Badge className={roleColors[selectedCredential.role]}>
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
