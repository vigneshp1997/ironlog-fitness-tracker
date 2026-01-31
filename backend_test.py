import requests
import sys
import json
from datetime import datetime, timedelta

class WorkoutTrackerAPITester:
    def __init__(self, base_url="https://fitness-metrics-30.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                details += f", Response: {response.json()}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, str(e))
            return False

    def test_get_exercises(self):
        """Test getting all exercises"""
        try:
            response = requests.get(f"{self.api_url}/exercises", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                exercises = response.json()
                exercise_count = len(exercises)
                details += f", Found {exercise_count} exercises"
                
                # Verify we have 100+ exercises as expected
                if exercise_count >= 100:
                    details += " (✓ 100+ exercises requirement met)"
                else:
                    success = False
                    details += f" (✗ Expected 100+, got {exercise_count})"
                
                # Check exercise structure
                if exercises and isinstance(exercises[0], dict):
                    required_fields = ['id', 'name', 'category', 'muscle_group']
                    first_exercise = exercises[0]
                    missing_fields = [field for field in required_fields if field not in first_exercise]
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += ", Exercise structure valid"
                        
            self.log_test("Get All Exercises", success, details)
            return success, exercises if success else []
        except Exception as e:
            self.log_test("Get All Exercises", False, str(e))
            return False, []

    def test_exercise_filtering(self, exercises):
        """Test exercise filtering by muscle group and search"""
        try:
            # Test muscle group filter
            response = requests.get(f"{self.api_url}/exercises?muscle_group=chest", timeout=10)
            success = response.status_code == 200
            details = f"Muscle filter status: {response.status_code}"
            
            if success:
                chest_exercises = response.json()
                details += f", Found {len(chest_exercises)} chest exercises"
                
                # Verify all returned exercises are chest exercises
                if chest_exercises:
                    non_chest = [ex for ex in chest_exercises if ex.get('muscle_group') != 'chest']
                    if non_chest:
                        success = False
                        details += f", Found {len(non_chest)} non-chest exercises in results"
                    else:
                        details += " (✓ All results are chest exercises)"

            # Test search filter
            if success:
                response = requests.get(f"{self.api_url}/exercises?search=bench", timeout=10)
                search_success = response.status_code == 200
                if search_success:
                    search_results = response.json()
                    details += f", Search 'bench' found {len(search_results)} exercises"
                    
                    # Verify search results contain 'bench' in name
                    if search_results:
                        non_matching = [ex for ex in search_results if 'bench' not in ex.get('name', '').lower()]
                        if non_matching:
                            success = False
                            details += f", {len(non_matching)} results don't match search term"
                        else:
                            details += " (✓ All search results match)"
                else:
                    success = False
                    details += f", Search failed with status {response.status_code}"

            self.log_test("Exercise Filtering", success, details)
            return success
        except Exception as e:
            self.log_test("Exercise Filtering", False, str(e))
            return False

    def test_create_workout(self):
        """Test creating a workout"""
        try:
            # First get an exercise to use
            exercises_response = requests.get(f"{self.api_url}/exercises?limit=1", timeout=10)
            if exercises_response.status_code != 200:
                self.log_test("Create Workout", False, "Failed to get exercises for test")
                return False, None

            exercises = exercises_response.json()
            if not exercises:
                self.log_test("Create Workout", False, "No exercises available for test")
                return False, None

            exercise = exercises[0]
            
            # Create test workout data
            workout_data = {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "entries": [
                    {
                        "exercise_id": exercise["id"],
                        "exercise_name": exercise["name"],
                        "category": exercise["category"],
                        "sets": [
                            {
                                "set_number": 1,
                                "reps": 10 if exercise["category"] == "strength" else None,
                                "weight": 80.0 if exercise["category"] == "strength" else None,  # Using kg
                                "duration_minutes": 30.0 if exercise["category"] == "cardio" else None,
                                "distance_km": 5.0 if exercise["category"] == "cardio" else None
                            }
                        ]
                    }
                ],
                "notes": "Test workout from API testing"
            }

            response = requests.post(
                f"{self.api_url}/workouts",
                json=workout_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            workout_id = None
            if success:
                created_workout = response.json()
                workout_id = created_workout.get("id")
                details += f", Created workout ID: {workout_id}"
                
                # Verify workout structure
                required_fields = ['id', 'date', 'entries', 'created_at']
                missing_fields = [field for field in required_fields if field not in created_workout]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += ", Workout structure valid"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test("Create Workout", success, details)
            return success, workout_id
        except Exception as e:
            self.log_test("Create Workout", False, str(e))
            return False, None

    def test_get_workouts(self):
        """Test getting workouts"""
        try:
            response = requests.get(f"{self.api_url}/workouts", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                workouts = response.json()
                details += f", Found {len(workouts)} workouts"
                
                # Check workout structure if any exist
                if workouts and isinstance(workouts[0], dict):
                    required_fields = ['id', 'date', 'entries']
                    first_workout = workouts[0]
                    missing_fields = [field for field in required_fields if field not in first_workout]
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += ", Workout structure valid"

            self.log_test("Get Workouts", success, details)
            return success, workouts if success else []
        except Exception as e:
            self.log_test("Get Workouts", False, str(e))
            return False, []

    def test_get_stats(self):
        """Test getting dashboard stats"""
        try:
            response = requests.get(f"{self.api_url}/stats", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                stats = response.json()
                required_fields = [
                    'total_workouts', 'total_exercises_logged', 'total_sets',
                    'total_volume', 'total_calories', 'current_streak', 'longest_streak',
                    'workouts_this_week', 'workouts_this_month'
                ]
                
                missing_fields = [field for field in required_fields if field not in stats]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Stats: {stats['total_workouts']} workouts, {stats['total_sets']} sets, {stats['total_volume']} kg volume, {stats['total_calories']} calories, {stats['current_streak']} day streak"
                    
                    # Verify calories field is present and numeric
                    if 'total_calories' in stats and isinstance(stats['total_calories'], (int, float)):
                        details += " (✓ Calories tracking working)"
                    else:
                        success = False
                        details += " (✗ Calories field missing or invalid)"

            self.log_test("Get Dashboard Stats", success, details)
            return success
        except Exception as e:
            self.log_test("Get Dashboard Stats", False, str(e))
            return False

    def test_create_custom_exercise(self):
        """Test creating a custom exercise"""
        try:
            # Create test exercise data
            exercise_data = {
                "name": f"Test Custom Exercise {datetime.now().strftime('%H%M%S')}",
                "category": "strength",
                "muscle_group": "chest",
                "description": "Test exercise created by API testing"
            }

            response = requests.post(
                f"{self.api_url}/exercises",
                json=exercise_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            exercise_id = None
            if success:
                created_exercise = response.json()
                exercise_id = created_exercise.get("id")
                details += f", Created exercise ID: {exercise_id}"
                
                # Verify exercise structure
                required_fields = ['id', 'name', 'category', 'muscle_group']
                missing_fields = [field for field in required_fields if field not in created_exercise]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Exercise '{created_exercise['name']}' ({created_exercise['category']}/{created_exercise['muscle_group']})"
                    
                    # Verify the data matches what we sent
                    if (created_exercise['name'] == exercise_data['name'] and 
                        created_exercise['category'] == exercise_data['category'] and
                        created_exercise['muscle_group'] == exercise_data['muscle_group']):
                        details += " (✓ Data matches)"
                    else:
                        success = False
                        details += " (✗ Data mismatch)"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test("Create Custom Exercise", success, details)
            return success, exercise_id
        except Exception as e:
            self.log_test("Create Custom Exercise", False, str(e))
            return False, None

    def test_weight_units_kg(self):
        """Test that weight values are in kg throughout the system"""
        try:
            # Create a strength workout with weight in kg
            exercises_response = requests.get(f"{self.api_url}/exercises?category=strength&limit=1", timeout=10)
            if exercises_response.status_code != 200:
                self.log_test("Weight Units (kg)", False, "Failed to get strength exercises")
                return False

            exercises = exercises_response.json()
            if not exercises:
                self.log_test("Weight Units (kg)", False, "No strength exercises available")
                return False

            exercise = exercises[0]
            
            # Create workout with weight in kg
            workout_data = {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "entries": [
                    {
                        "exercise_id": exercise["id"],
                        "exercise_name": exercise["name"],
                        "category": exercise["category"],
                        "sets": [
                            {
                                "set_number": 1,
                                "reps": 10,
                                "weight": 100.0  # 100 kg
                            }
                        ]
                    }
                ],
                "notes": "Test workout for kg verification"
            }

            # Create the workout
            create_response = requests.post(
                f"{self.api_url}/workouts",
                json=workout_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test("Weight Units (kg)", False, "Failed to create test workout")
                return False

            created_workout = create_response.json()
            workout_id = created_workout.get("id")

            # Check stats to see if volume is calculated correctly (should be 100kg * 10 reps = 1000)
            stats_response = requests.get(f"{self.api_url}/stats", timeout=10)
            success = stats_response.status_code == 200
            details = f"Workout created with 100kg weight"
            
            if success:
                stats = stats_response.json()
                total_volume = stats.get('total_volume', 0)
                details += f", Total volume in stats: {total_volume} kg"
                
                # The volume should include our 1000 kg (100kg * 10 reps)
                if total_volume >= 1000:
                    details += " (✓ Weight calculations in kg)"
                else:
                    success = False
                    details += " (✗ Weight calculations may not be in kg)"

            # Clean up - delete the test workout
            if workout_id:
                requests.delete(f"{self.api_url}/workouts/{workout_id}", timeout=10)

            self.log_test("Weight Units (kg)", success, details)
            return success
        except Exception as e:
            self.log_test("Weight Units (kg)", False, str(e))
            return False

    def test_calorie_calculation(self):
        """Test calorie calculation for both strength and cardio exercises"""
        try:
            success = True
            details = ""
            
            # Test strength exercise calorie calculation
            strength_exercises = requests.get(f"{self.api_url}/exercises?category=strength&limit=1", timeout=10)
            if strength_exercises.status_code == 200:
                exercises = strength_exercises.json()
                if exercises:
                    exercise = exercises[0]
                    
                    # Create strength workout
                    workout_data = {
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "entries": [
                            {
                                "exercise_id": exercise["id"],
                                "exercise_name": exercise["name"],
                                "category": "strength",
                                "sets": [
                                    {
                                        "set_number": 1,
                                        "reps": 10,
                                        "weight": 50.0  # 50 kg
                                    }
                                ]
                            }
                        ]
                    }
                    
                    create_response = requests.post(
                        f"{self.api_url}/workouts",
                        json=workout_data,
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                    
                    if create_response.status_code == 200:
                        workout = create_response.json()
                        workout_id = workout.get("id")
                        details += "Strength workout created (50kg × 10 reps)"
                        
                        # Check if calories are calculated in stats
                        stats_response = requests.get(f"{self.api_url}/stats", timeout=10)
                        if stats_response.status_code == 200:
                            stats = stats_response.json()
                            calories = stats.get('total_calories', 0)
                            details += f", Total calories: {calories}"
                            
                            # Expected: 50kg * 10 reps * 0.05 * 1.3 = 32.5 calories (approximately)
                            if calories > 0:
                                details += " (✓ Strength calories calculated)"
                            else:
                                success = False
                                details += " (✗ No strength calories calculated)"
                        
                        # Clean up
                        if workout_id:
                            requests.delete(f"{self.api_url}/workouts/{workout_id}", timeout=10)
                    else:
                        success = False
                        details += "Failed to create strength workout"
            
            # Test cardio exercise calorie calculation
            cardio_exercises = requests.get(f"{self.api_url}/exercises?category=cardio&limit=1", timeout=10)
            if cardio_exercises.status_code == 200:
                exercises = cardio_exercises.json()
                if exercises:
                    exercise = exercises[0]
                    
                    # Create cardio workout
                    workout_data = {
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "entries": [
                            {
                                "exercise_id": exercise["id"],
                                "exercise_name": exercise["name"],
                                "category": "cardio",
                                "sets": [
                                    {
                                        "set_number": 1,
                                        "duration_minutes": 30.0  # 30 minutes
                                    }
                                ]
                            }
                        ]
                    }
                    
                    create_response = requests.post(
                        f"{self.api_url}/workouts",
                        json=workout_data,
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                    
                    if create_response.status_code == 200:
                        workout = create_response.json()
                        workout_id = workout.get("id")
                        details += ", Cardio workout created (30 min)"
                        
                        # Check if calories are calculated in stats
                        stats_response = requests.get(f"{self.api_url}/stats", timeout=10)
                        if stats_response.status_code == 200:
                            stats = stats_response.json()
                            calories = stats.get('total_calories', 0)
                            details += f", Updated total calories: {calories}"
                            
                            # Expected: 7 MET * 70kg * 0.5 hours = 245 calories (approximately)
                            if calories > 200:  # Should be significantly higher with cardio
                                details += " (✓ Cardio calories calculated)"
                            else:
                                success = False
                                details += " (✗ Cardio calories may not be calculated)"
                        
                        # Clean up
                        if workout_id:
                            requests.delete(f"{self.api_url}/workouts/{workout_id}", timeout=10)
                    else:
                        success = False
                        details += ", Failed to create cardio workout"

            self.log_test("Calorie Calculation", success, details)
            return success
        except Exception as e:
            self.log_test("Calorie Calculation", False, str(e))
            return False
        """Test getting recent workouts"""
        try:
            response = requests.get(f"{self.api_url}/recent-workouts", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                recent_workouts = response.json()
                details += f", Found {len(recent_workouts)} recent workouts"

            self.log_test("Get Recent Workouts", success, details)
            return success
        except Exception as e:
            self.log_test("Get Recent Workouts", False, str(e))
            return False

    def test_get_progress(self, exercise_id=None):
        """Test getting progress data"""
        try:
            # If no exercise_id provided, get one from exercises
            if not exercise_id:
                exercises_response = requests.get(f"{self.api_url}/exercises?limit=1", timeout=10)
                if exercises_response.status_code == 200:
                    exercises = exercises_response.json()
                    if exercises:
                        exercise_id = exercises[0]["id"]
                    else:
                        self.log_test("Get Progress", False, "No exercises available for progress test")
                        return False
                else:
                    self.log_test("Get Progress", False, "Failed to get exercises for progress test")
                    return False

            response = requests.get(f"{self.api_url}/progress/{exercise_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                progress_data = response.json()
                details += f", Found {len(progress_data)} progress entries"
                
                # Check progress data structure if any exist
                if progress_data and isinstance(progress_data[0], dict):
                    required_fields = ['date']
                    first_entry = progress_data[0]
                    missing_fields = [field for field in required_fields if field not in first_entry]
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += ", Progress structure valid"

            self.log_test("Get Progress Data", success, details)
            return success
        except Exception as e:
            self.log_test("Get Progress Data", False, str(e))
            return False

    def test_delete_workout(self, workout_id):
        """Test deleting a workout"""
        if not workout_id:
            self.log_test("Delete Workout", False, "No workout ID provided")
            return False

        try:
            response = requests.delete(f"{self.api_url}/workouts/{workout_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                result = response.json()
                details += f", Response: {result}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test("Delete Workout", success, details)
            return success
        except Exception as e:
            self.log_test("Delete Workout", False, str(e))
            return False

    def test_get_templates(self):
        """Test getting all templates"""
        try:
            response = requests.get(f"{self.api_url}/templates", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                templates = response.json()
                details += f", Found {len(templates)} templates"
                
                # Check template structure if any exist
                if templates and isinstance(templates[0], dict):
                    required_fields = ['id', 'name', 'exercises', 'created_at']
                    first_template = templates[0]
                    missing_fields = [field for field in required_fields if field not in first_template]
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += ", Template structure valid"

            self.log_test("Get Templates", success, details)
            return success, templates if success else []
        except Exception as e:
            self.log_test("Get Templates", False, str(e))
            return False, []

    def test_create_template(self):
        """Test creating a template"""
        try:
            # First get some exercises to use
            exercises_response = requests.get(f"{self.api_url}/exercises?limit=3", timeout=10)
            if exercises_response.status_code != 200:
                self.log_test("Create Template", False, "Failed to get exercises for test")
                return False, None

            exercises = exercises_response.json()
            if len(exercises) < 2:
                self.log_test("Create Template", False, "Not enough exercises available for test")
                return False, None

            # Create test template data
            template_data = {
                "name": f"Test Template {datetime.now().strftime('%H%M%S')}",
                "description": "Test template created by API testing",
                "exercises": [
                    {
                        "exercise_id": exercises[0]["id"],
                        "exercise_name": exercises[0]["name"],
                        "category": exercises[0]["category"],
                        "default_sets": 3
                    },
                    {
                        "exercise_id": exercises[1]["id"],
                        "exercise_name": exercises[1]["name"],
                        "category": exercises[1]["category"],
                        "default_sets": 4
                    }
                ]
            }

            response = requests.post(
                f"{self.api_url}/templates",
                json=template_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            template_id = None
            if success:
                created_template = response.json()
                template_id = created_template.get("id")
                details += f", Created template ID: {template_id}"
                
                # Verify template structure
                required_fields = ['id', 'name', 'exercises', 'created_at']
                missing_fields = [field for field in required_fields if field not in created_template]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Template '{created_template['name']}' with {len(created_template['exercises'])} exercises"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test("Create Template", success, details)
            return success, template_id
        except Exception as e:
            self.log_test("Create Template", False, str(e))
            return False, None

    def test_get_template(self, template_id):
        """Test getting a specific template"""
        if not template_id:
            self.log_test("Get Template", False, "No template ID provided")
            return False

        try:
            response = requests.get(f"{self.api_url}/templates/{template_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                template = response.json()
                details += f", Retrieved template '{template.get('name')}' with {len(template.get('exercises', []))} exercises"
                
                # Verify template structure
                required_fields = ['id', 'name', 'exercises', 'created_at']
                missing_fields = [field for field in required_fields if field not in template]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test("Get Template", success, details)
            return success
        except Exception as e:
            self.log_test("Get Template", False, str(e))
            return False

    def test_update_template(self, template_id):
        """Test updating a template"""
        if not template_id:
            self.log_test("Update Template", False, "No template ID provided")
            return False

        try:
            # Update template data
            update_data = {
                "name": f"Updated Test Template {datetime.now().strftime('%H%M%S')}",
                "description": "Updated description from API testing"
            }

            response = requests.put(
                f"{self.api_url}/templates/{template_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                updated_template = response.json()
                details += f", Updated template '{updated_template.get('name')}'"
                
                # Verify the update was applied
                if updated_template.get('name') == update_data['name']:
                    details += " (✓ Name updated correctly)"
                else:
                    success = False
                    details += " (✗ Name not updated)"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test("Update Template", success, details)
            return success
        except Exception as e:
            self.log_test("Update Template", False, str(e))
            return False

    def test_delete_template(self, template_id):
        """Test deleting a template"""
        if not template_id:
            self.log_test("Delete Template", False, "No template ID provided")
            return False

        try:
            response = requests.delete(f"{self.api_url}/templates/{template_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                result = response.json()
                details += f", Response: {result}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test("Delete Template", success, details)
            return success
        except Exception as e:
            self.log_test("Delete Template", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🏋️ Starting Workout Tracker API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test 1: Health check
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return self.get_summary()

        # Test 2: Get exercises
        exercises_success, exercises = self.test_get_exercises()
        if not exercises_success:
            print("❌ Exercise retrieval failed - stopping tests")
            return self.get_summary()

        # Test 3: Exercise filtering
        self.test_exercise_filtering(exercises)

        # Test 4: Create workout
        workout_success, workout_id = self.test_create_workout()

        # Test 5: Get workouts
        self.test_get_workouts()

        # Test 6: Get stats
        self.test_get_stats()

        # Test 7: Get recent workouts
        self.test_get_recent_workouts()

        # Test 8: Get progress
        self.test_get_progress()

        # Test 9: Template CRUD operations
        print("\n🗂️ Testing Template Features...")
        
        # Get existing templates
        templates_success, existing_templates = self.test_get_templates()
        
        # Create new template
        template_success, template_id = self.test_create_template()
        
        # Test template operations if creation succeeded
        if template_success and template_id:
            # Get specific template
            self.test_get_template(template_id)
            
            # Update template
            self.test_update_template(template_id)
            
            # Delete template
            self.test_delete_template(template_id)

        # Test 10: Delete workout (if we created one)
        if workout_success and workout_id:
            self.test_delete_workout(workout_id)

        return self.get_summary()

    def get_summary(self):
        """Get test summary"""
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            failed_tests = [result for result in self.test_results if result["status"] == "FAILED"]
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
            return False

def main():
    """Main test runner"""
    tester = WorkoutTrackerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())