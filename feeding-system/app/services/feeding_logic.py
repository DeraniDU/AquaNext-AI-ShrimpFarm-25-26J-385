async def update_batch_daily(batch):
    # Increment age
    batch["shrimpAge"] += 1
    batch["daysPassed"] += 1
    
    # Example: calculate feed based on shrimpAge and biomass
    batch["feedAmount"] = batch["plStocked"] * 0.02  # 2% of biomass (dummy)
    
    # Update in Mongo
    from app.database.mongo import db
    await db.farmerinputs.update_one({"_id": batch["_id"]}, {"$set": batch})
