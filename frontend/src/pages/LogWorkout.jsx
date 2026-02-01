import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Save, Dumbbell, Timer, Search, X, Check, FolderOpen } from "lucide-react";
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

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

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

function ExerciseSelector({ exercises, onSelect }) {
  const items = [];
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const isCardio = ex.category === "cardio";
    items.push(
      <button
        key={ex.id}
        onClick={() => onSelect(ex)}
        className="w-full p-4 rounded-lg bg-secondary hover:bg-secondary/80 border border-transparent hover:border-primary/50 transition-all duration-200 text-left flex items-center justify-between group"
        data-testid={`exercise-option-${ex.id}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCardio ? "bg-primary/20" : "bg-accent/20"}`}>
            {isCardio ? <Timer className="w-5 h-5 text-primary" /> : <Dumbbell className="w-5 h-5 text-accent" />}
          </div>
          <div>
            <p className="font-semibold">{ex.name}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{ex.muscle_group.replace("_", " ")}</p>
          </div>
        </div>
        <Check className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }
  return <>{items}</>;
}

function SetsEditor({ sets, isCardio, onUpdate, onRemove, onAdd, entryIndex }) {
  const rows = [];
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    rows.push(
      <div key={i} className="grid grid-cols-4 gap-2 items-center" data-testid={`set-row-${entryIndex}-${i}`}>
        <span className="text-sm font-semibold text-center bg-secondary rounded px-2 py-2">{s.set_number}</span>
        {isCardio ? (
          <>
            <Input type="number" min="0" step="0.1" value={s.duration_minutes || ""} onChange={(e) => onUpdate(i, "duration_minutes", parseFloat(e.target.value) || 0)} placeholder="0" className="bg-secondary border-border" />
            <Input type="number" min="0" step="0.1" value={s.distance_km || ""} onChange={(e) => onUpdate(i, "distance_km", parseFloat(e.target.value) || 0)} placeholder="0" className="bg-secondary border-border" />
          </>
        ) : (
          <>
            <Input type="number" min="0" step="2.5" value={s.weight || ""} onChange={(e) => onUpdate(i, "weight", parseFloat(e.target.value) || 0)} placeholder="0" className="bg-secondary border-border" />
            <Input type="number" min="0" value={s.reps || ""} onChange={(e) => onUpdate(i, "reps", parseInt(e.target.value) || 0)} placeholder="0" className="bg-secondary border-border" />
          </>
        )}
        <Button variant="ghost" size="icon" onClick={() => onRemove(i)} disabled={sets.length === 1} className="text-muted-foreground hover:text-destructive">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="space-y-2">{rows}</div>
      <Button variant="outline" size="sm" onClick={onAdd} className="mt-3 w-full border-dashed" data-testid={`add-set-${entryIndex}`}>
        <Plus className="w-4 h-4 mr-2" />Add Set
      </Button>
    </>
  );
}

