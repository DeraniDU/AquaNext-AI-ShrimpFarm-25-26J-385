from collections import defaultdict, deque

# keeps latest 500 predictions per pond (in-memory fallback when DB unavailable)
pond_prediction_store = defaultdict(lambda: deque(maxlen=500))

