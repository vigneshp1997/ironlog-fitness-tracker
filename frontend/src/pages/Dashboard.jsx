import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Dumbbell, Flame, Target, Trophy, Calendar, ChevronRight, TrendingUp, Activity, Zap, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, parseISO, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DATE_PRESETS = [
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
  { value: "ytd", label: "Year to Date", days: null },
  { value: "all", label: "All Time", days: null },
  { value: "custom", label: "Custom Range", days: null },
];

const StatCard = ({ icon: Icon, label, value, subValue, color, trend }) => (
  <Card className="card-hover border-border/40 bg-card">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
          <p className="stat-value text-3xl sm:text-4xl" style={{ color }}>{value}</p>
          {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold mb-2">{label ? format(parseISO(label), "MMM d, yyyy") : ""}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            {entry.name === "Volume" ? " kg" : ""}
            {entry.name === "Calories" ? " kcal" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("30d");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const getDateRange = useCallback(() => {
    const today = new Date();
    let start = null;
    let end = format(today, "yyyy-MM-dd");

    if (datePreset === "custom" && startDate && endDate) {
      return { start: format(startDate, "yyyy-MM-dd"), end: format(endDate, "yyyy-MM-dd") };
    }

    const preset = DATE_PRESETS.find(p => p.value === datePreset);
    if (preset && preset.days) {
      start = format(subDays(today, preset.days), "yyyy-MM-dd");
    } else if (datePreset === "ytd") {
      start = format(startOfYear(today), "yyyy-MM-dd");
    } else if (datePreset === "all") {
      start = null;
      end = null;
    }

    return { start, end };
  }, [datePreset, startDate, endDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams();
      if (start) params.append("start_date", start);
      if (end) params.append("end_date", end);

      const [statsRes, trendsRes, workoutsRes] = await Promise.all([
        axios.get(`${API}/stats?${params.toString()}`),
        axios.get(`${API}/trends?${params.toString()}`),
        axios.get(`${API}/recent-workouts`)
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setRecentWorkouts(workoutsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePresetChange = (value) => {
    setDatePreset(value);
    if (value !== "custom") {
      setStartDate(null);
      setEndDate(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in" data-testid="dashboard">
      {/* Header with Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">DASHBOARD</h1>
          <p className="text-muted-foreground mt-2">Track your fitness journey</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Preset Selector */}
          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[160px] bg-secondary border-border" data-testid="date-preset-select">
              <CalendarDays className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {DATE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <Popover open={showStartPicker} onOpenChange={setShowStartPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal text-sm", !startDate && "text-muted-foreground")} data-testid="start-date-btn">
                    {startDate ? format(startDate, "MMM d, yyyy") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <CalendarComponent mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setShowStartPicker(false); }} initialFocus />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover open={showEndPicker} onOpenChange={setShowEndPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal text-sm", !endDate && "text-muted-foreground")} data-testid="end-date-btn">
                    {endDate ? format(endDate, "MMM d, yyyy") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <CalendarComponent mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setShowEndPicker(false); }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Link to="/log">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-6" data-testid="log-workout-btn">
              <Dumbbell className="w-5 h-5 mr-2" />Log Workout
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Dumbbell} label="Workouts" value={stats?.total_workouts || 0} subValue={`${stats?.workouts_this_week || 0} this week`} color="#007AFF" />
        <StatCard icon={Flame} label="Streak" value={stats?.current_streak || 0} subValue={`Best: ${stats?.longest_streak || 0}`} color="#FF3B30" />
        <StatCard icon={Target} label="Sets" value={stats?.total_sets?.toLocaleString() || 0} subValue={`${stats?.total_exercises_logged || 0} exercises`} color="#34C759" />
        <StatCard icon={Trophy} label="Volume" value={`${(stats?.total_volume / 1000)?.toFixed(1) || 0}k`} subValue="kg lifted" color="#FF9500" />
        <StatCard icon={Zap} label="Calories" value={stats?.total_calories?.toLocaleString() || 0} subValue="kcal burned" color="#A855F7" />
      </div>

      {/* Trend Charts */}
      {trends.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calories Trend */}
          <Card className="border-border/40 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#A855F7]" />Calories Burned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]" data-testid="calories-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="date" stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(v) => v ? format(parseISO(v), "MMM d") : ""} />
                    <YAxis stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="calories" name="Calories" stroke="#A855F7" strokeWidth={2} fill="url(#caloriesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Trend */}
          <Card className="border-border/40 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FF9500]" />Volume (kg)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]" data-testid="volume-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9500" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF9500" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="date" stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(v) => v ? format(parseISO(v), "MMM d") : ""} />
                    <YAxis stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="volume" name="Volume" stroke="#FF9500" strokeWidth={2} fill="url(#volumeGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sets Trend */}
          <Card className="border-border/40 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg tracking-tight flex items-center gap-2">
                <Target className="w-5 h-5 text-[#34C759]" />Sets Per Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]" data-testid="sets-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="setsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34C759" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="date" stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(v) => v ? format(parseISO(v), "MMM d") : ""} />
                    <YAxis stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sets" name="Sets" stroke="#34C759" strokeWidth={2} fill="url(#setsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Workouts Trend */}
          <Card className="border-border/40 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg tracking-tight flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#007AFF]" />Workouts Per Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]" data-testid="workouts-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="workoutsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="date" stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={(v) => v ? format(parseISO(v), "MMM d") : ""} />
                    <YAxis stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="workouts" name="Workouts" stroke="#007AFF" strokeWidth={2} fill="url(#workoutsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Data Message */}
      {trends.length === 0 && (
        <Card className="border-border/40 bg-card">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No workout data for this period</p>
            <p className="text-sm text-muted-foreground">Log workouts to see your trends</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Workouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 border-border/40 bg-card">
          <CardHeader><CardTitle className="font-display text-xl tracking-tight">Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/log" className="quick-action" data-testid="quick-log"><Dumbbell className="w-6 h-6 text-primary" /><span className="text-sm font-medium">Log Workout</span></Link>
            <Link to="/exercises" className="quick-action" data-testid="quick-exercises"><Activity className="w-6 h-6 text-[#34C759]" /><span className="text-sm font-medium">Exercises</span></Link>
            <Link to="/progress" className="quick-action" data-testid="quick-progress"><TrendingUp className="w-6 h-6 text-[#FF9500]" /><span className="text-sm font-medium">Progress</span></Link>
            <Link to="/history" className="quick-action" data-testid="quick-history"><Calendar className="w-6 h-6 text-[#FF3B30]" /><span className="text-sm font-medium">History</span></Link>
          </CardContent>
        </Card>

        {/* Recent Workouts */}
        <Card className="lg:col-span-2 border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl tracking-tight">Recent Workouts</CardTitle>
            <Link to="/history"><Button variant="ghost" size="sm" className="text-primary" data-testid="view-all-history">View All <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </CardHeader>
          <CardContent>
            {recentWorkouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No workouts yet</p>
                <Link to="/log"><Button className="mt-3" variant="outline" data-testid="start-workout-btn">Log Your First Workout</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map((workout, index) => (
                  <div key={workout.id} className={`recent-workout fade-in stagger-${index + 1}`} data-testid={`recent-workout-${index}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
                        <div>
                          <p className="font-semibold">{format(parseISO(workout.date), "EEEE, MMM d")}</p>
                          <p className="text-sm text-muted-foreground">{workout.entries?.length || 0} exercises</p>
                        </div>
                      </div>
                      <Link to="/history"><Button variant="ghost" size="icon" data-testid={`view-workout-${index}`}><ChevronRight className="w-5 h-5" /></Button></Link>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {workout.entries?.slice(0, 4).map((entry, i) => (
                        <span key={i} className={`text-xs px-2 py-1 rounded-full badge-${entry.category === 'cardio' ? 'cardio' : 'chest'}`}>{entry.exercise_name}</span>
                      ))}
                      {workout.entries?.length > 4 && <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">+{workout.entries.length - 4} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
