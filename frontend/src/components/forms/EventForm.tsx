'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI, CreateEventDto, Event } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calendar } from 'lucide-react';

interface EventFormProps {
  initialData?: Event;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const eventTypes = [
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'EXTRACURRICULAR', label: 'Extracurricular' },
  { value: 'ADMINISTRATIVE', label: 'Administrative' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'OTHER', label: 'Other' },
];

const EventForm = ({ initialData, onSuccess, onCancel }: EventFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateEventDto>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : '',
    allDay: initialData?.allDay || false,
    eventType: initialData?.eventType || 'ACADEMIC',
  });

  const isEditing = !!initialData;

  const createMutation = useMutation({
    mutationFn: (data: CreateEventDto) => eventsAPI.create(data),
    onSuccess: () => {
      toast.success('Event created successfully');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create event');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateEventDto }) =>
      eventsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Event updated successfully');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update event');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startDate) {
      toast.error('Please fill in required fields');
      return;
    }

    const submitData = {
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
    };

    if (isEditing && initialData) {
      updateMutation.mutate({ id: initialData.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter event title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter event description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventType">Event Type *</Label>
        <Select
          value={formData.eventType}
          onValueChange={(value: any) => setFormData({ ...formData, eventType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Enter event location"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date & Time *</Label>
          <div className="relative">
            <Input
              id="startDate"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date & Time</Label>
          <div className="relative">
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allDay"
          checked={formData.allDay}
          onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="allDay" className="cursor-pointer">
          All Day Event
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};

export default EventForm;
