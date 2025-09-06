import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Search, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  reason: string;
  notes: string;
  patients: {
    profiles: {
      full_name: string;
    };
  };
  doctors: {
    profiles: {
      full_name: string;
    };
    specialization: string;
  };
}

const Appointments = () => {
  const { userProfile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: '30',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    fetchAppointments();
    if (userProfile?.role === 'admin') {
      fetchDoctorsAndPatients();
    }
  }, [userProfile]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(
            profiles!inner(full_name)
          ),
          doctors!inner(
            profiles!inner(full_name),
            specialization
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      // Filter by user role
      if (userProfile?.role === 'doctor') {
        const doctorProfile = await supabase
          .from('doctors')
          .select('id')
          .eq('profile_id', userProfile?.id)
          .single();
        
        if (doctorProfile.data) {
          query = query.eq('doctor_id', doctorProfile.data.id);
        }
      } else if (userProfile?.role === 'patient') {
        const patientProfile = await supabase
          .from('patients')
          .select('id')
          .eq('profile_id', userProfile?.id)
          .single();
        
        if (patientProfile.data) {
          query = query.eq('patient_id', patientProfile.data.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorsAndPatients = async () => {
    try {
      const [doctorsResult, patientsResult] = await Promise.all([
        supabase
          .from('doctors')
          .select('id, profiles!inner(full_name), specialization'),
        supabase
          .from('patients')
          .select('id, profiles!inner(full_name)')
      ]);

      setDoctors(doctorsResult.data || []);
      setPatients(patientsResult.data || []);
    } catch (error) {
      console.error('Error fetching doctors and patients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let patientId = appointmentForm.patientId;
      let doctorId = appointmentForm.doctorId;

      // If patient is booking, use their own ID
      if (userProfile?.role === 'patient') {
        const patientProfile = await supabase
          .from('patients')
          .select('id')
          .eq('profile_id', userProfile?.id)
          .single();
        
        if (patientProfile.data) {
          patientId = patientProfile.data.id;
        }
      }

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: appointmentForm.appointmentDate,
          appointment_time: appointmentForm.appointmentTime,
          duration_minutes: parseInt(appointmentForm.duration),
          reason: appointmentForm.reason,
          notes: appointmentForm.notes,
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success('Appointment scheduled successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to schedule appointment');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(`Appointment ${newStatus} successfully`);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const resetForm = () => {
    setAppointmentForm({
      patientId: '',
      doctorId: '',
      appointmentDate: '',
      appointmentTime: '',
      duration: '30',
      reason: '',
      notes: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary/10 text-primary';
      case 'completed': return 'bg-accent/10 text-accent';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      case 'no_show': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.patients.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctors.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground">
            {userProfile?.role === 'patient' ? 'Manage your appointments' : 
             userProfile?.role === 'doctor' ? 'Your appointment schedule' : 
             'Manage all appointments'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              {userProfile?.role === 'patient' ? 'Book Appointment' : 'Schedule Appointment'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {userProfile?.role === 'patient' ? 'Book New Appointment' : 'Schedule New Appointment'}
              </DialogTitle>
              <DialogDescription>
                Fill in the appointment details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {userProfile?.role !== 'patient' && (
                <div className="space-y-2">
                  <Label htmlFor="patientId">Patient</Label>
                  <Select
                    value={appointmentForm.patientId}
                    onValueChange={(value) => setAppointmentForm({ ...appointmentForm, patientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor</Label>
                <Select
                  value={appointmentForm.doctorId}
                  onValueChange={(value) => setAppointmentForm({ ...appointmentForm, doctorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.profiles.full_name} - {doctor.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointmentDate">Date</Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  value={appointmentForm.appointmentDate}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointmentTime">Time</Label>
                <Input
                  id="appointmentTime"
                  type="time"
                  value={appointmentForm.appointmentTime}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={appointmentForm.duration}
                  onValueChange={(value) => setAppointmentForm({ ...appointmentForm, duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Visit</Label>
                <Input
                  id="reason"
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                  placeholder="Brief description of visit purpose"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                  placeholder="Any additional information..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {userProfile?.role === 'patient' ? 'Book Appointment' : 'Schedule Appointment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium text-lg">
                            {userProfile?.role === 'patient' 
                              ? `Dr. ${appointment.doctors.profiles.full_name}`
                              : appointment.patients.profiles.full_name
                            }
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {userProfile?.role === 'patient' 
                              ? appointment.doctors.specialization
                              : `Patient appointment`
                            }
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{appointment.appointment_time} ({appointment.duration_minutes} min)</span>
                      </div>
                      {appointment.reason && (
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">Reason:</span>
                          <span>{appointment.reason}</span>
                        </div>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {appointment.notes}
                      </div>
                    )}
                  </div>

                  {(userProfile?.role === 'doctor' || userProfile?.role === 'admin') && 
                   appointment.status === 'scheduled' && (
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredAppointments.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No appointments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search criteria.' 
                  : 'Get started by scheduling your first appointment.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {userProfile?.role === 'patient' ? 'Book Your First Appointment' : 'Schedule First Appointment'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Appointments;