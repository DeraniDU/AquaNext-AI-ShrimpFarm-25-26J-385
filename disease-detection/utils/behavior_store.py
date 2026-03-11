from collections import defaultdict, deque

# keeps latest 300 points per pond
pond_behavior_store = defaultdict(lambda: deque(maxlen=300))