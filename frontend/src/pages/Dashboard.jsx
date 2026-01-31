import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { 
  Dumbbell, 
  Flame, 
  Target, 
  Trophy,
  Calendar,
  ChevronRight,
  TrendingUp,
  Activity,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, label, value, subValue, color }) => (
  <Card className="card-hover border-border/40 bg-card">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {label}
          </p>
          <p className="stat-value text-4xl sm:text-5xl" style={{ color }}>
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-muted-foreground mt-1">{subValue}</p>
          )}
        </div>
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, workoutsRes] = await Promise.all([
          axios.get(`${API}/stats`),
          axios.get(`${API}/recent-workouts`)
        ]);
        setStats(statsRes.data);
        setRecentWorkouts(workoutsRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
            DASHBOARD
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your fitness journey
          </p>
        </div>
        <Link to="/log">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-8"
            data-testid="log-workout-btn"
          >
            <Dumbbell className="w-5 h-5 mr-2" />
            Log Workout
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Dumbbell}
          label="Total Workouts"
          value={stats?.total_workouts || 0}
          subValue={`${stats?.workouts_this_week || 0} this week`}
          color="#007AFF"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={stats?.current_streak || 0}
          subValue={`Best: ${stats?.longest_streak || 0} days`}
          color="#FF3B30"
        />
        <StatCard
          icon={Target}
          label="Total Sets"
          value={stats?.total_sets?.toLocaleString() || 0}
          subValue={`${stats?.total_exercises_logged || 0} exercises`}
          color="#34C759"
        />
        <StatCard
          icon={Trophy}
          label="Volume (kg)"
          value={stats?.total_volume?.toLocaleString() || 0}
          subValue="Weight × Reps"
          color="#FF9500"
        />
        <StatCard
          icon={Zap}
          label="Calories Burned"
          value={stats?.total_calories?.toLocaleString() || 0}
          subValue="Estimated kcal"
          color="#A855F7"
        />
      </div>

      {/* Quick Actions & Recent Workouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 border-border/40 bg-card">
          <CardHeader>
            <CardTitle className="font-display text-xl tracking-tight">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/log" className="quick-action" data-testid="quick-log">
              <Dumbbell className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Log Workout</span>
            </Link>
            <Link to="/exercises" className="quick-action" data-testid="quick-exercises">
              <Activity className="w-6 h-6 text-[#34C759]" />
              <span className="text-sm font-medium">Exercises</span>
            </Link>
            <Link to="/progress" className="quick-action" data-testid="quick-progress">
              <TrendingUp className="w-6 h-6 text-[#FF9500]" />
              <span className="text-sm font-medium">Progress</span>
            </Link>
            <Link to="/history" className="quick-action" data-testid="quick-history">
              <Calendar className="w-6 h-6 text-[#FF3B30]" />
              <span className="text-sm font-medium">History</span>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Workouts */}
        <Card className="lg:col-span-2 border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl tracking-tight">
              Recent Workouts
            </CardTitle>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="view-all-history">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentWorkouts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No workouts yet</p>
                <p className="text-sm">Start your fitness journey today!</p>
                <Link to="/log">
                  <Button className="mt-4" variant="outline" data-testid="start-workout-btn">
                    Log Your First Workout
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map((workout, index) => (
                  <div
                    key={workout.id}
                    className={`recent-workout fade-in stagger-${index + 1}`}
                    data-testid={`recent-workout-${index}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {format(parseISO(workout.date), "EEEE, MMM d")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {workout.entries?.length || 0} exercises
                          </p>
                        </div>
                      </div>
                      <Link to="/history">
                        <Button variant="ghost" size="icon" data-testid={`view-workout-${index}`}>
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {workout.entries?.slice(0, 4).map((entry, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full badge-${entry.category === 'cardio' ? 'cardio' : 'chest'}`}
                        >
                          {entry.exercise_name}
                        </span>
                      ))}
                      {workout.entries?.length > 4 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                          +{workout.entries.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Motivational Banner */}
      <Card className="border-border/40 bg-gradient-to-r from-card to-secondary overflow-hidden">
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              CONSISTENCY IS KEY
            </h3>
            <p className="text-muted-foreground">
              {stats?.current_streak > 0 
                ? `You're on a ${stats.current_streak}-day streak! Keep pushing!`
                : "Start building your streak today. Every rep counts!"
              }
            </p>
          </div>
          <Link to="/log">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 rounded-full px-8 font-semibold"
              data-testid="banner-log-btn"
            >
              Start Training
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
