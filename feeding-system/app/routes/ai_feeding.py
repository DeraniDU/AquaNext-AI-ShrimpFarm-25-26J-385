from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import JSONResponse
import numpy as np
import librosa
import io
from datetime import datetime
from bson import ObjectId
from uuid import uuid4

from app.database.feeding_event_repo import save_feeding_event
from app.core.model_loader import load_ai_model
from app.database.mongo import db
from app.utils.feed_calculator import calculate_daily_feed

router = APIRouter(prefix="/ai-feeding", tags=["AI Feeding"])

# ---------------- Load model once ----------------
MODEL, LABELS = load_ai_model()

# ---------------- Constants ----------------
CHUNK_DURATION = 15.0  # seconds
SR = 22050
CONFIRM_REQUIRED = 2

# ---------------- Motor mapping ----------------
FEEDER_MAP = {
    "high": ("Feed fast", 1.0),
    "low": ("Feed slow", 0.4),
    "no": ("Motor OFF", 0.0),
}

# ---------------- State memory ----------------
last_confirmed_label = None
last_motor_speed = None

# ---------------- Helpers ----------------
def audio_to_mel(y, sr=SR):
    S = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=1024, hop_length=512, n_mels=128
    )
    S_db = librosa.power_to_db(S, ref=np.max)

    # Force fixed shape
    S_db = S_db[:, :469]
    if S_db.shape[1] < 469:
        S_db = np.pad(S_db, ((0, 0), (0, 469 - S_db.shape[1])), mode="constant")

    return S_db


def predict_chunk(y):
    mel = audio_to_mel(y)
    mel = mel.reshape(1, 128, 469, 1).astype("float32")
    preds = MODEL.predict(mel, verbose=0)[0]

    idx = int(np.argmax(preds))
    return LABELS[idx], float(preds[idx])


async def update_batch_last_feed_date(batch_id: str = None):
    """
    Update lastFeedDate for a specific batch when AI feeding occurs.
    If batch_id is None, updates all active batches (backward compatibility).
    """
    try:
        now = datetime.utcnow()
        print(f"📝 update_batch_last_feed_date called with batch_id: {batch_id}")
        
        if batch_id:
            # Update only the specific batch
            from bson import ObjectId
            print(f"🔍 Validating batch_id format: {batch_id}")
            
            if ObjectId.is_valid(batch_id):
                print(f"✅ batch_id is valid ObjectId, updating batch...")
                result = await db.farmerinputs.update_one(
                    {"_id": ObjectId(batch_id)},
                    {"$set": {"lastFeedDate": now, "updatedAt": now}}
                )
                print(f"📊 Update result: matched={result.matched_count}, modified={result.modified_count}")
                
                if result.modified_count > 0:
                    print(f"✅ Updated lastFeedDate for batch {batch_id} at {now.isoformat()}")
                elif result.matched_count > 0:
                    print(f"⚠️ Batch {batch_id} found but not modified (maybe same value?)")
                else:
                    print(f"⚠️ Batch {batch_id} not found in database with _id")
                    # Try to find the batch by searching all batches and matching the string id
                    # This handles cases where batch_id might be the string representation
                    all_batches = db.farmerinputs.find({})
                    found_batch = None
                    async for batch in all_batches:
                        if str(batch.get("_id")) == batch_id:
                            found_batch = batch
                            break
                    
                    if found_batch:
                        print(f"🔍 Found batch by string matching, updating with _id: {found_batch.get('_id')}")
                        result2 = await db.farmerinputs.update_one(
                            {"_id": found_batch["_id"]},
                            {"$set": {"lastFeedDate": now, "updatedAt": now}}
                        )
                        if result2.modified_count > 0:
                            print(f"✅ Updated lastFeedDate using string match fallback")
                        else:
                            print(f"⚠️ Found batch but update didn't modify (matched={result2.matched_count})")
                    else:
                        print(f"❌ Could not find batch with id: {batch_id} in any format")
            else:
                print(f"⚠️ Invalid batch_id format: {batch_id} (not a valid ObjectId)")
        else:
            # Backward compatibility: update all active batches if no batch_id provided
            result = await db.farmerinputs.update_many(
                {"status": "active"},
                {"$set": {"lastFeedDate": now, "updatedAt": now}}
            )
            if result.modified_count > 0:
                print(f"✅ Updated lastFeedDate for {result.modified_count} active batch(es) at {now.isoformat()}")
            else:
                print(f"⚠️ No active batches found to update lastFeedDate")
    except Exception as e:
        print(f"⚠️ Error updating batch lastFeedDate: {e}")
        import traceback
        traceback.print_exc()


