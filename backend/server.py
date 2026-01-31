from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Enums
class ExerciseCategory(str, Enum):
    STRENGTH = "strength"
    CARDIO = "cardio"

class MuscleGroup(str, Enum):
    CHEST = "chest"
    BACK = "back"
    SHOULDERS = "shoulders"
    BICEPS = "biceps"
    TRICEPS = "triceps"
    LEGS = "legs"
    CORE = "core"
    FULL_BODY = "full_body"
    CARDIO = "cardio"

# Models
class Exercise(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: ExerciseCategory
    muscle_group: MuscleGroup
    description: Optional[str] = None
    instructions: Optional[str] = None

class ExerciseCreate(BaseModel):
    name: str
    category: ExerciseCategory
    muscle_group: MuscleGroup
    description: Optional[str] = None
    instructions: Optional[str] = None

class WorkoutSet(BaseModel):
    set_number: int
    reps: Optional[int] = None
    weight: Optional[float] = None  # in lbs or kg
    duration_minutes: Optional[float] = None  # for cardio
    distance_km: Optional[float] = None  # for cardio
    notes: Optional[str] = None

class WorkoutLogEntry(BaseModel):
    exercise_id: str
    exercise_name: str
    category: ExerciseCategory
    sets: List[WorkoutSet]

class WorkoutLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # ISO date string
    entries: List[WorkoutLogEntry]
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WorkoutLogCreate(BaseModel):
    date: str
    entries: List[WorkoutLogEntry]
    notes: Optional[str] = None

class DashboardStats(BaseModel):
    total_workouts: int
    total_exercises_logged: int
    total_sets: int
    total_volume: float  # weight * reps (in kg)
    total_calories: float  # estimated calories burned
    current_streak: int
    longest_streak: int
    workouts_this_week: int
    workouts_this_month: int

class ProgressData(BaseModel):
    date: str
    max_weight: Optional[float] = None
    total_volume: Optional[float] = None
    total_reps: Optional[int] = None
    duration: Optional[float] = None
    distance: Optional[float] = None
    calories: Optional[float] = None

# Calorie calculation helpers
def calculate_strength_calories(weight_kg: float, reps: int, sets: int = 1) -> float:
    """
    Estimate calories burned for strength training.
    Formula: ~0.05 calories per kg lifted per rep (rough estimate)
    Also factors in metabolic cost of the movement.
    """
    base_calories = weight_kg * reps * 0.05 * sets
    # Add metabolic overhead (rest, recovery between sets)
    return round(base_calories * 1.3, 1)

def calculate_cardio_calories(duration_minutes: float, intensity: str = "moderate") -> float:
    """
    Estimate calories burned for cardio.
    Based on average 70kg person, MET values:
    - Light (walking): 3.5 MET
    - Moderate (jogging): 7 MET
    - Vigorous (running/HIIT): 10 MET
    """
    met_values = {"light": 3.5, "moderate": 7, "vigorous": 10}
    met = met_values.get(intensity, 7)
    # Calories = MET × weight(kg) × duration(hours)
    # Using 70kg as average
    return round(met * 70 * (duration_minutes / 60), 1)

# Template Models
class TemplateExercise(BaseModel):
    exercise_id: str
    exercise_name: str
    category: ExerciseCategory
    default_sets: int = 3

class WorkoutTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    exercises: List[TemplateExercise]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WorkoutTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    exercises: List[TemplateExercise]

class WorkoutTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    exercises: Optional[List[TemplateExercise]] = None

# Pre-populated exercises data
INITIAL_EXERCISES = [
    # Chest
    {"name": "Bench Press", "category": "strength", "muscle_group": "chest", "description": "Classic chest compound movement"},
    {"name": "Incline Bench Press", "category": "strength", "muscle_group": "chest", "description": "Upper chest focused press"},
    {"name": "Decline Bench Press", "category": "strength", "muscle_group": "chest", "description": "Lower chest focused press"},
    {"name": "Dumbbell Fly", "category": "strength", "muscle_group": "chest", "description": "Chest isolation movement"},
    {"name": "Cable Crossover", "category": "strength", "muscle_group": "chest", "description": "Cable chest isolation"},
    {"name": "Push-Up", "category": "strength", "muscle_group": "chest", "description": "Bodyweight chest exercise"},
    {"name": "Chest Dip", "category": "strength", "muscle_group": "chest", "description": "Weighted dip for chest"},
    {"name": "Dumbbell Press", "category": "strength", "muscle_group": "chest", "description": "Dumbbell bench press variation"},
    {"name": "Machine Chest Press", "category": "strength", "muscle_group": "chest", "description": "Machine guided chest press"},
    {"name": "Pec Deck Fly", "category": "strength", "muscle_group": "chest", "description": "Machine fly for chest"},
    
    # Back
    {"name": "Deadlift", "category": "strength", "muscle_group": "back", "description": "Full body posterior chain movement"},
    {"name": "Pull-Up", "category": "strength", "muscle_group": "back", "description": "Bodyweight back exercise"},
    {"name": "Lat Pulldown", "category": "strength", "muscle_group": "back", "description": "Machine lat exercise"},
    {"name": "Barbell Row", "category": "strength", "muscle_group": "back", "description": "Compound back movement"},
    {"name": "Dumbbell Row", "category": "strength", "muscle_group": "back", "description": "Single arm back row"},
    {"name": "Seated Cable Row", "category": "strength", "muscle_group": "back", "description": "Cable back exercise"},
    {"name": "T-Bar Row", "category": "strength", "muscle_group": "back", "description": "Barbell row variation"},
    {"name": "Face Pull", "category": "strength", "muscle_group": "back", "description": "Rear delt and upper back"},
    {"name": "Chin-Up", "category": "strength", "muscle_group": "back", "description": "Underhand pull-up variation"},
    {"name": "Rack Pull", "category": "strength", "muscle_group": "back", "description": "Partial deadlift from rack"},
    
    # Shoulders
    {"name": "Overhead Press", "category": "strength", "muscle_group": "shoulders", "description": "Standing barbell press"},
    {"name": "Dumbbell Shoulder Press", "category": "strength", "muscle_group": "shoulders", "description": "Seated dumbbell press"},
    {"name": "Lateral Raise", "category": "strength", "muscle_group": "shoulders", "description": "Side delt isolation"},
    {"name": "Front Raise", "category": "strength", "muscle_group": "shoulders", "description": "Front delt isolation"},
    {"name": "Rear Delt Fly", "category": "strength", "muscle_group": "shoulders", "description": "Rear delt isolation"},
    {"name": "Arnold Press", "category": "strength", "muscle_group": "shoulders", "description": "Rotating shoulder press"},
    {"name": "Upright Row", "category": "strength", "muscle_group": "shoulders", "description": "Barbell shoulder movement"},
    {"name": "Shrugs", "category": "strength", "muscle_group": "shoulders", "description": "Trap isolation"},
    {"name": "Machine Shoulder Press", "category": "strength", "muscle_group": "shoulders", "description": "Machine guided press"},
    {"name": "Cable Lateral Raise", "category": "strength", "muscle_group": "shoulders", "description": "Cable side delt work"},
    
    # Biceps
    {"name": "Barbell Curl", "category": "strength", "muscle_group": "biceps", "description": "Classic bicep exercise"},
    {"name": "Dumbbell Curl", "category": "strength", "muscle_group": "biceps", "description": "Alternating dumbbell curls"},
    {"name": "Hammer Curl", "category": "strength", "muscle_group": "biceps", "description": "Neutral grip curl"},
    {"name": "Preacher Curl", "category": "strength", "muscle_group": "biceps", "description": "Isolated bicep curl"},
    {"name": "Concentration Curl", "category": "strength", "muscle_group": "biceps", "description": "Single arm focused curl"},
    {"name": "Cable Curl", "category": "strength", "muscle_group": "biceps", "description": "Cable bicep exercise"},
    {"name": "Incline Dumbbell Curl", "category": "strength", "muscle_group": "biceps", "description": "Stretched bicep curl"},
    {"name": "EZ Bar Curl", "category": "strength", "muscle_group": "biceps", "description": "Angled bar curl"},
    {"name": "Spider Curl", "category": "strength", "muscle_group": "biceps", "description": "Incline bench curl"},
    {"name": "21s", "category": "strength", "muscle_group": "biceps", "description": "Partial rep bicep finisher"},
    
    # Triceps
    {"name": "Tricep Pushdown", "category": "strength", "muscle_group": "triceps", "description": "Cable tricep exercise"},
    {"name": "Skull Crusher", "category": "strength", "muscle_group": "triceps", "description": "Lying tricep extension"},
    {"name": "Close Grip Bench Press", "category": "strength", "muscle_group": "triceps", "description": "Tricep focused press"},
    {"name": "Overhead Tricep Extension", "category": "strength", "muscle_group": "triceps", "description": "Cable or dumbbell overhead"},
    {"name": "Dips", "category": "strength", "muscle_group": "triceps", "description": "Tricep focused dips"},
    {"name": "Kickback", "category": "strength", "muscle_group": "triceps", "description": "Dumbbell kickback"},
    {"name": "Diamond Push-Up", "category": "strength", "muscle_group": "triceps", "description": "Close hand push-up"},
    {"name": "Rope Pushdown", "category": "strength", "muscle_group": "triceps", "description": "Rope attachment pushdown"},
    {"name": "JM Press", "category": "strength", "muscle_group": "triceps", "description": "Hybrid press movement"},
    {"name": "Bench Dip", "category": "strength", "muscle_group": "triceps", "description": "Bodyweight tricep dip"},
    
    # Legs
    {"name": "Squat", "category": "strength", "muscle_group": "legs", "description": "Barbell back squat"},
    {"name": "Front Squat", "category": "strength", "muscle_group": "legs", "description": "Barbell front squat"},
    {"name": "Leg Press", "category": "strength", "muscle_group": "legs", "description": "Machine leg press"},
    {"name": "Lunges", "category": "strength", "muscle_group": "legs", "description": "Walking or stationary lunges"},
    {"name": "Romanian Deadlift", "category": "strength", "muscle_group": "legs", "description": "Hamstring focused deadlift"},
    {"name": "Leg Extension", "category": "strength", "muscle_group": "legs", "description": "Quad isolation"},
    {"name": "Leg Curl", "category": "strength", "muscle_group": "legs", "description": "Hamstring isolation"},
    {"name": "Calf Raise", "category": "strength", "muscle_group": "legs", "description": "Standing calf raise"},
    {"name": "Bulgarian Split Squat", "category": "strength", "muscle_group": "legs", "description": "Single leg squat"},
    {"name": "Hack Squat", "category": "strength", "muscle_group": "legs", "description": "Machine squat variation"},
    {"name": "Hip Thrust", "category": "strength", "muscle_group": "legs", "description": "Glute focused movement"},
    {"name": "Goblet Squat", "category": "strength", "muscle_group": "legs", "description": "Dumbbell front squat"},
    {"name": "Step-Up", "category": "strength", "muscle_group": "legs", "description": "Single leg step exercise"},
    {"name": "Seated Calf Raise", "category": "strength", "muscle_group": "legs", "description": "Seated calf exercise"},
    {"name": "Good Morning", "category": "strength", "muscle_group": "legs", "description": "Hamstring and back exercise"},
    
    # Core
    {"name": "Plank", "category": "strength", "muscle_group": "core", "description": "Isometric core hold"},
    {"name": "Crunch", "category": "strength", "muscle_group": "core", "description": "Basic ab exercise"},
    {"name": "Russian Twist", "category": "strength", "muscle_group": "core", "description": "Rotational core work"},
    {"name": "Leg Raise", "category": "strength", "muscle_group": "core", "description": "Hanging or lying leg raise"},
    {"name": "Ab Rollout", "category": "strength", "muscle_group": "core", "description": "Wheel rollout exercise"},
    {"name": "Cable Crunch", "category": "strength", "muscle_group": "core", "description": "Weighted cable crunch"},
    {"name": "Dead Bug", "category": "strength", "muscle_group": "core", "description": "Core stability exercise"},
    {"name": "Mountain Climber", "category": "strength", "muscle_group": "core", "description": "Dynamic core exercise"},
    {"name": "Bicycle Crunch", "category": "strength", "muscle_group": "core", "description": "Rotational crunch"},
    {"name": "Side Plank", "category": "strength", "muscle_group": "core", "description": "Oblique isometric hold"},
    
    # Full Body
    {"name": "Clean and Jerk", "category": "strength", "muscle_group": "full_body", "description": "Olympic lift"},
    {"name": "Snatch", "category": "strength", "muscle_group": "full_body", "description": "Olympic lift"},
    {"name": "Thruster", "category": "strength", "muscle_group": "full_body", "description": "Squat to press"},
    {"name": "Burpee", "category": "strength", "muscle_group": "full_body", "description": "Full body conditioning"},
    {"name": "Kettlebell Swing", "category": "strength", "muscle_group": "full_body", "description": "Hip hinge explosive movement"},
    {"name": "Turkish Get-Up", "category": "strength", "muscle_group": "full_body", "description": "Complex full body movement"},
    {"name": "Farmer's Walk", "category": "strength", "muscle_group": "full_body", "description": "Loaded carry"},
    {"name": "Battle Ropes", "category": "strength", "muscle_group": "full_body", "description": "Conditioning exercise"},
    {"name": "Box Jump", "category": "strength", "muscle_group": "full_body", "description": "Plyometric exercise"},
    {"name": "Man Maker", "category": "strength", "muscle_group": "full_body", "description": "Complex dumbbell movement"},
    
    # Cardio
    {"name": "Running", "category": "cardio", "muscle_group": "cardio", "description": "Outdoor or treadmill running"},
    {"name": "Cycling", "category": "cardio", "muscle_group": "cardio", "description": "Bike or stationary cycling"},
    {"name": "Rowing", "category": "cardio", "muscle_group": "cardio", "description": "Rowing machine"},
    {"name": "Swimming", "category": "cardio", "muscle_group": "cardio", "description": "Pool swimming"},
    {"name": "Jump Rope", "category": "cardio", "muscle_group": "cardio", "description": "Skipping rope cardio"},
    {"name": "Stair Climber", "category": "cardio", "muscle_group": "cardio", "description": "Stair machine"},
    {"name": "Elliptical", "category": "cardio", "muscle_group": "cardio", "description": "Elliptical machine"},
    {"name": "Walking", "category": "cardio", "muscle_group": "cardio", "description": "Brisk walking"},
    {"name": "HIIT", "category": "cardio", "muscle_group": "cardio", "description": "High intensity interval training"},
    {"name": "Sprints", "category": "cardio", "muscle_group": "cardio", "description": "Sprint intervals"},
    {"name": "Boxing", "category": "cardio", "muscle_group": "cardio", "description": "Boxing workout"},
    {"name": "Kickboxing", "category": "cardio", "muscle_group": "cardio", "description": "Kickboxing cardio"},
    {"name": "Dance Cardio", "category": "cardio", "muscle_group": "cardio", "description": "Dance based cardio"},
    {"name": "Assault Bike", "category": "cardio", "muscle_group": "cardio", "description": "Air bike workout"},
    {"name": "Ski Erg", "category": "cardio", "muscle_group": "cardio", "description": "Ski ergometer"},
]

# Seed exercises
async def seed_exercises():
    count = await db.exercises.count_documents({})
    if count == 0:
        exercises = [
            {
                "id": str(uuid.uuid4()),
                **ex
            }
            for ex in INITIAL_EXERCISES
        ]
        await db.exercises.insert_many(exercises)
        logging.info(f"Seeded {len(exercises)} exercises")

@app.on_event("startup")
async def startup_event():
    await seed_exercises()

# Exercise Routes
@api_router.get("/exercises", response_model=List[Exercise])
async def get_exercises(
    category: Optional[ExerciseCategory] = None,
    muscle_group: Optional[MuscleGroup] = None,
    search: Optional[str] = None
):
    query = {}
    if category:
        query["category"] = category.value
    if muscle_group:
        query["muscle_group"] = muscle_group.value
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    exercises = await db.exercises.find(query, {"_id": 0}).to_list(500)
    return exercises

@api_router.post("/exercises", response_model=Exercise)
async def create_exercise(exercise: ExerciseCreate):
    exercise_obj = Exercise(**exercise.model_dump())
    doc = exercise_obj.model_dump()
    await db.exercises.insert_one(doc)
    return exercise_obj

@api_router.get("/exercises/{exercise_id}", response_model=Exercise)
async def get_exercise(exercise_id: str):
    exercise = await db.exercises.find_one({"id": exercise_id}, {"_id": 0})
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

# Workout Routes
@api_router.post("/workouts", response_model=WorkoutLog)
async def create_workout(workout: WorkoutLogCreate):
    workout_obj = WorkoutLog(**workout.model_dump())
    doc = workout_obj.model_dump()
    await db.workouts.insert_one(doc)
    return workout_obj

@api_router.get("/workouts", response_model=List[WorkoutLog])
async def get_workouts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    query = {}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    workouts = await db.workouts.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return workouts

@api_router.get("/workouts/{workout_id}", response_model=WorkoutLog)
async def get_workout(workout_id: str):
    workout = await db.workouts.find_one({"id": workout_id}, {"_id": 0})
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

@api_router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: str):
    result = await db.workouts.delete_one({"id": workout_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"message": "Workout deleted"}

# Stats Routes
@api_router.get("/stats", response_model=DashboardStats)
async def get_stats():
    workouts = await db.workouts.find({}, {"_id": 0}).to_list(10000)
    
    total_workouts = len(workouts)
    total_exercises_logged = 0
    total_sets = 0
    total_volume = 0.0
    total_calories = 0.0
    
    # Calculate totals
    for workout in workouts:
        for entry in workout.get("entries", []):
            total_exercises_logged += 1
            entry_category = entry.get("category", "strength")
            for set_data in entry.get("sets", []):
                total_sets += 1
                if entry_category == "cardio":
                    duration = set_data.get("duration_minutes", 0) or 0
                    if duration > 0:
                        total_calories += calculate_cardio_calories(duration)
                else:
                    weight = set_data.get("weight", 0) or 0
                    reps = set_data.get("reps", 0) or 0
                    if weight > 0 and reps > 0:
                        total_volume += weight * reps
                        total_calories += calculate_strength_calories(weight, reps)
    
    # Calculate streaks
    today = datetime.now(timezone.utc).date()
    workout_dates = sorted(set(w.get("date", "")[:10] for w in workouts), reverse=True)
    
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    
    if workout_dates:
        # Check current streak
        check_date = today
        for i in range(len(workout_dates)):
            date_str = workout_dates[i] if i < len(workout_dates) else None
            if date_str and date_str == check_date.isoformat():
                current_streak += 1
                check_date = check_date - timedelta(days=1)
            elif date_str and date_str == (today - timedelta(days=1)).isoformat() and current_streak == 0:
                check_date = today - timedelta(days=1)
                if date_str == check_date.isoformat():
                    current_streak += 1
                    check_date = check_date - timedelta(days=1)
            else:
                break
        
        # Calculate longest streak
        prev_date = None
        for date_str in sorted(workout_dates):
            try:
                curr_date = datetime.fromisoformat(date_str).date()
                if prev_date is None:
                    temp_streak = 1
                elif (curr_date - prev_date).days == 1:
                    temp_streak += 1
                else:
                    longest_streak = max(longest_streak, temp_streak)
                    temp_streak = 1
                prev_date = curr_date
            except:
                continue
        longest_streak = max(longest_streak, temp_streak, current_streak)
    
    # This week/month counts
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    workouts_this_week = sum(1 for d in workout_dates if d >= week_start.isoformat())
    workouts_this_month = sum(1 for d in workout_dates if d >= month_start.isoformat())
    
    return DashboardStats(
        total_workouts=total_workouts,
        total_exercises_logged=total_exercises_logged,
        total_sets=total_sets,
        total_volume=round(total_volume, 1),
        total_calories=round(total_calories, 1),
        current_streak=current_streak,
        longest_streak=longest_streak,
        workouts_this_week=workouts_this_week,
        workouts_this_month=workouts_this_month
    )

@api_router.get("/progress/{exercise_id}", response_model=List[ProgressData])
async def get_progress(exercise_id: str, days: int = Query(default=30, le=365)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()[:10]
    
    workouts = await db.workouts.find(
        {"date": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(10000)
    
    progress_by_date = {}
    
    for workout in workouts:
        date = workout.get("date", "")[:10]
        for entry in workout.get("entries", []):
            if entry.get("exercise_id") == exercise_id:
                if date not in progress_by_date:
                    progress_by_date[date] = {
                        "date": date,
                        "max_weight": 0,
                        "total_volume": 0,
                        "total_reps": 0,
                        "duration": 0,
                        "distance": 0
                    }
                
                for set_data in entry.get("sets", []):
                    weight = set_data.get("weight", 0) or 0
                    reps = set_data.get("reps", 0) or 0
                    duration = set_data.get("duration_minutes", 0) or 0
                    distance = set_data.get("distance_km", 0) or 0
                    
                    if weight > progress_by_date[date]["max_weight"]:
                        progress_by_date[date]["max_weight"] = weight
                    progress_by_date[date]["total_volume"] += weight * reps
                    progress_by_date[date]["total_reps"] += reps
                    progress_by_date[date]["duration"] += duration
                    progress_by_date[date]["distance"] += distance
    
    return sorted(progress_by_date.values(), key=lambda x: x["date"])

# Recent workouts for dashboard
@api_router.get("/recent-workouts", response_model=List[WorkoutLog])
async def get_recent_workouts():
    workouts = await db.workouts.find({}, {"_id": 0}).sort("date", -1).to_list(5)
    return workouts

# Template Routes
@api_router.get("/templates", response_model=List[WorkoutTemplate])
async def get_templates():
    templates = await db.templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return templates

@api_router.post("/templates", response_model=WorkoutTemplate)
async def create_template(template: WorkoutTemplateCreate):
    template_obj = WorkoutTemplate(**template.model_dump())
    doc = template_obj.model_dump()
    await db.templates.insert_one(doc)
    return template_obj

@api_router.get("/templates/{template_id}", response_model=WorkoutTemplate)
async def get_template(template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.put("/templates/{template_id}", response_model=WorkoutTemplate)
async def update_template(template_id: str, update: WorkoutTemplateUpdate):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.templates.update_one({"id": template_id}, {"$set": update_data})
    
    updated = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
