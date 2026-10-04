export type RecurringSlotTime = { weekday: number; local_time: string; timezone: string };

export function matchesRecurringSlot(iso: string, slot: RecurringSlotTime): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: slot.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(iso));
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value("weekday") ?? "");
    return weekday === slot.weekday && `${value("hour")}:${value("minute")}` === slot.local_time.slice(0, 5);
  } catch {
    return false;
  }
}