# ---------------- API ----------------
@router.post("/")
async def ai_feeding(
    file: UploadFile = File(...), 
    batchId: str = Query(None, description="Specific batch ID for this feeding")
):
    """
    Process audio file for AI feeding decision.
    batchId: Optional - specific batch ID for this feeding. If not provided, updates all active batches (backward compatibility).
    """
    global last_confirmed_label, last_motor_speed
    
    print(f"🎯 Received batchId parameter: {batchId} (type: {type(batchId)})")
    if batchId:
        print(f"✅ Processing audio for specific batch: {batchId}")
    else:
        print(f"⚠️ No batchId provided - will update all active batches (backward compatibility)")
    
    # Store batchId in a way that persists through the processing loop
    processing_batch_id = batchId

    # Store initial state to track changes within this file processing
    # Don't reset global state - it should persist across files to track actual motor state
    initial_motor_speed = last_motor_speed if last_motor_speed is not None else 0.0
    initial_confirmed_label = last_confirmed_label
    
    # Get the actual current motor state from database to ensure accuracy
    from app.database.feeding_event_repo import get_current_motor_status
    current_db_status = await get_current_motor_status()
    db_motor_speed = current_db_status.get("motor_speed", 0.0)
    
    # Use database state if global state is None or different (more reliable)
    if last_motor_speed is None or abs(last_motor_speed - db_motor_speed) > 0.01:
        print(f"⚠️ Global state ({last_motor_speed}) doesn't match DB state ({db_motor_speed}). Using DB state.")
        last_motor_speed = db_motor_speed
        initial_motor_speed = db_motor_speed
    
    print(f"🔄 Starting audio processing. Initial motor state: {initial_confirmed_label or 'none'} (speed: {initial_motor_speed * 100}%)")
    print(f"📊 Global last_motor_speed: {last_motor_speed}, DB motor_speed: {db_motor_speed}")

    audio_bytes = await file.read()
    audio, _ = librosa.load(io.BytesIO(audio_bytes), sr=SR)

    chunk_samples = int(CHUNK_DURATION * SR)
    pos = 0
    chunk_index = 0

    pending_label = None
    pending_count = 0

    results = []
    
    # Track the final confirmed state and confidence to save at the end
    final_confirmed_label = None
    final_confirmed_confidence = None
    # Track the latest confirmed state throughout processing
    latest_confirmed_state = None
    latest_confirmed_confidence = None

    while pos < len(audio):
        chunk = audio[pos : pos + chunk_samples]
        label, confidence = predict_chunk(chunk)

        # Calculate time range for this chunk
        time_start = chunk_index * CHUNK_DURATION
        time_end = (chunk_index + 1) * CHUNK_DURATION

        # ---------- Confirmation logic ----------
        if label == pending_label:
            pending_count += 1
        else:
            pending_label = label
            pending_count = 1

        # Determine decision status
        if chunk_index == 0:
            # Very first chunk - Initializing (motor stays in previous state)
            decision_status = "Initializing"
        elif pending_count < CONFIRM_REQUIRED:
            # Waiting for confirmation
            decision_status = f"Waiting ({pending_count}/{CONFIRM_REQUIRED})"
        else:
            # Confirmed - motor action will be applied
            decision_status = "Confirmed"
            last_confirmed_label = label
            pending_label = None
            pending_count = 0

        # ---------- Motor decision ----------
        active_label = last_confirmed_label or "no"
        motor_action, motor_speed = FEEDER_MAP[active_label]

        # ---------- SAVE EVENT WHEN CONFIRMED ----------
        # Save event when chunk is confirmed (regardless of motor change)
        # This ensures events are saved for each confirmed decision, matching live display
        if decision_status == "Confirmed":
            # Track latest confirmed state (this is the actual motor state)
            latest_confirmed_state = active_label
            latest_confirmed_confidence = confidence
            final_confirmed_label = active_label
            final_confirmed_confidence = confidence
            
            # Note: lastFeedDate update moved to END of processing to avoid redundant updates
            # This is more efficient and ensures it's updated even if no confirmed chunks exist
            
            # Only save motor event if motor actually changed (to avoid duplicate events during processing)
            # This is the CORRECT logic: Motor event = confirmed decision + motor state change
            previous_speed = last_motor_speed if last_motor_speed is not None else initial_motor_speed
            print(f"🔍 Checking motor change: previous={previous_speed * 100}%, new={motor_speed * 100}%, active_label={active_label}")
            
            if abs(motor_speed - previous_speed) > 0.01:  # Use abs() and small threshold for float comparison
                # Map to correct state format for database
                state_mapping = {
                    "high": "feeding_fast",
                    "low": "feeding_slow",
                    "no": "stopped"
                }
                state_for_db = state_mapping.get(active_label, "stopped")
                
                print(f"✅ Motor event created: {active_label} (speed: {previous_speed * 100}% → {motor_speed * 100}%)")
                
                # Prepare event data with batchId if provided
                event_data = {
                    "to_state": active_label,
                    "state": state_for_db,  # Use correct format: "feeding_fast", "feeding_slow", or "stopped"
                    "motor_speed": motor_speed,
                    "confidence": confidence,
                    "source": "ai_feeding"  # Mark as AI decision
                }
                
                # Add batchId if provided - ensure it's stored as string for consistent querying
                if batchId:
                    event_data["batchId"] = str(batchId)  # Store as string for consistent matching
                    print(f"📦 Saving event for batch: {batchId} (stored as: {str(batchId)})")
                
                await save_feeding_event(event_data)
                last_motor_speed = motor_speed
            else:
                print(f"ℹ️ Confirmed {active_label} but motor unchanged ({motor_speed * 100}%) - no event created (correct)")

        results.append({
            "label": label,
            "confirmed_label": last_confirmed_label,
            "motor_action": motor_action,
            "motor_speed": motor_speed,
            "confidence": confidence,
            "decision_status": decision_status,
            "time_start": time_start,
            "time_end": time_end
        })

        pos += chunk_samples
        chunk_index += 1

    # ---------- MOTOR EVENT LOGIC (CORRECT) ----------
    # Motor events are created ONLY when:
    # 1. Decision is "Confirmed" AND
    # 2. Motor state actually changes
    # 
    # We do NOT save events for:
    # - Initialization step
    # - Waiting step  
    # - Same confirmed state continuing (no change)
    #
    # Events are already saved during processing when motor changes (lines 128-144)
    # No need to save final state again - it's already saved if it changed
    
    # Find the final confirmed state for logging/debugging
    last_confirmed_chunk = None
    for chunk_result in reversed(results):
        if chunk_result.get("decision_status") == "Confirmed":
            last_confirmed_chunk = chunk_result
            break
    
    # Update lastFeedDate at the END of processing (ONLY ONCE)
    # This ensures it's updated after all processing is complete, regardless of chunk results
    if processing_batch_id:
        print(f"🔄 Updating lastFeedDate at end of processing for batch: {processing_batch_id}")
        try:
            await update_batch_last_feed_date(processing_batch_id)
            print(f"✅ Completed lastFeedDate update at end for batch: {processing_batch_id}")
        except Exception as e:
            print(f"❌ Error updating lastFeedDate at end: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"⚠️ No batchId to update lastFeedDate at end")
    
    # Save feeding record to feedingresults if confirmed feeding decision was made
    # Save EVERY confirmed decision (high, low, or no) - this creates a complete history
    if processing_batch_id and last_confirmed_chunk:
        final_state = last_confirmed_chunk.get("confirmed_label") or last_confirmed_chunk.get("label")
        # Save record for ALL confirmed decisions (high, low, or no)
        # This ensures complete history of all AI feeding decisions
        try:
            # Check if batch exists
            if not ObjectId.is_valid(processing_batch_id):
                print(f"⚠️ Invalid batchId: {processing_batch_id}")
            else:
                batch = await db.farmerinputs.find_one({"_id": ObjectId(processing_batch_id)})
                if not batch:
                    print(f"⚠️ Batch not found: {processing_batch_id}")
                else:
                    # Update batch with current daysPassed if active
                    if batch.get("status") == "active":
                        from app.utils.batch_utils import update_batch_daily
                        batch_before_update = batch.copy()
                        batch = await update_batch_daily(batch)
                        print(f"📅 Batch update: daysPassed {batch_before_update.get('daysPassed', 0)} → {batch.get('daysPassed', 0)}")
                        print(f"   startDate: {batch.get('startDate')}, reactivatedDate: {batch.get('reactivatedDate')}")
                        print(f"   daysPassedBeforeReactivation: {batch.get('daysPassedBeforeReactivation', 0)}")
                    
                    # Calculate feed using updated batch data
                    # IMPORTANT: Use the UPDATED batch data (after update_batch_daily) for calculations
                    # This ensures biomass and feed amounts are calculated based on current age
                    feed_info = calculate_daily_feed(batch)
                    
                    # Get the actual daysPassed from the updated batch
                    # This is calculated dynamically based on startDate/reactivatedDate
                    actual_days_passed = batch.get("daysPassed", 0)
                    
                    # Log batch info for debugging
                    print(f"🔍 Batch info: startDate={batch.get('startDate')}, reactivatedDate={batch.get('reactivatedDate')}, daysPassed={actual_days_passed}")
                    
                    # Check if we already have a feeding record for today
                    # We still want to use the same day number for multiple feedings on the same calendar day
                    # BUT we need to ensure the calculation uses the CORRECT daysPassed
                    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                    today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
                    
                    existing_today_feeding = await db.feedingresults.find_one({
                        "batchId": processing_batch_id,
                        "date": {"$gte": today_start, "$lte": today_end}
                    })
                    
                    if existing_today_feeding:
                        # Use the same day number as existing feeding for today (for consistency)
                        day = existing_today_feeding.get("day", actual_days_passed)
                        print(f"ℹ️ Using existing day {day} for today's feeding record")
                        print(f"⚠️ WARNING: Using existing day number, but calculation uses actual daysPassed={actual_days_passed}")
                    else:
                        # First feeding of the day - use actual daysPassed + 1
                        day = actual_days_passed + 1
                        # Update batch daysPassed in database to match
                        await db.farmerinputs.update_one(
                            {"_id": ObjectId(processing_batch_id)},
                            {"$set": {"daysPassed": day}}
                        )
                        print(f"ℹ️ First feeding of the day - setting day to {day} (based on actual daysPassed={actual_days_passed})")
                    
                    # CRITICAL FIX: Recalculate feed_info using the CORRECT day number
                    # The batch's daysPassed might be different from the day number we're using
                    # So we need to ensure the calculation uses the actual current age
                    # Create a temporary batch dict with the correct daysPassed for calculation
                    batch_for_calculation = batch.copy()
                    # Use the actual daysPassed from update_batch_daily (not the day number)
                    # This ensures biomass grows correctly over time
                    batch_for_calculation["daysPassed"] = actual_days_passed
                    feed_info = calculate_daily_feed(batch_for_calculation)
                    
                    calculated_age = batch_for_calculation.get('shrimpAge', 0) + actual_days_passed
                    print(f"📊 Feed calculation details:")
                    print(f"   - Batch ID: {processing_batch_id}")
                    print(f"   - Initial shrimpAge: {batch_for_calculation.get('shrimpAge', 0)} days")
                    print(f"   - Actual daysPassed: {actual_days_passed} days")
                    print(f"   - Total calculated age: {calculated_age} days")
                    print(f"   - Average weight: {feed_info.get('averageWeight_g', 0)}g")
                    print(f"   - Biomass: {feed_info['biomassKg']}kg")
                    print(f"   - Feed amount: {feed_info['dailyFeedKg']}kg")
                    print(f"   - Feed rate: {(feed_info['dailyFeedKg'] / feed_info['biomassKg'] * 100) if feed_info['biomassKg'] > 0 else 0:.1f}%")
                    
                    # Check if this matches existing record (which would indicate no change)
                    if existing_today_feeding:
                        existing_biomass = existing_today_feeding.get("biomass", 0)
                        existing_feed = existing_today_feeding.get("feedAmountKg", 0)
                        if abs(existing_biomass - feed_info['biomassKg']) < 0.01 and abs(existing_feed - feed_info['dailyFeedKg']) < 0.01:
                            print(f"⚠️ WARNING: Calculation matches existing record exactly!")
                            print(f"   This is expected if all feedings are on the same calendar day")
                            print(f"   (daysPassed doesn't change within the same day)")
                        else:
                            print(f"✅ Values differ from existing record - calculation is updating correctly")
                    
                    # Create feeding document
                    now = datetime.utcnow()
                    biomass_kg = feed_info["biomassKg"]
                    
                    # For "no" decision, feed amount is 0
                    if final_state == "no":
                        feed_amount_kg = 0.0
                        feed_rate = 0.0
                    else:
                        feed_amount_kg = feed_info["dailyFeedKg"]
                        feed_rate = feed_info["dailyFeedKg"] / biomass_kg if biomass_kg > 0 else 0.0
                    
                    feeding_doc = {
                        "batchId": processing_batch_id,
                        "day": day,
                        "biomass": biomass_kg,
                        "feedRate": feed_rate,
                        "feedAmountKg": feed_amount_kg,
                        "date": now,
                        "id": str(uuid4()),
                        "source": "ai_feeding",  # Mark as AI feeding
                        "ai_decision": final_state  # Store the AI decision (high/low/no)
                    }
                    
                    # Insert into MongoDB - save EVERY confirmed decision
                    await db.feedingresults.insert_one(feeding_doc)
                    
                    print(f"✅ Saved feeding record to feedingresults: Day {day}, Decision: {final_state}, Feed: {feed_amount_kg} kg, Biomass: {biomass_kg} kg")
        except Exception as e:
            print(f"❌ Error saving feeding record: {e}")
            import traceback
            traceback.print_exc()
    
    if last_confirmed_chunk:
        final_state = last_confirmed_chunk.get("confirmed_label") or last_confirmed_chunk.get("label")
        final_motor_action, final_motor_speed = FEEDER_MAP.get(final_state, ("Motor OFF", 0.0))
        final_motor_speed_display = (last_motor_speed * 100) if last_motor_speed is not None else (final_motor_speed * 100)
        print(f"📊 Processing complete. Final confirmed state: {final_state} (speed: {final_motor_speed * 100}%)")
        print(f"📊 Initial motor speed: {initial_motor_speed * 100}% → Final motor speed: {final_motor_speed_display}%")
        
        # Check if motor actually changed during this processing
        final_speed_for_comparison = last_motor_speed if last_motor_speed is not None else final_motor_speed
        if initial_motor_speed != final_speed_for_comparison:
            print(f"✅ Motor state changed during processing - events were saved during processing")
        else:
            print(f"ℹ️ Motor state did not change - no new events created (correct behavior)")
    else:
        print(f"⚠️ No confirmed chunks found in processing results")

    return JSONResponse({
        "status": "ok",
        "chunks": results
    })
