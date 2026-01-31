import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Plus, Trash2, Edit, Dumbbell, Timer, Search, X, Check, Save, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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

function ExerciseList({ exercises, selectedIds, onToggle }) {
  const items = [];
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const isCardio = ex.category === "cardio";
    const isSelected = selectedIds.indexOf(ex.id) !== -1;
    items.push(
      <button
        key={ex.id}
        onClick={() => onToggle(ex)}
        className={`w-full p-3 rounded-lg border transition-all duration-200 text-left flex items-center justify-between ${isSelected ? "bg-primary/20 border-primary" : "bg-secondary hover:bg-secondary/80 border-transparent hover:border-primary/50"}`}
        data-testid={`template-exercise-option-${ex.id}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCardio ? "bg-primary/20" : "bg-accent/20"}`}>
            {isCardio ? <Timer className="w-4 h-4 text-primary" /> : <Dumbbell className="w-4 h-4 text-accent" />}
          </div>
          <div>
            <p className="font-medium text-sm">{ex.name}</p>
            <p className="text-xs text-muted-foreground">{ex.muscle_group.replace("_", " ")}</p>
          </div>
        </div>
        {isSelected && <Check className="w-5 h-5 text-primary" />}
      </button>
    );
  }
  return <div className="space-y-2">{items}</div>;
}

