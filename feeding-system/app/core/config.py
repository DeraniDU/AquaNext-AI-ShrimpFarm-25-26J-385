# Project settings and configuration
import os

MONGO_URI = "mongodb+srv://dbUser:Sama2001@shrimpfeeding.4tifr4r.mongodb.net/shrimpfeeding?retryWrites=true&w=majority"
DB_NAME = "shrimpfeeding"

# Firebase Realtime Database (IoT stepper control)
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyB9_odBVNOO1vQJr5YzI6aie0QWxjCXsbY")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "https://fish-feed-d65d0-default-rtdb.firebaseio.com/")
FIREBASE_USER_EMAIL = os.getenv("FIREBASE_USER_EMAIL", "jithmisamadi2001@gmail.com")
FIREBASE_USER_PASS = os.getenv("FIREBASE_USER_PASS", "samadi1234")
FIREBASE_STEPPER_PATH = "stepper"
