import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  TrendingUp, 
  Dumbbell, 
  Timer,
  BarChart3,
  LineChart as LineChartIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { format, parseISO } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIME_RANGES = [
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "180", label: "Last 6 Months" },
  { value: "365", label: "Last Year" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-sm font-semibold mb-1">
          {label ? format(parseISO(label), "MMM d, yyyy") : ""}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toLocaleString() || 0}
            {entry.name.includes("Weight") ? " lbs" : ""}
            {entry.name.includes("Volume") ? " lbs" : ""}
            {entry.name.includes("Duration") ? " min" : ""}
            {entry.name.includes("Distance") ? " km" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Progress() {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [timeRange, setTimeRange] = useState("30");
  const [chartType, setChartType] = useState("line");
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const fetchExercises = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/exercises`);
      setExercises(res.data);
      const firstStrength = res.data.find(ex => ex.category === "strength");
      if (firstStrength) {
        setSelectedExercise(firstStrength);
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!selectedExercise) return;
      
      setLoadingProgress(true);
      try {
        const res = await axios.get(`${API}/progress/${selectedExercise.id}?days=${timeRange}`);
        setProgressData(res.data);
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setLoadingProgress(false);
      }
    };

    fetchProgress();
  }, [selectedExercise, timeRange]);

  const isCardio = selectedExercise?.category === "cardio";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in" data-testid="progress-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
          PROGRESS
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your gains over time
        </p>
      </div>

      {/* Controls */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Exercise Select */}
            <div className="flex-1">
              <Select 
                value={selectedExercise?.id || ""} 
                onValueChange={(id) => setSelectedExercise(exercises.find(ex => ex.id === id))}
              >
                <SelectTrigger className="bg-secondary border-border" data-testid="exercise-select">
                  <div className="flex items-center gap-2">
                    {selectedExercise?.category === "cardio" ? (
                      <Timer className="w-4 h-4 text-primary" />
                    ) : (
                      <Dumbbell className="w-4 h-4 text-accent" />
                    )}
                    <SelectValue placeholder="Select Exercise" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-[300px]">
                  <div className="px-2 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                    Strength
                  </div>
                  {exercises.filter(ex => ex.category === "strength").map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs uppercase tracking-widest text-muted-foreground mt-2">
                    Cardio
                  </div>
                  {exercises.filter(ex => ex.category === "cardio").map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full md:w-[180px] bg-secondary border-border" data-testid="time-range-select">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Chart Type */}
            <Tabs value={chartType} onValueChange={setChartType}>
              <TabsList className="bg-secondary" data-testid="chart-type-tabs">
                <TabsTrigger 
                  value="line"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <LineChartIcon className="w-4 h-4 mr-2" />
                  Line
                </TabsTrigger>
                <TabsTrigger 
                  value="bar"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Bar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {loadingProgress ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : progressData.length === 0 ? (
        <Card className="border-border/40 bg-card">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              No progress data yet
            </p>
            <p className="text-sm text-muted-foreground">
              Log workouts with {selectedExercise?.name || "this exercise"} to see your progress
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Chart */}
          <Card className="lg:col-span-2 border-border/40 bg-card">
            <CardHeader>
              <CardTitle className="font-display text-xl tracking-tight flex items-center gap-2">
                {isCardio ? (
                  <Timer className="w-5 h-5 text-primary" />
                ) : (
                  <Dumbbell className="w-5 h-5 text-accent" />
                )}
                {selectedExercise?.name || "Exercise"} Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]" data-testid="main-chart">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#71717A"
                        tick={{ fill: '#71717A', fontSize: 12 }}
                        tickFormatter={(value) => value ? format(parseISO(value), "MMM d") : ""}
                      />
                      <YAxis 
                        stroke="#71717A"
                        tick={{ fill: '#71717A', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {isCardio ? (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="duration" 
                            name="Duration"
                            stroke="#007AFF" 
                            strokeWidth={2}
                            dot={{ fill: '#007AFF', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="distance" 
                            name="Distance"
                            stroke="#FF3B30" 
                            strokeWidth={2}
                            dot={{ fill: '#FF3B30', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                        </>
                      ) : (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="max_weight" 
                            name="Max Weight"
                            stroke="#007AFF" 
                            strokeWidth={2}
                            dot={{ fill: '#007AFF', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="total_volume" 
                            name="Total Volume"
                            stroke="#FF3B30" 
                            strokeWidth={2}
                            dot={{ fill: '#FF3B30', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />
                        </>
                      )}
                    </LineChart>
                  ) : (
                    <BarChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#71717A"
                        tick={{ fill: '#71717A', fontSize: 12 }}
                        tickFormatter={(value) => value ? format(parseISO(value), "MMM d") : ""}
                      />
                      <YAxis 
                        stroke="#71717A"
                        tick={{ fill: '#71717A', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {isCardio ? (
                        <>
                          <Bar dataKey="duration" name="Duration" fill="#007AFF" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="distance" name="Distance" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="max_weight" name="Max Weight" fill="#007AFF" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="total_reps" name="Total Reps" fill="#34C759" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {progressData.length > 0 && (
            <>
              <Card className="border-border/40 bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg tracking-tight">
                    {isCardio ? "Best Session" : "Personal Record"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isCardio ? (
                      <>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Longest Duration
                          </p>
                          <p className="stat-value text-4xl text-primary">
                            {Math.max(...progressData.map(d => d.duration || 0))} min
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Longest Distance
                          </p>
                          <p className="stat-value text-4xl text-accent">
                            {Math.max(...progressData.map(d => d.distance || 0)).toFixed(1)} km
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Max Weight Lifted
                          </p>
                          <p className="stat-value text-4xl text-primary">
                            {Math.max(...progressData.map(d => d.max_weight || 0))} lbs
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Best Volume Session
                          </p>
                          <p className="stat-value text-4xl text-accent">
                            {Math.max(...progressData.map(d => d.total_volume || 0)).toLocaleString()} lbs
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg tracking-tight">
                    Period Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        Sessions Logged
                      </p>
                      <p className="stat-value text-4xl text-[#34C759]">
                        {progressData.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {isCardio ? "Total Distance" : "Total Reps"}
                      </p>
                      <p className="stat-value text-4xl text-[#FF9500]">
                        {isCardio 
                          ? `${progressData.reduce((sum, d) => sum + (d.distance || 0), 0).toFixed(1)} km`
                          : progressData.reduce((sum, d) => sum + (d.total_reps || 0), 0).toLocaleString()
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