function SelectedBadges({ selected, onRemove }) {
  if (selected.length === 0) return null;
  const badges = [];
  for (let i = 0; i < selected.length; i++) {
    const ex = selected[i];
    badges.push(
      <Badge key={ex.exercise_id} variant="secondary" className="flex items-center gap-1">
        {ex.exercise_name}
        <button onClick={() => onRemove(ex.exercise_id)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
      </Badge>
    );
  }
  return <div className="flex flex-wrap gap-2 mt-2 p-3 bg-secondary rounded-lg">{badges}</div>;
}

function TemplateCards({ templates, onEdit, onDelete }) {
  const cards = [];
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const exerciseBadges = [];
    for (let j = 0; j < t.exercises.length; j++) {
      const ex = t.exercises[j];
      const isCardio = ex.category === "cardio";
      exerciseBadges.push(
        <Badge key={j} variant="secondary" className={`badge-${isCardio ? "cardio" : "chest"}`}>{ex.exercise_name}</Badge>
      );
    }
    cards.push(
      <Card key={t.id} className="border-border/40 bg-card card-hover" data-testid={`template-card-${t.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center"><FolderOpen className="w-6 h-6 text-primary" /></div>
              <div>
                <CardTitle className="text-lg font-semibold">{t.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.exercises.length} exercises</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(t)} data-testid={`edit-template-${t.id}`}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(t)} className="text-destructive hover:text-destructive" data-testid={`delete-template-${t.id}`}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
          <div className="flex flex-wrap gap-2">{exerciseBadges}</div>
        </CardContent>
      </Card>
    );
  }
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{cards}</div>;
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteTemplate, setDeleteTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      const [tRes, eRes] = await Promise.all([axios.get(`${API}/templates`), axios.get(`${API}/exercises`)]);
      setTemplates(tRes.data);
      setExercises(eRes.data);
    } catch (err) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { setName(""); setDescription(""); setSelectedExercises([]); setSearchQuery(""); setMuscleFilter("all"); setEditingTemplate(null); };

  const openCreateModal = () => { resetForm(); setShowModal(true); };

  const openEditModal = (t) => {
    setEditingTemplate(t);
    setName(t.name);
    setDescription(t.description || "");
    const selected = [];
    for (let i = 0; i < t.exercises.length; i++) {
      const e = t.exercises[i];
      selected.push({ exercise_id: e.exercise_id, exercise_name: e.exercise_name, category: e.category, default_sets: e.default_sets || 3 });
    }
    setSelectedExercises(selected);
    setShowModal(true);
  };

  const handleExerciseToggle = (ex) => {
    let found = false;
    for (let i = 0; i < selectedExercises.length; i++) {
      if (selectedExercises[i].exercise_id === ex.id) { found = true; break; }
    }
    if (found) {
      const newSelected = [];
      for (let i = 0; i < selectedExercises.length; i++) {
        if (selectedExercises[i].exercise_id !== ex.id) newSelected.push(selectedExercises[i]);
      }
      setSelectedExercises(newSelected);
    } else {
      setSelectedExercises([...selectedExercises, { exercise_id: ex.id, exercise_name: ex.name, category: ex.category, default_sets: 3 }]);
    }
  };

  const handleRemoveSelected = (exId) => {
    const newSelected = [];
    for (let i = 0; i < selectedExercises.length; i++) {
      if (selectedExercises[i].exercise_id !== exId) newSelected.push(selectedExercises[i]);
    }
    setSelectedExercises(newSelected);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please enter a template name"); return; }
    if (selectedExercises.length === 0) { toast.error("Please select at least one exercise"); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, exercises: selectedExercises };
      if (editingTemplate) { await axios.put(`${API}/templates/${editingTemplate.id}`, payload); toast.success("Template updated!"); }
      else { await axios.post(`${API}/templates`, payload); toast.success("Template created!"); }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) { toast.error("Failed to save template"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    try {
      await axios.delete(`${API}/templates/${deleteTemplate.id}`);
      const newTemplates = [];
      for (let i = 0; i < templates.length; i++) {
        if (templates[i].id !== deleteTemplate.id) newTemplates.push(templates[i]);
      }
      setTemplates(newTemplates);
      toast.success("Template deleted");
      setDeleteTemplate(null);
    } catch (err) { toast.error("Failed to delete template"); }
  };

  const getFilteredExercises = () => {
    const result = [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (ex.name.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 && (muscleFilter === "all" || ex.muscle_group === muscleFilter)) {
        result.push(ex);
      }
    }
    return result;
  };

  const filteredExercises = getFilteredExercises();
  const selectedIds = [];
  for (let i = 0; i < selectedExercises.length; i++) { selectedIds.push(selectedExercises[i].exercise_id); }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 fade-in" data-testid="templates-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">TEMPLATES</h1>
          <p className="text-muted-foreground mt-2">Create reusable workout routines</p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90 rounded-full px-8 font-semibold" data-testid="create-template-btn">
          <Plus className="w-5 h-5 mr-2" />Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-border/40 bg-card border-dashed">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No templates yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create templates like "Push Day" or "Leg Day"</p>
            <Button onClick={openCreateModal} variant="outline" data-testid="create-first-template-btn"><Plus className="w-4 h-4 mr-2" />Create Your First Template</Button>
          </CardContent>
        </Card>
      ) : <TemplateCards templates={templates} onEdit={openEditModal} onDelete={setDeleteTemplate} />}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); resetForm(); } else setShowModal(true); }}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="font-display text-2xl tracking-tight">{editingTemplate ? "EDIT TEMPLATE" : "CREATE TEMPLATE"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm uppercase tracking-widest text-muted-foreground">Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Push Day" className="mt-2 bg-secondary border-border" data-testid="template-name-input" />
              </div>
              <div>
                <Label className="text-sm uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" className="mt-2 bg-secondary border-border" data-testid="template-description-input" />
              </div>
            </div>
            <div>
              <Label className="text-sm uppercase tracking-widest text-muted-foreground">Selected ({selectedExercises.length})</Label>
              <SelectedBadges selected={selectedExercises} onRemove={handleRemoveSelected} />
            </div>
            <div>
              <Label className="text-sm uppercase tracking-widest text-muted-foreground mb-2 block">Add Exercises</Label>
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary border-border" data-testid="template-exercise-search" />
                </div>
                <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border" data-testid="template-muscle-filter"><SelectValue placeholder="Filter" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {MUSCLE_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-[250px] pr-4 border border-border rounded-lg p-2">
                <ExerciseList exercises={filteredExercises} selectedIds={selectedIds} onToggle={handleExerciseToggle} />
                {filteredExercises.length === 0 && <div className="text-center py-8 text-muted-foreground">No exercises found</div>}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90" data-testid="save-template-btn">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleteTemplate?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-template">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-template">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
