import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Users, LayoutDashboard, LogOut, ChevronDown, Plus, Eye, Edit, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import logo from '../assets/f327b419d75f4a4c0592f1b2bf0e3f99041c24be.png';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { societies } = useData();
  const [societiesMenuOpen, setSocietiesMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admins', icon: Users, label: 'Society Admins' },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src={logo} alt="GatePal" className="h-10" />
        </div>
        <p className="text-sm text-gray-500 mt-2">Super Admin Portal</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-green-50 text-green-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Societies Dropdown */}
        <DropdownMenu open={societiesMenuOpen} onOpenChange={setSocietiesMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname.startsWith('/societies')
                  ? 'bg-green-50 text-green-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="flex-1 text-left">Societies</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 ml-4">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => { 
                navigate('/societies'); 
                setSocietiesMenuOpen(false);
                setMobileMenuOpen(false); 
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View All Societies
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { 
                navigate('/societies/new'); 
                setSocietiesMenuOpen(false);
                setMobileMenuOpen(false); 
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Society
            </DropdownMenuItem>
            
            {societies.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Recent Societies</DropdownMenuLabel>
                {societies.slice(0, 5).map((society) => (
                  <DropdownMenuItem 
                    key={society.id}
                    onClick={() => { 
                      navigate(`/societies/${society.id}`); 
                      setSocietiesMenuOpen(false);
                      setMobileMenuOpen(false); 
                    }}
                  >
                    <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{society.societyName}</div>
                      <div className="text-xs text-gray-500 truncate">{society.societyPin}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3 px-2">
          <Avatar>
            <AvatarFallback className="bg-green-600 text-white">
              {user?.name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Access dashboard, societies, and admin management sections
              </SheetDescription>
              <div className="flex flex-col h-full">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
          <img src={logo} alt="GatePal" className="h-8" />
        </div>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
