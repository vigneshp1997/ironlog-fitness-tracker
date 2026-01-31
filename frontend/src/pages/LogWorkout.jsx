import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Plus, 
  Trash2, 
  Save, 
  Dumbbell,
  Timer,
  Search,
  X,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MUSCLE_GROUPS = [
  { value: "all", label: "All Muscles" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full Body" },
  { value: "cardio", label: "Cardio" },
];

function SetRow({ set, isCardio, onUpdate, onRemove, canRemove, entryIdx, setIdx }) {
  return (
    <div 
      className="grid gap-2 items-center"
      style={{
        gridTemplateColumns: "60px 1fr 1fr auto"
      }}
      data-testid={`set-row-${entryIdx}-${setIdx}`}
    >
      <span className="text-sm font-semibold text-center bg-secondary rounded px-2 py-2">
        {set.set_number}
      </span>
      {isCardio ? (
        <>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={set.duration_minutes || ""}
            onChange={(e) => onUpdate("duration_minutes", parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="bg-secondary border-border"
            data-testid={`duration-input-${entryIdx}-${setIdx}`}
          />
          <Input
            type="number"
            min="0"
            step="0.1"
            value={set.distance_km || ""}
            onChange={(e) => onUpdate("distance_km", parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="bg-secondary border-border"
            data-testid={`distance-input-${entryIdx}-${setIdx}`}
          />
        </>
      ) : (
        <>
          <Input
            type="number"
            min="0"
            step="2.5"
            value={set.weight || ""}
            onChange={(e) => onUpdate("weight", parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="bg-secondary border-border"
            data-testid={`weight-input-${entryIdx}-${setIdx}`}
          />
          <Input
            type="number"
            min="0"
            value={set.reps || ""}
            onChange={(e) => onUpdate("reps", parseInt(e.target.value) || 0)}
            placeholder="0"
            className="bg-secondary border-border"
            data-testid={`reps-input-${entryIdx}-${setIdx}`}
          />
        </>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        className="text-muted-foreground hover:text-destructive"
        data-testid={`remove-set-${entryIdx}-${setIdx}`}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ExerciseEntry({ entry, entryIndex, onRemove, onAddSet, onRemoveSet, onUpdateSet }) {
  const isCardio = entry.category === "cardio";
  
  return (
    <Card 
      className="border-border/40 bg-card overflow-hidden"
      data-testid={`exercise-entry-${entryIndex}`}
    >
      <CardHeader className="bg-secondary/50 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isCardio ? "bg-primary/20" : "bg-accent/20"
            }`}>
              {isCardio ? (
                <Timer className="w-5 h-5 text-primary" />
              ) : (
                <Dumbbell className="w-5 h-5 text-accent" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {entry.exercise_name}
              </CardTitle>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {entry.category}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive hover:text-destructive hover:bg-destructive/20"
            data-testid={`remove-exercise-${entryIndex}`}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-2 mb-2 text-xs uppercase tracking-widest text-muted-foreground" style={{
          gridTemplateColumns: "60px 1fr 1fr auto"
        }}>
          <span>Set</span>
          {isCardio ? (
            <>
              <span>Duration (min)</span>
              <span>Distance (km)</span>
            </>
          ) : (
            <>
              <span>Weight (lbs)</span>
              <span>Reps</span>
            </>
          )}
          <span className="w-10"></span>
        </div>

        <div className="space-y-2">
          {entry.sets.map((set, setIndex) => (
            <SetRow
              key={setIndex}
              set={set}
              isCardio={isCardio}
              entryIdx={entryIndex}
              setIdx={setIndex}
              onUpdate={(field, value) => onUpdateSet(entryIndex, setIndex, field, value)}
              onRemove={() => onRemoveSet(entryIndex, setIndex)}
              canRemove={entry.sets.length > 1}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddSet(entryIndex)}
          className="mt-3 w-full border-dashed"
          data-testid={`add-set-${entryIndex}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Set
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LogWorkout() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const fetchExercises = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/exercises`);
      setExercises(res.data);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Failed to load exercises");
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === "all" || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  const addExercise = (exercise) => {
    const newEntry = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category,
      sets: exercise.category === "cardio" 
        ? [{ set_number: 1, duration_minutes: 0, distance_km: 0, notes: "" }]
        : [{ set_number: 1, reps: 0, weight: 0, notes: "" }],
    };
    setEntries((prev) => [...prev, newEntry]);
    setShowExerciseModal(false);
    setSearchQuery("");
    setMuscleFilter("all");
  };

  const removeExercise = (index) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addSet = (entryIndex) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      const entry = newEntries[entryIndex];
      const lastSet = entry.sets[entry.sets.length - 1];
      const newSet = {
        set_number: entry.sets.length + 1,
        ...(entry.category === "cardio"
          ? { duration_minutes: lastSet?.duration_minutes || 0, distance_km: lastSet?.distance_km || 0 }
          : { reps: lastSet?.reps || 0, weight: lastSet?.weight || 0 }),
        notes: "",
      };
      entry.sets = [...entry.sets, newSet];
      return newEntries;
    });
  };

  const removeSet = (entryIndex, setIndex) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      newEntries[entryIndex].sets = newEntries[entryIndex].sets
        .filter((_, i) => i !== setIndex)
        .map((set, i) => ({ ...set, set_number: i + 1 }));
      return newEntries;
    });
  };

  const updateSet = (entryIndex, setIndex, field, value) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      newEntries[entryIndex].sets[setIndex][field] = value;
      return newEntries;
    });
  };

  const handleSave = async () => {
    if (entries.length === 0) {
      toast.error("Add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/workouts`, {
        date: format(date, "yyyy-MM-dd"),
        entries,
        notes: notes || null,
      });
      toast.success("Workout logged successfully!");
      navigate("/history");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 fade-in" data-testid="log-workout-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
            LOG WORKOUT
          </h1>
          <p className="text-muted-foreground mt-2">
            Record your training session
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleSave}
          disabled={saving || entries.length === 0}
          className="bg-primary hover:bg-primary/90 rounded-full px-8 font-semibold"
          data-testid="save-workout-btn"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          Save Workout
        </Button>
      </div>

      {/* Date Picker */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Label className="text-sm uppercase tracking-widest text-muted-foreground">
              Workout Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  data-testid="date-picker-btn"
                >
                  <Dumbbell className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE, MMMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  data-testid="calendar"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Exercises */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            EXERCISES
          </h2>
          <Button
            onClick={() => setShowExerciseModal(true)}
            className="bg-primary hover:bg-primary/90 rounded-full"
            data-testid="add-exercise-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Exercise
          </Button>
        </div>

        {entries.length === 0 ? (
          <Card className="border-border/40 bg-card border-dashed">
            <CardContent className="p-12 text-center">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">
                No exercises added yet
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Add Exercise" to start building your workout
              </p>
              <Button
                onClick={() => setShowExerciseModal(true)}
                variant="outline"
                data-testid="add-first-exercise-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Exercise
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, entryIndex) => (
              <ExerciseEntry
                key={entryIndex}
                entry={entry}
                entryIndex={entryIndex}
                onRemove={() => removeExercise(entryIndex)}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onUpdateSet={updateSet}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <Card className="border-border/40 bg-card">
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">
            WORKOUT NOTES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How did the workout feel? Any PRs or observations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-secondary border-border min-h-[100px]"
            data-testid="workout-notes"
          />
        </CardContent>
      </Card>

      {/* Exercise Selection Modal */}
      <Dialog open={showExerciseModal} onOpenChange={setShowExerciseModal}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight">
              SELECT EXERCISE
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  data-testid="exercise-search"
                />
              </div>
              <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border" data-testid="muscle-filter">
                  <SelectValue placeholder="Filter by muscle" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {MUSCLE_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exercise List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => addExercise(exercise)}
                    className="w-full p-4 rounded-lg bg-secondary hover:bg-secondary/80 border border-transparent hover:border-primary/50 transition-all duration-200 text-left flex items-center justify-between group"
                    data-testid={`exercise-option-${exercise.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        exercise.category === "cardio" ? "bg-primary/20" : "bg-accent/20"
                      }`}>
                        {exercise.category === "cardio" ? (
                          <Timer className="w-5 h-5 text-primary" />
                        ) : (
                          <Dumbbell className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{exercise.name}</p>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          {exercise.muscle_group.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {filteredExercises.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No exercises found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
