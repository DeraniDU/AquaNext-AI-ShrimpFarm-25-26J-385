/**
 * Firebase Realtime Database — update /stepper (running, speed) from AI chunk.
 * Matches backend logic: running = true when feeding (low/high), speed = 0|1|2.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCzKh0ESFrVUPkAK1eQhr6blH9UrKpcHx0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shrimp-feed.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://shrimp-feed-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shrimp-feed",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "shrimp-feed.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "710398548078",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:710398548078:web:f43e85a20f0791950a2e7f",
};

const FIREBASE_USER_EMAIL = import.meta.env.VITE_FIREBASE_USER_EMAIL || "jithmisamadi2001@gmail.com";
const FIREBASE_USER_PASS = import.meta.env.VITE_FIREBASE_USER_PASS || "samadi1234";

let app = null;
let auth = null;
let db = null;

const LOG_PREFIX = "[Firebase]";

function isConfigured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && FIREBASE_USER_EMAIL && FIREBASE_USER_PASS);
}

async function getFirebase() {
  if (db) {
    console.log(`${LOG_PREFIX} Using existing connection`);
    return { app, auth, db };
  }
  if (!isConfigured()) {
    const missing = [];
    if (!firebaseConfig.apiKey) missing.push("VITE_FIREBASE_API_KEY");
    if (!firebaseConfig.databaseURL) missing.push("VITE_FIREBASE_DATABASE_URL");
    if (!FIREBASE_USER_EMAIL) missing.push("VITE_FIREBASE_USER_EMAIL");
    if (!FIREBASE_USER_PASS) missing.push("VITE_FIREBASE_USER_PASS");
    console.warn(`${LOG_PREFIX} Not configured — missing: ${missing.join(", ")}. Set in .env to enable /stepper updates.`);
    return null;
  }
  try {
    console.log(`${LOG_PREFIX} Initializing (databaseURL: ${firebaseConfig.databaseURL})`);
    const { initializeApp } = await import("firebase/app");
    const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
    const { getDatabase } = await import("firebase/database");
    app = app || initializeApp(firebaseConfig);
    auth = auth || getAuth(app);
    db = db || getDatabase(app);
    if (!auth.currentUser) {
      console.log(`${LOG_PREFIX} Signing in with email...`);
      await signInWithEmailAndPassword(auth, FIREBASE_USER_EMAIL, FIREBASE_USER_PASS);
      console.log(`${LOG_PREFIX} Auth OK`);
    }
    return { app, auth, db };
  } catch (e) {
    console.warn(`${LOG_PREFIX} Init/sign-in failed:`, e?.message || e);
    return null;
  }
}

/**
 * From chunk (BE response): label "high"|"low"|"no", motor_speed 0|0.4|1.0
 * → speed 0|1|2, running true|false (same as backend).
 */
function chunkToStepper(chunk) {
  const label = (chunk?.label || "no").toLowerCase();
  const motorSpeed = chunk?.motor_speed ?? 0;
  let speed = 0;
  if (label === "no" || motorSpeed < 0.01) speed = 0;
  else if (label === "low" || motorSpeed <= 0.5) speed = 1;
  else speed = 2;
  const running = speed !== 0;
  return { running, speed };
}

/**
 * Update Firebase /stepper from a chunk (e.g. when table shows a Confirmed chunk).
 * Call when decision_status === "Confirmed" to keep FE and Firebase in sync with BE.
 */
export async function updateStepperFromChunk(chunk) {
  if (!chunk) {
    console.log(`${LOG_PREFIX} updateStepperFromChunk skipped: no chunk`);
    return;
  }
  if (chunk.decision_status !== "Confirmed") {
    console.log(`${LOG_PREFIX} updateStepperFromChunk skipped: decision_status="${chunk.decision_status}" (only Confirmed chunks update Firebase)`);
    return;
  }
  const { running, speed } = chunkToStepper(chunk);
  const label = (chunk?.label || "no").toLowerCase();
  console.log(`${LOG_PREFIX} Chunk confirmed: label=${label}, motor_speed=${chunk?.motor_speed} → running=${running}, speed=${speed} (0=stop 1=slow 2=medium)`);
  const firebase = await getFirebase();
  if (!firebase) {
    console.warn(`${LOG_PREFIX} /stepper update skipped: Firebase not available`);
    return;
  }
  try {
    const { ref, update } = await import("firebase/database");
    const stepperRef = ref(firebase.db, "stepper");
    console.log(`${LOG_PREFIX} PATCH /stepper with { running: ${running}, speed: ${speed} }`);
    await update(stepperRef, { running, speed });
    console.log(`${LOG_PREFIX} /stepper updated OK — running=${running}, speed=${speed}`);
  } catch (e) {
    console.warn(`${LOG_PREFIX} /stepper update failed:`, e?.message || e);
  }
}

export { chunkToStepper, isConfigured };
