"use client";

export default function SlotCard({ slot }: any) {
  const ratio =
    slot.totalSecs > 0
      ? Math.max(0, slot.secsLeft / slot.totalSecs)
      : 0;

  return (
    <div className="border border-gray-700 rounded-lg p-4 mb-4 bg-gray-900">
      <div className="flex justify-between text-sm text-gray-300 mb-1">
        <span>
          {slot.type} • {slot.city} • {slot.timeFilter}
        </span>
        <span>⏳ {Math.floor((slot.secsLeft || 0) / 60)}m left</span>
      </div>

      <h2 className="text-xl font-bold">{slot.title}</h2>

      <p className="text-gray-400 text-sm">
        🕓 {slot.start} • {slot.totalMins} min
      </p>

      <p className="text-gray-400 text-sm">
        👥 {slot.attendees.length}/{slot.max}
      </p>

      <div className="w-full h-2 bg-gray-700 rounded mt-2">
        <div
          className="h-2 rounded bg-sky-400"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
