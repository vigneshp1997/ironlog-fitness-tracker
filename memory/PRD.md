# IRONLOG - Workout Tracker App

## Original Problem Statement
Build a daily weight tracker web app to track sets and reps across exercises in weight training regimen. App should contain all possible exercise variations in database, allow selecting exercises, add variations and reps, track progress, and derive insights. Also track cardio exercises.

## User Choices
- Pre-populated exercise database with 100+ exercises
- Both basic stats AND charts/graphs for progress insights
- No authentication (direct URL access)
- Dark theme with gym/fitness vibe

## Architecture
- **Frontend**: React 19 with Shadcn/UI components, Recharts for data visualization
- **Backend**: FastAPI with async MongoDB (Motor)
- **Database**: MongoDB with collections: exercises, workouts
- **Styling**: Tailwind CSS with custom dark theme ("The Performance Pro")

## Core Requirements
1. Exercise database with 100+ pre-populated exercises (strength + cardio)
2. Log workouts with sets/reps/weight (strength) or duration/distance (cardio)
3. View workout history with expandable details
4. Track progress with charts and graphs
5. Dashboard with key stats (total workouts, streak, volume)

## What's Been Implemented (Jan 31, 2026)
- ✅ Pre-populated exercise database (100+ exercises across 9 muscle groups)
- ✅ Dashboard with stats cards and quick actions
- ✅ Log Workout page with date picker, exercise selector, set management
- ✅ Exercise Library with search and filtering
- ✅ Progress page with line/bar charts
- ✅ History page with expandable workout details and delete functionality
- ✅ Dark theme with Barlow Condensed + Inter fonts
- ✅ **Workout Templates** - Create reusable routines (Push Day, Leg Day, etc.)
  - Create/edit/delete templates
  - Add exercises from catalog to templates
  - Load templates when logging workouts to pre-fill exercises

## API Endpoints
- GET /api/exercises - List exercises with optional filtering
- POST /api/exercises - Create custom exercise
- POST /api/workouts - Log new workout
- GET /api/workouts - Get workout history
- DELETE /api/workouts/{id} - Delete workout
- GET /api/stats - Get dashboard statistics
- GET /api/progress/{exercise_id} - Get progress data for charts
- GET /api/templates - List all workout templates
- POST /api/templates - Create new template
- PUT /api/templates/{id} - Update template
- DELETE /api/templates/{id} - Delete template

## Prioritized Backlog
### P0 (Critical) - DONE
- [x] Exercise database
- [x] Workout logging
- [x] Basic stats
- [x] Workout templates

### P1 (Important) - Future
- [ ] Personal records tracking per exercise
- [ ] Export data to CSV

### P2 (Nice to have) - Future
- [ ] Goal setting and tracking
- [ ] Social sharing
- [ ] Mobile-optimized PWA