function ExerciseCard({ entry, index, onRemove, onUpdateSet, onRemoveSet, onAddSet }) {
  const isCardio = entry.category === "cardio";
  return (
    <Card className="border-border/40 bg-card overflow-hidden" data-testid={`exercise-entry-${index}`}>
      <CardHeader className="bg-secondary/50 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCardio ? "bg-primary/20" : "bg-accent/20"}`}>
              {isCardio ? <Timer className="w-5 h-5 text-primary" /> : <Dumbbell className="w-5 h-5 text-accent" />}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{entry.exercise_name}</CardTitle>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{entry.category}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive hover:bg-destructive/20" data-testid={`remove-exercise-${index}`}>
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          <span>Set</span>
          <span>{isCardio ? "Duration (min)" : "Weight (kg)"}</span>
          <span>{isCardio ? "Distance (km)" : "Reps"}</span>
          <span></span>
        </div>
        <SetsEditor sets={entry.sets} isCardio={isCardio} onUpdate={onUpdateSet} onRemove={onRemoveSet} onAdd={onAddSet} entryIndex={index} />
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
  const [templates, setTemplates] = useState([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [exercisesRes, templatesRes] = await Promise.all([
        axios.get(`${API}/exercises`),
        axios.get(`${API}/templates`)
      ]);
      setExercises(exercisesRes.data);
      setTemplates(templatesRes.data);
    } catch (err) {
      toast.error("Failed to load data");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getFilteredExercises = () => {
    const result = [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (ex.name.toLowerCase().includes(searchQuery.toLowerCase()) && (muscleFilter === "all" || ex.muscle_group === muscleFilter)) {
        result.push(ex);
      }
    }
    return result;
  };

  const addExercise = (exercise) => {
    const isCardio = exercise.category === "cardio";
    const firstSet = isCardio ? { set_number: 1, duration_minutes: 0, distance_km: 0 } : { set_number: 1, reps: 0, weight: 0 };
    setEntries([...entries, { exercise_id: exercise.id, exercise_name: exercise.name, category: exercise.category, sets: [firstSet] }]);
    setShowExerciseModal(false);
    setSearchQuery("");
    setMuscleFilter("all");
  };

  const loadTemplate = (template) => {
    const newEntries = [];
    for (let i = 0; i < template.exercises.length; i++) {
      const ex = template.exercises[i];
      const isCardio = ex.category === "cardio";
      const sets = [];
      const numSets = ex.default_sets || 3;
      for (let j = 0; j < numSets; j++) {
        if (isCardio) {
          sets.push({ set_number: j + 1, duration_minutes: 0, distance_km: 0 });
        } else {
          sets.push({ set_number: j + 1, reps: 0, weight: 0 });
        }
      }
      newEntries.push({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name, category: ex.category, sets });
    }
    setEntries(newEntries);
    setShowTemplateModal(false);
    toast.success(`Loaded "${template.name}" template`);
  };

  const removeExercise = (idx) => {
    const newEntries = [];
    for (let i = 0; i < entries.length; i++) { if (i !== idx) newEntries.push(entries[i]); }
    setEntries(newEntries);
  };

  const addSet = (entryIdx) => {
    const updated = [...entries];
    const e = updated[entryIdx];
    const last = e.sets[e.sets.length - 1];
    const isCardio = e.category === "cardio";
    const newSet = isCardio ? { set_number: e.sets.length + 1, duration_minutes: last?.duration_minutes || 0, distance_km: last?.distance_km || 0 } : { set_number: e.sets.length + 1, reps: last?.reps || 0, weight: last?.weight || 0 };
    updated[entryIdx] = { ...e, sets: [...e.sets, newSet] };
    setEntries(updated);
  };

  const removeSet = (entryIdx, setIdx) => {
    const updated = [...entries];
    const e = updated[entryIdx];
    const newSets = [];
    for (let i = 0; i < e.sets.length; i++) { if (i !== setIdx) newSets.push({ ...e.sets[i], set_number: newSets.length + 1 }); }
    updated[entryIdx] = { ...e, sets: newSets };
    setEntries(updated);
  };

  const updateSet = (entryIdx, setIdx, field, value) => {
    const updated = [...entries];
    const e = updated[entryIdx];
    const newSets = [...e.sets];
    newSets[setIdx] = { ...newSets[setIdx], [field]: value };
    updated[entryIdx] = { ...e, sets: newSets };
    setEntries(updated);
  };

  const handleSave = async () => {
    if (entries.length === 0) { toast.error("Add at least one exercise"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/workouts`, { date: format(date, "yyyy-MM-dd"), entries, notes: notes || null });
      toast.success("Workout logged!");
      navigate("/history");
    } catch (err) { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const filteredExercises = getFilteredExercises();
  const entryCards = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    entryCards.push(
      <ExerciseCard
        key={i}
        entry={entry}
        index={i}
        onRemove={() => removeExercise(i)}
        onUpdateSet={(si, f, v) => updateSet(i, si, f, v)}
        onRemoveSet={(si) => removeSet(i, si)}
        onAddSet={() => addSet(i)}
      />
    );
  }

  return (
    <div className="space-y-6 fade-in" data-testid="log-workout-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">LOG WORKOUT</h1>
          <p className="text-muted-foreground mt-2">Record your training session</p>
        </div>
        <Button size="lg" onClick={handleSave} disabled={saving || entries.length === 0} className="bg-primary hover:bg-primary/90 rounded-full px-8 font-semibold" data-testid="save-workout-btn">
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          Save Workout
        </Button>
      </div>

      <Card className="border-border/40 bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Label className="text-sm uppercase tracking-widest text-muted-foreground">Workout Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")} data-testid="date-picker-btn">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE, MMMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight">EXERCISES</h2>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <Button onClick={() => setShowTemplateModal(true)} variant="outline" className="rounded-full" data-testid="load-template-btn">
                <FolderOpen className="w-5 h-5 mr-2" />Load Template
              </Button>
            )}
            <Button onClick={() => setShowExerciseModal(true)} className="bg-primary hover:bg-primary/90 rounded-full" data-testid="add-exercise-btn">
              <Plus className="w-5 h-5 mr-2" />Add Exercise
            </Button>
          </div>
        </div>
        {entries.length === 0 ? (
          <Card className="border-border/40 bg-card border-dashed">
            <CardContent className="p-12 text-center">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">No exercises added</p>
              <p className="text-sm text-muted-foreground mb-4">Add exercises or load a template</p>
              <div className="flex justify-center gap-2">
                {templates.length > 0 && (
                  <Button onClick={() => setShowTemplateModal(true)} variant="outline" data-testid="load-template-empty-btn">
                    <FolderOpen className="w-4 h-4 mr-2" />Load Template
                  </Button>
                )}
                <Button onClick={() => setShowExerciseModal(true)} variant="outline" data-testid="add-first-exercise-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Exercise
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : <div className="space-y-4">{entryCards}</div>}
      </div>

      <Card className="border-border/40 bg-card">
        <CardHeader><CardTitle className="font-display text-xl tracking-tight">WORKOUT NOTES</CardTitle></CardHeader>
        <CardContent>
          <Textarea placeholder="How did the workout feel?" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-secondary border-border min-h-[100px]" data-testid="workout-notes" />
        </CardContent>
      </Card>

      {/* Exercise Selection Modal */}
      <Dialog open={showExerciseModal} onOpenChange={setShowExerciseModal}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="font-display text-2xl tracking-tight">SELECT EXERCISE</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary border-border" data-testid="exercise-search" />
              </div>
              <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border" data-testid="muscle-filter"><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {MUSCLE_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                <ExerciseSelector exercises={filteredExercises} onSelect={addExercise} />
                {filteredExercises.length === 0 && <div className="text-center py-8 text-muted-foreground">No exercises found</div>}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl tracking-tight">LOAD TEMPLATE</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Select a template to pre-fill your workout</p>
          <ScrollArea className="h-[300px] pr-4 mt-4">
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t)}
                  className="w-full p-4 rounded-lg bg-secondary hover:bg-secondary/80 border border-transparent hover:border-primary/50 transition-all duration-200 text-left"
                  data-testid={`template-option-${t.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.exercises.length} exercises</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
