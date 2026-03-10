import { Layout } from '@/components/Layout';
import { Award, FileText, Eye, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function CoachDashboard() {
  const { isCoach, coachProfile, loading } = useCoachProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isCoach) {
      navigate('/');
    }
  }, [loading, isCoach, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto px-4 py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isCoach) return null;

  const stats = [
    { label: 'Programs', value: 0, icon: FileText },
    { label: 'Published', value: 0, icon: Eye },
    { label: 'Followers', value: 0, icon: Users },
  ];

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Coach Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome, {coachProfile?.display_name}
              {coachProfile?.is_verified && (
                <span className="inline-flex items-center ml-1 text-primary">
                  <Award className="w-3.5 h-3.5" />
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="bg-card/80">
              <CardContent className="p-4 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="bg-card/80">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
            <Button className="w-full justify-start gap-2" variant="outline" disabled>
              <Plus className="w-4 h-4" />
              Create New Program
              <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline" disabled>
              <FileText className="w-4 h-4" />
              Manage Programs
              <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
            </Button>
          </CardContent>
        </Card>

        {/* Bio Preview */}
        {coachProfile?.bio && (
          <Card className="bg-card/80">
            <CardContent className="p-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Your Bio</h2>
              <p className="text-sm">{coachProfile.bio}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
