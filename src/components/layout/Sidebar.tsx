import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Users, 
  Calendar, 
  FileText, 
  UserCheck, 
  Settings, 
  LogOut,
  Stethoscope 
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: Heart },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/doctors', label: 'Doctors', icon: Stethoscope },
    { path: '/appointments', label: 'Appointments', icon: Calendar },
    { path: '/medical-records', label: 'Medical Records', icon: FileText },
  ];

  if (userProfile?.role === 'doctor') {
    menuItems.splice(2, 1); // Remove doctors menu for doctors
  }

  if (userProfile?.role === 'patient') {
    menuItems.splice(1, 2); // Remove patients and doctors menu for patients
  }

  return (
    <div className={`bg-card border-r border-border h-full flex flex-col ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <Heart className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">HealthCare EHR</h2>
            <p className="text-sm text-muted-foreground">
              {userProfile?.role === 'doctor' ? 'Doctor Portal' : 
               userProfile?.role === 'admin' ? 'Admin Portal' : 'Patient Portal'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              isActive(path)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="mb-4 p-3 bg-secondary rounded-lg">
          <p className="font-medium text-sm">{userProfile?.full_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{userProfile?.role}</p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;