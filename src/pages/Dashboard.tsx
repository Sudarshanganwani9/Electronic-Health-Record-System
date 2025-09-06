import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, FileText, Activity, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  totalRecords: number;
}

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    totalRecords: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats based on user role
      if (userProfile?.role === 'admin') {
        await fetchAdminStats();
      } else if (userProfile?.role === 'doctor') {
        await fetchDoctorStats();
      } else {
        await fetchPatientStats();
      }
      
      await fetchRecentAppointments();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    const [patientsResult, appointmentsResult, recordsResult] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact' }),
      supabase.from('appointments').select('id', { count: 'exact' }),
      supabase.from('medical_records').select('id', { count: 'exact' }),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = await supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('appointment_date', today);

    setStats({
      totalPatients: patientsResult.count || 0,
      totalAppointments: appointmentsResult.count || 0,
      todayAppointments: todayAppointments.count || 0,
      totalRecords: recordsResult.count || 0,
    });
  };

  const fetchDoctorStats = async () => {
    // For doctors, show their appointments and patients
    const doctorProfile = await supabase
      .from('doctors')
      .select('id')
      .eq('profile_id', userProfile?.id)
      .single();

    if (doctorProfile.data) {
      const [appointmentsResult, recordsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('doctor_id', doctorProfile.data.id),
        supabase
          .from('medical_records')
          .select('id', { count: 'exact' })
          .eq('doctor_id', doctorProfile.data.id),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('doctor_id', doctorProfile.data.id)
        .eq('appointment_date', today);

      setStats({
        totalPatients: 0,
        totalAppointments: appointmentsResult.count || 0,
        todayAppointments: todayAppointments.count || 0,
        totalRecords: recordsResult.count || 0,
      });
    }
  };

  const fetchPatientStats = async () => {
    // For patients, show their appointments and records
    const patientProfile = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', userProfile?.id)
      .single();

    if (patientProfile.data) {
      const [appointmentsResult, recordsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('patient_id', patientProfile.data.id),
        supabase
          .from('medical_records')
          .select('id', { count: 'exact' })
          .eq('patient_id', patientProfile.data.id),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('patient_id', patientProfile.data.id)
        .eq('appointment_date', today);

      setStats({
        totalPatients: 0,
        totalAppointments: appointmentsResult.count || 0,
        todayAppointments: todayAppointments.count || 0,
        totalRecords: recordsResult.count || 0,
      });
    }
  };

  const fetchRecentAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          patients!inner(
            profiles!inner(full_name)
          ),
          doctors!inner(
            profiles!inner(full_name),
            specialization
          )
        `)
        .order('appointment_date', { ascending: true })
        .limit(5);

      // Filter by role
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

      const { data } = await query;
      setRecentAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const getStatCards = () => {
    const baseCards = [
      {
        title: 'Today\'s Appointments',
        value: stats.todayAppointments,
        icon: Clock,
        description: 'Scheduled for today',
        color: 'text-primary',
      },
      {
        title: 'Total Appointments',
        value: stats.totalAppointments,
        icon: Calendar,
        description: 'All appointments',
        color: 'text-accent',
      },
      {
        title: 'Medical Records',
        value: stats.totalRecords,
        icon: FileText,
        description: 'Total records',
        color: 'text-muted-foreground',
      },
    ];

    if (userProfile?.role === 'admin') {
      baseCards.unshift({
        title: 'Total Patients',
        value: stats.totalPatients,
        icon: Users,
        description: 'Registered patients',
        color: 'text-primary',
      });
    }

    return baseCards;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {userProfile?.full_name}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your {userProfile?.role === 'admin' ? 'healthcare system' : 'health'} today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {getStatCards().map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Appointments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
            <CardDescription>
              Your upcoming and recent appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentAppointments.length > 0 ? (
              <div className="space-y-4">
                {recentAppointments.map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {userProfile?.role === 'patient' 
                            ? `Dr. ${appointment.doctors.profiles.full_name}`
                            : appointment.patients.profiles.full_name
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.appointment_date} at {appointment.appointment_time}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'scheduled' ? 'bg-primary/10 text-primary' :
                      appointment.status === 'completed' ? 'bg-accent/10 text-accent' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No recent appointments</p>
            )}
            <Button asChild className="w-full mt-4">
              <Link to="/appointments">View All Appointments</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to perform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {userProfile?.role === 'admin' && (
                <>
                  <Button asChild variant="outline" className="justify-start">
                    <Link to="/patients">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Patients
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start">
                    <Link to="/doctors">
                      <Activity className="h-4 w-4 mr-2" />
                      Manage Doctors
                    </Link>
                  </Button>
                </>
              )}
              <Button asChild variant="outline" className="justify-start">
                <Link to="/appointments">
                  <Calendar className="h-4 w-4 mr-2" />
                  {userProfile?.role === 'patient' ? 'Book Appointment' : 'Manage Appointments'}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/medical-records">
                  <FileText className="h-4 w-4 mr-2" />
                  View Medical Records
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;