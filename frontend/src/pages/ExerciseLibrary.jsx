import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Search, 
  Dumbbell, 
  Timer,
  Filter,
  Grid3X3,
  List
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const CATEGORIES = [
  { value: "all", label: "All Types" },
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
];

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const res = await axios.get(`${API}/exercises`);
      setExercises(res.data);
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === "all" || ex.muscle_group === muscleFilter;
    const matchesCategory = categoryFilter === "all" || ex.category === categoryFilter;
    return matchesSearch && matchesMuscle && matchesCategory;
  });

  const groupedByMuscle = filteredExercises.reduce((acc, ex) => {
    const group = ex.muscle_group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {});

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
      <div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
          EXERCISE LIBRARY
        </h1>
        <p className="text-muted-foreground mt-2">
          {exercises.length} exercises available
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
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

            {/* Muscle Filter */}
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-secondary border-border" data-testid="muscle-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Muscle Group" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {MUSCLE_GROUPS.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList className="bg-secondary" data-testid="category-tabs">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger 
                    key={cat.value} 
                    value={cat.value}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* View Toggle */}
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="view-grid-btn"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="view-list-btn"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredExercises.length} of {exercises.length} exercises
        </p>
      </div>

      {/* Exercise List */}
      {viewMode === "grid" ? (
        <div className="space-y-8">
          {Object.entries(groupedByMuscle).map(([muscle, exs]) => (
            <div key={muscle}>
              <h2 className="font-display text-2xl font-bold tracking-tight mb-4 capitalize">
                {muscle.replace("_", " ")}
                <span className="text-muted-foreground text-lg ml-2">({exs.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {exs.map((exercise) => (
                  <Card 
                    key={exercise.id} 
                    className="exercise-card border-border/40 bg-card overflow-hidden"
                    data-testid={`exercise-card-${exercise.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${
                          exercise.category === "cardio" ? "bg-primary/20" : "bg-accent/20"
                        }`}>
                          {exercise.category === "cardio" ? (
                            <Timer className="w-6 h-6 text-primary" />
                          ) : (
                            <Dumbbell className="w-6 h-6 text-accent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {exercise.name}
                          </h3>
                          <Badge 
                            variant="secondary" 
                            className={`mt-2 text-xs badge-${exercise.muscle_group}`}
                          >
                            {exercise.muscle_group.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      {exercise.description && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                          {exercise.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExercises.map((exercise, index) => (
            <Card 
              key={exercise.id}
              className={`exercise-card border-border/40 bg-card fade-in stagger-${(index % 5) + 1}`}
              data-testid={`exercise-list-${exercise.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    exercise.category === "cardio" ? "bg-primary/20" : "bg-accent/20"
                  }`}>
                    {exercise.category === "cardio" ? (
                      <Timer className="w-6 h-6 text-primary" />
                    ) : (
                      <Dumbbell className="w-6 h-6 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{exercise.name}</h3>
                    {exercise.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {exercise.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary"
                      className={`badge-${exercise.muscle_group}`}
                    >
                      {exercise.muscle_group.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">
                      {exercise.category}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">
            No exercises found
          </p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
