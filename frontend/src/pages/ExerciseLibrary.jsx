import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Search, Dumbbell, Timer, Filter, Grid3X3, List, Plus, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

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

const MUSCLE_GROUPS_CREATE = [
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

const CATEGORIES = [
  { value: "all", label: "All Types" },
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
];

function ExerciseGrid({ exercises }) {
  const grouped = {};
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const mg = ex.muscle_group;
    if (!grouped[mg]) grouped[mg] = [];
    grouped[mg].push(ex);
  }

  const sections = [];
  const muscleKeys = Object.keys(grouped);
  for (let k = 0; k < muscleKeys.length; k++) {
    const muscle = muscleKeys[k];
    const exs = grouped[muscle];
    const cards = [];
    for (let i = 0; i < exs.length; i++) {
      const ex = exs[i];
      const isCardio = ex.category === "cardio";
      cards.push(
        <Card key={ex.id} className="exercise-card border-border/40 bg-card overflow-hidden" data-testid={`exercise-card-${ex.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${isCardio ? "bg-primary/20" : "bg-accent/20"}`}>
                {isCardio ? <Timer className="w-6 h-6 text-primary" /> : <Dumbbell className="w-6 h-6 text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{ex.name}</h3>
                <Badge variant="secondary" className={`mt-2 text-xs badge-${ex.muscle_group}`}>{ex.muscle_group.replace("_", " ")}</Badge>
              </div>
            </div>
            {ex.description && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{ex.description}</p>}
          </CardContent>
        </Card>
      );
    }
    sections.push(
      <div key={muscle}>
        <h2 className="font-display text-2xl font-bold tracking-tight mb-4 capitalize">{muscle.replace("_", " ")}<span className="text-muted-foreground text-lg ml-2">({exs.length})</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{cards}</div>
      </div>
    );
  }
  return <div className="space-y-8">{sections}</div>;
}

function ExerciseList({ exercises }) {
  const items = [];
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const isCardio = ex.category === "cardio";
    items.push(
      <Card key={ex.id} className={`exercise-card border-border/40 bg-card fade-in stagger-${(i % 5) + 1}`} data-testid={`exercise-list-${ex.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${isCardio ? "bg-primary/20" : "bg-accent/20"}`}>
              {isCardio ? <Timer className="w-6 h-6 text-primary" /> : <Dumbbell className="w-6 h-6 text-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{ex.name}</h3>
              {ex.description && <p className="text-sm text-muted-foreground truncate">{ex.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`badge-${ex.muscle_group}`}>{ex.muscle_group.replace("_", " ")}</Badge>
              <Badge variant="outline">{ex.category}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  return <div className="space-y-2">{items}</div>;
}

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // New exercise form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("strength");
  const [newMuscleGroup, setNewMuscleGroup] = useState("chest");
  const [newDescription, setNewDescription] = useState("");

  const fetchExercises = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/exercises`);
      setExercises(res.data);
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const getFilteredExercises = () => {
    const result = [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const matchesSearch = ex.name.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
      const matchesMuscle = muscleFilter === "all" || ex.muscle_group === muscleFilter;
      const matchesCategory = categoryFilter === "all" || ex.category === categoryFilter;
      if (matchesSearch && matchesMuscle && matchesCategory) result.push(ex);
    }
    return result;
  };

  const resetForm = () => {
    setNewName("");
    setNewCategory("strength");
    setNewMuscleGroup("chest");
    setNewDescription("");
  };

  const handleAddExercise = async () => {
    if (!newName.trim()) {
      toast.error("Please enter an exercise name");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: newName.trim(),
        category: newCategory,
        muscle_group: newMuscleGroup,
        description: newDescription.trim() || null
      };
      await axios.post(`${API}/exercises`, payload);
      toast.success(`"${newName}" added to library!`);
      setShowAddModal(false);
      resetForm();
      fetchExercises();
    } catch (error) {
      toast.error("Failed to add exercise");
    } finally {
      setSaving(false);
    }
  };

  const filteredExercises = getFilteredExercises();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in" data-testid="exercise-library-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">EXERCISE LIBRARY</h1>
          <p className="text-muted-foreground mt-2">{exercises.length} exercises available</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 rounded-full px-8 font-semibold" data-testid="add-exercise-btn">
          <Plus className="w-5 h-5 mr-2" />Add Exercise
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search exercises..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary border-border" data-testid="exercise-search" />
            </div>
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-secondary border-border" data-testid="muscle-filter">
                <Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Muscle Group" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {MUSCLE_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList className="bg-secondary" data-testid="category-tabs">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.value} value={cat.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{cat.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex gap-1">
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")} data-testid="view-grid-btn"><Grid3X3 className="w-4 h-4" /></Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")} data-testid="view-list-btn"><List className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {filteredExercises.length} of {exercises.length} exercises</p>
      </div>

      {viewMode === "grid" ? <ExerciseGrid exercises={filteredExercises} /> : <ExerciseList exercises={filteredExercises} />}

      {filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">No exercises found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Add Exercise Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { if (!open) { setShowAddModal(false); resetForm(); } else setShowAddModal(true); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl tracking-tight">ADD CUSTOM EXERCISE</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm uppercase tracking-widest text-muted-foreground">Exercise Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Cable Fly, Box Jump" className="mt-2 bg-secondary border-border" data-testid="new-exercise-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm uppercase tracking-widest text-muted-foreground">Category *</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="mt-2 bg-secondary border-border" data-testid="new-exercise-category"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm uppercase tracking-widest text-muted-foreground">Muscle Group *</Label>
                <Select value={newMuscleGroup} onValueChange={setNewMuscleGroup}>
                  <SelectTrigger className="mt-2 bg-secondary border-border" data-testid="new-exercise-muscle"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {MUSCLE_GROUPS_CREATE.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Brief description of the exercise..." className="mt-2 bg-secondary border-border min-h-[80px]" data-testid="new-exercise-description" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleAddExercise} disabled={saving} className="bg-primary hover:bg-primary/90" data-testid="save-new-exercise-btn">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Add Exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
