import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Calendar, User, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface MedicalRecord {
  id: string;
  record_date: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  medications: string;
  lab_results: string;
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

const MedicalRecords = () => {
  const { userProfile } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [recordForm, setRecordForm] = useState({
    patientId: '',
    appointmentId: '',
    recordDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    symptoms: '',
    treatment: '',
    medications: '',
    labResults: '',
    notes: '',
  });

  useEffect(() => {
    fetchMedicalRecords();
    if (userProfile?.role === 'doctor') {
      fetchDoctorData();
    }
  }, [userProfile]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('medical_records')
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
        .order('record_date', { ascending: false });

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
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast.error('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorData = async () => {
    try {
      const doctorProfile = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', userProfile?.id)
        .single();

      if (doctorProfile.data) {
        // Fetch doctor's appointments and patients
        const [appointmentsResult, patientsResult] = await Promise.all([
          supabase
            .from('appointments')
            .select(`
              id,
              appointment_date,
              appointment_time,
              patients!inner(
                id,
                profiles!inner(full_name)
              )
            `)
            .eq('doctor_id', doctorProfile.data.id)
            .eq('status', 'completed')
            .order('appointment_date', { ascending: false }),
          supabase
            .from('appointments')
            .select(`
              patients!inner(
                id,
                profiles!inner(full_name)
              )
            `)
            .eq('doctor_id', doctorProfile.data.id)
        ]);

        setAppointments(appointmentsResult.data || []);
        
        // Extract unique patients
        const uniquePatients = Array.from(
          new Map(
            (patientsResult.data || []).map(app => [
              app.patients.id, 
              app.patients
            ])
          ).values()
        );
        setPatients(uniquePatients);
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const doctorProfile = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', userProfile?.id)
        .single();

      if (!doctorProfile.data) {
        toast.error('Doctor profile not found');
        return;
      }

      const { error } = await supabase
        .from('medical_records')
        .insert({
          patient_id: recordForm.patientId,
          doctor_id: doctorProfile.data.id,
          appointment_id: recordForm.appointmentId || null,
          record_date: recordForm.recordDate,
          diagnosis: recordForm.diagnosis,
          symptoms: recordForm.symptoms,
          treatment: recordForm.treatment,
          medications: recordForm.medications,
          lab_results: recordForm.labResults,
          notes: recordForm.notes,
        });

      if (error) throw error;

      toast.success('Medical record created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchMedicalRecords();
    } catch (error) {
      console.error('Error creating medical record:', error);
      toast.error('Failed to create medical record');
    }
  };

  const resetForm = () => {
    setRecordForm({
      patientId: '',
      appointmentId: '',
      recordDate: new Date().toISOString().split('T')[0],
      diagnosis: '',
      symptoms: '',
      treatment: '',
      medications: '',
      labResults: '',
      notes: '',
    });
  };

  const filteredRecords = records.filter(record =>
    record.patients.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.symptoms?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (userProfile?.role === 'patient' && records.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Medical Records</h1>
          <p className="text-muted-foreground">Your health history and treatment records</p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No medical records yet</h3>
              <p className="text-muted-foreground">
                Your medical records will appear here after doctor visits and treatments.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Medical Records</h1>
          <p className="text-muted-foreground">
            {userProfile?.role === 'patient' ? 'Your health history and treatment records' :
             userProfile?.role === 'doctor' ? 'Patient medical records and treatment history' :
             'Manage all medical records'}
          </p>
        </div>
        {userProfile?.role === 'doctor' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Medical Record</DialogTitle>
                <DialogDescription>
                  Document patient consultation and treatment details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientId">Patient</Label>
                    <Select
                      value={recordForm.patientId}
                      onValueChange={(value) => setRecordForm({ ...recordForm, patientId: value })}
                      required
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

                  <div className="space-y-2">
                    <Label htmlFor="appointmentId">Related Appointment (Optional)</Label>
                    <Select
                      value={recordForm.appointmentId}
                      onValueChange={(value) => setRecordForm({ ...recordForm, appointmentId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointments.map((appointment) => (
                          <SelectItem key={appointment.id} value={appointment.id}>
                            {appointment.patients.profiles.full_name} - {appointment.appointment_date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recordDate">Record Date</Label>
                  <Input
                    id="recordDate"
                    type="date"
                    value={recordForm.recordDate}
                    onChange={(e) => setRecordForm({ ...recordForm, recordDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    value={recordForm.symptoms}
                    onChange={(e) => setRecordForm({ ...recordForm, symptoms: e.target.value })}
                    placeholder="Patient reported symptoms..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea
                    id="diagnosis"
                    value={recordForm.diagnosis}
                    onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                    placeholder="Clinical diagnosis and assessment..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatment">Treatment</Label>
                  <Textarea
                    id="treatment"
                    value={recordForm.treatment}
                    onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })}
                    placeholder="Treatment plan and procedures..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Medications</Label>
                  <Textarea
                    id="medications"
                    value={recordForm.medications}
                    onChange={(e) => setRecordForm({ ...recordForm, medications: e.target.value })}
                    placeholder="Prescribed medications and dosage..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="labResults">Lab Results</Label>
                  <Textarea
                    id="labResults"
                    value={recordForm.labResults}
                    onChange={(e) => setRecordForm({ ...recordForm, labResults: e.target.value })}
                    placeholder="Laboratory test results..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                    placeholder="Additional observations and notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Record</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search medical records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {userProfile?.role === 'patient' 
                        ? `Dr. ${record.doctors.profiles.full_name}`
                        : record.patients.profiles.full_name
                      }
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(record.record_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <Stethoscope className="h-4 w-4 mr-1" />
                        {record.doctors.specialization}
                      </span>
                    </CardDescription>
                  </div>
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {record.symptoms && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Symptoms</h4>
                    <p className="text-sm">{record.symptoms}</p>
                  </div>
                )}

                {record.diagnosis && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Diagnosis</h4>
                    <p className="text-sm">{record.diagnosis}</p>
                  </div>
                )}

                {record.treatment && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Treatment</h4>
                    <p className="text-sm">{record.treatment}</p>
                  </div>
                )}

                {record.medications && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Medications</h4>
                    <p className="text-sm">{record.medications}</p>
                  </div>
                )}

                {record.lab_results && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Lab Results</h4>
                    <p className="text-sm">{record.lab_results}</p>
                  </div>
                )}

                {record.notes && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>
                    <p className="text-sm">{record.notes}</p>
                  </div>
                )}

                {userProfile?.role === 'doctor' && (
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm">
                      Edit Record
                    </Button>
                    <Button variant="outline" size="sm">
                      Print
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredRecords.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No medical records found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search criteria.' 
                  : 'Medical records will appear here after patient consultations.'}
              </p>
              {userProfile?.role === 'doctor' && !searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Record
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MedicalRecords;