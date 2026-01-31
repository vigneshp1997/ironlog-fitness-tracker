import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Calendar, 
  Dumbbell, 
  Timer,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [deleteWorkout, setDeleteWorkout] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const res = await axios.get(`${API}/workouts?limit=100`);
      setWorkouts(res.data);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      toast.error("Failed to load workouts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteWorkout) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/workouts/${deleteWorkout.id}`);
      setWorkouts(workouts.filter(w => w.id !== deleteWorkout.id));
      toast.success("Workout deleted");
      setDeleteWorkout(null);
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error("Failed to delete workout");
    } finally {
      setDeleting(false);
    }
  };

  const workoutDates = new Set(workouts.map(w => w.date?.split("T")[0]));
  
  const filteredWorkouts = selectedDate 
    ? workouts.filter(w => w.date?.startsWith(format(selectedDate, "yyyy-MM-dd")))
    : workouts;

  const calculateWorkoutStats = (workout) => {
    let totalSets = 0;
    let totalVolume = 0;
    let totalDuration = 0;
    let totalDistance = 0;

    workout.entries?.forEach(entry => {
      entry.sets?.forEach(set => {
        totalSets++;
        if (set.weight && set.reps) {
          totalVolume += set.weight * set.reps;
        }
        if (set.duration_minutes) {
          totalDuration += set.duration_minutes;
        }
        if (set.distance_km) {
          totalDistance += set.distance_km;
        }
      });
    });

    return { totalSets, totalVolume, totalDuration, totalDistance };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in" data-testid="history-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
            WORKOUT HISTORY
          </h1>
          <p className="text-muted-foreground mt-2">
            {workouts.length} workouts logged
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                data-testid="date-filter-btn"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasWorkout: (date) => workoutDates.has(format(date, "yyyy-MM-dd"))
                }}
                modifiersStyles={{
                  hasWorkout: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                    textDecorationColor: 'hsl(var(--primary))'
                  }
                }}
                data-testid="history-calendar"
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(null)}
              data-testid="clear-filter-btn"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Workouts List */}
      {filteredWorkouts.length === 0 ? (
        <Card className="border-border/40 bg-card">
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              {selectedDate ? "No workouts on this date" : "No workouts logged yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedDate ? "Try selecting a different date" : "Start logging your training sessions!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorkouts.map((workout, index) => {
            const stats = calculateWorkoutStats(workout);
            const isExpanded = expandedWorkout === workout.id;
            
            return (
              <Card 
                key={workout.id}
                className={`border-border/40 bg-card fade-in stagger-${(index % 5) + 1}`}
                data-testid={`workout-card-${index}`}
              >
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {format(parseISO(workout.date), "EEEE, MMMM d, yyyy")}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{workout.entries?.length || 0} exercises</span>
                          <span>{stats.totalSets} sets</span>
                          {stats.totalVolume > 0 && (
                            <span>{stats.totalVolume.toLocaleString()} kg volume</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteWorkout(workout);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid={`delete-workout-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t border-border/40">
                    <div className="space-y-4 pt-4">
                      {workout.entries?.map((entry, entryIndex) => (
                        <div 
                          key={entryIndex}
                          className="workout-entry"
                          data-testid={`workout-entry-${index}-${entryIndex}`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              entry.category === "cardio" ? "bg-primary/20" : "bg-accent/20"
                            }`}>
                              {entry.category === "cardio" ? (
                                <Timer className="w-4 h-4 text-primary" />
                              ) : (
                                <Dumbbell className="w-4 h-4 text-accent" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{entry.exercise_name}</p>
                              <Badge variant="secondary" className={`text-xs badge-${entry.category === 'cardio' ? 'cardio' : 'chest'}`}>
                                {entry.category}
                              </Badge>
                            </div>
                          </div>

                          <div className="ml-11 space-y-1">
                            {entry.sets?.map((set, setIndex) => (
                              <div 
                                key={setIndex}
                                className="flex items-center gap-4 text-sm py-1 border-b border-border/20 last:border-0"
                              >
                                <span className="w-12 text-muted-foreground">
                                  Set {set.set_number}
                                </span>
                                {entry.category === "cardio" ? (
                                  <>
                                    {set.duration_minutes > 0 && (
                                      <span>{set.duration_minutes} min</span>
                                    )}
                                    {set.distance_km > 0 && (
                                      <span>{set.distance_km} km</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {set.weight > 0 && (
                                      <span className="font-semibold">{set.weight} lbs</span>
                                    )}
                                    {set.reps > 0 && (
                                      <span>× {set.reps} reps</span>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {workout.notes && (
                        <div className="pt-4 border-t border-border/40">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                            Notes
                          </p>
                          <p className="text-sm">{workout.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWorkout} onOpenChange={() => setDeleteWorkout(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
              Delete Workout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your workout from{" "}
              {deleteWorkout && format(parseISO(deleteWorkout.date), "MMMM d, yyyy")}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="confirm-delete-btn"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
