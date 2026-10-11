type InsightAvailabilityRow = { name: string; values?: unknown[] };

export function hasInsightValues(rows: InsightAvailabilityRow[], names: string[]) {
  return rows.some((row) => names.includes(row.name) && Boolean(row.values?.length));
}
