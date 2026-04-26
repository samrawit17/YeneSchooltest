'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Plus, DollarSign, Edit, Trash2 } from 'lucide-react';
import { hrAPI } from '@/lib/api';

interface SalaryStructure {
  id: string;
  employeeRole: string;
  grade?: number;
  baseSalary: number;
  housingAllowance: number;
  foodAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  taxRate: number;
  pensionRate: number;
  effectiveFrom: string;
}

export default function SalaryStructurePage() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: 'TEACHER',
    baseSalary: 0,
    houseAllowance: 0,
    medicalAllowance: 0,
    otherAllowances: 0,
    pensionRate: 0,
    taxRate: 0,
  });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      const response = await hrAPI.getSalaryStructures();
      setStructures(response.data);
    } catch (error) {
      console.error('Failed to fetch salary structures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrAPI.createSalaryStructure(formData);
      fetchStructures();
      setShowForm(false);
      setFormData({
        name: '',
        position: 'TEACHER',
        baseSalary: 0,
        houseAllowance: 0,
        medicalAllowance: 0,
        otherAllowances: 0,
        pensionRate: 0,
        taxRate: 0,
      });
    } catch (error) {
      console.error('Failed to create salary structure:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary structure?')) return;
    try {
      await hrAPI.deleteSalaryStructure(id);
      fetchStructures();
    } catch (error) {
      console.error('Failed to delete salary structure:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Brr ${amount.toLocaleString()}`;
  };

  const calculateTotal = (s: SalaryStructure) => {
    return s.baseSalary + s.housingAllowance + 
           s.foodAllowance + s.medicalAllowance + s.otherAllowances;
  };

  return (
    <div className="space-y-6 mx-4 lg:mx-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Salary Structure</h1>
          <p className="text-gray-500 mt-1">Configure pay grades for different positions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Salary Grade
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Salary Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Position *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                    <option value="REGISTRAR">Registrar</option>
                    <option value="HR">HR</option>
                    <option value="FINANCE">Finance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Base Salary *</Label>
                  <Input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Housing Allowance</Label>
                  <Input
                    type="number"
                    value={formData.houseAllowance}
                    onChange={(e) => setFormData({ ...formData, houseAllowance: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medical Allowance</Label>
                  <Input
                    type="number"
                    value={formData.medicalAllowance}
                    onChange={(e) => setFormData({ ...formData, medicalAllowance: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Allowances</Label>
                  <Input
                    type="number"
                    value={formData.otherAllowances}
                    onChange={(e) => setFormData({ ...formData, otherAllowances: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pension Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.pensionRate}
                    onChange={(e) => setFormData({ ...formData, pensionRate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Structure</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Salary Structures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : structures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No salary structures configured yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Housing</TableHead>
                  <TableHead>Medical</TableHead>
                  <TableHead>Other</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Pension %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map((structure) => (
                  <TableRow key={structure.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{structure.employeeRole}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(structure.baseSalary)}</TableCell>
                    <TableCell>{formatCurrency(structure.housingAllowance)}</TableCell>
                    <TableCell>{formatCurrency(structure.medicalAllowance)}</TableCell>
                    <TableCell>{formatCurrency(structure.otherAllowances)}</TableCell>
                    <TableCell>{structure.taxRate}%</TableCell>
                    <TableCell>{structure.pensionRate}%</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(calculateTotal(structure))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
