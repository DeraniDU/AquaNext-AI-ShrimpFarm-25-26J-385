export async function getLatestBehavior(pondId: string) {
  const res = await fetch(`http://localhost:5000/api/behavior-monitoring/latest/${pondId}`);
  if (!res.ok) throw new Error("Failed to fetch latest behavior data");
  return res.json();
}

export async function getBehaviorHistory(pondId: string, minutes = 30) {
  const res = await fetch(`http://localhost:5000/api/behavior-monitoring/history/${pondId}?minutes=${minutes}`);
  if (!res.ok) throw new Error("Failed to fetch behavior history");
  return res.json();
}