import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, CheckCircle, Clock, TrendingUp, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export const Dashboard: React.FC = () => {
  const { societies, allAdmins } = useData();
  const navigate = useNavigate();

  const activeSocieties = societies.filter((s) => s.status === 'Active').length;
  const totalUnits = societies.reduce(
    (acc, society) => acc + society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0),
    0
  );

  const stats = [
    {
      title: 'Total Societies',
      value: societies.length,
      icon: Building2,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Active Societies',
      value: activeSocieties,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Society Admins',
      value: allAdmins.length,
      icon: Users,
      color: 'bg-purple-500',
      change: '+5%',
    },
    {
      title: 'Total Units',
      value: totalUnits,
      icon: Building2,
      color: 'bg-orange-500',
      change: '+15%',
    },
  ];

  const recentSocieties = societies.slice(0, 5);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's an overview of your societies.</p>
          </div>
          <Button onClick={() => navigate('/societies/new')}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Society
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-gray-900">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">{stat.change}</span>
                      <span className="text-xs text-gray-500">vs last month</span>
                    </div>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Societies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Societies</CardTitle>
            <Button variant="ghost" onClick={() => navigate('/societies')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSocieties.map((society) => (
              <div
                key={society.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/societies/${society.id}`)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate">{society.societyName}</p>
                    <p className="text-sm text-gray-600 truncate">{society.address}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Wings</p>
                      <p className="text-gray-900">{society.totalWings}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Units</p>
                      <p className="text-gray-900">
                        {society.wings.reduce((sum, wing) => sum + wing.totalUnits, 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Admins</p>
                      <p className="text-gray-900">{society.societyAdmins.length}</p>
                    </div>
                  </div>
                  <Badge
                    variant={society.status === 'Active' ? 'default' : 'secondary'}
                    className={
                      society.status === 'Active'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : ''
                    }
                  >
                    {society.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
