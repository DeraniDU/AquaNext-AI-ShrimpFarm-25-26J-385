global last_motor_speed

current_speed = motor_speed
confirmed = last_confirmed_label

if confirmed is not None:
    if last_motor_speed is None or current_speed != last_motor_speed:
        event = {
            "event_type": get_event_type(current_speed),
            "label": confirmed,
            "motor_speed": current_speed,
            "confidence": conf
        }

        save_feeding_event(event)

last_motor_speed = current_speed
