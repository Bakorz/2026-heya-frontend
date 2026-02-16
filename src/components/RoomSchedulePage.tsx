import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  BookingRequest,
  CreateRequestPayload,
  Room,
  UserSession,
} from "../types";

const startHour = 8;
const endHour = 20;

type RoomSchedulePageProps = {
  rooms: Room[];
  requests: BookingRequest[];
  user: UserSession;
  onCreateRequest: (payload: CreateRequestPayload) => Promise<void>;
};

function startOfWeek(value: Date): Date {
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(value);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCDate(result.getUTCDate() + diff);
  return result;
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function isConsecutive(hours: number[]): boolean {
  if (hours.length === 0) {
    return false;
  }

  const sorted = [...hours].sort((a, b) => a - b);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] !== sorted[index - 1] + 1) {
      return false;
    }
  }

  return true;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function parseApiUtc(value: string): Date {
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

function RoomSchedulePage({
  rooms,
  requests,
  user,
  onCreateRequest,
}: RoomSchedulePageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === id && room.isActive) ?? null,
    [rooms, id],
  );

  const roomBookings = useMemo(() => {
    if (!id) {
      return [];
    }

    return requests
      .filter(
        (request) => request.roomId === id && request.status === "Approved",
      )
      .flatMap((request) => request.occurrences);
  }, [requests, id]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const hourSlots = useMemo(
    () =>
      Array.from(
        { length: endHour - startHour },
        (_, index) => startHour + index,
      ),
    [],
  );

  const bookedHours = useMemo(() => {
    return new Set(
      hourSlots.filter((hour) => {
        const slotStart = new Date(selectedDate);
        slotStart.setUTCHours(hour, 0, 0, 0);
        const slotEnd = new Date(selectedDate);
        slotEnd.setUTCHours(hour + 1, 0, 0, 0);

        return roomBookings.some((occurrence) => {
          const start = parseApiUtc(occurrence.startUtc);
          const end = parseApiUtc(occurrence.endUtc);
          return slotStart < end && slotEnd > start;
        });
      }),
    );
  }, [hourSlots, roomBookings, selectedDate]);

  function toggleHour(hour: number) {
    if (bookedHours.has(hour)) {
      return;
    }

    if (selectedHours.includes(hour)) {
      setSelectedHours(selectedHours.filter((value) => value !== hour));
      return;
    }

    setSelectedHours([...selectedHours, hour]);
  }

  async function submitRequest() {
    if (!selectedRoom || selectedHours.length === 0 || !purpose.trim()) {
      return;
    }

    if (!isConsecutive(selectedHours)) {
      return;
    }

    const sortedHours = [...selectedHours].sort((a, b) => a - b);
    const startDate = new Date(selectedDate);
    startDate.setUTCHours(sortedHours[0], 0, 0, 0);
    const endDate = new Date(selectedDate);
    endDate.setUTCHours(sortedHours[sortedHours.length - 1] + 1, 0, 0, 0);

    setSubmitting(true);
    try {
      await onCreateRequest({
        roomId: selectedRoom.id,
        requestedBy: `${user.name} (${user.nrp})`,
        purpose: purpose.trim(),
        attendeeCount: 1,
        startUtc: startDate.toISOString(),
        endUtc: endDate.toISOString(),
        recurrencePattern: "None",
        recurrenceUntilUtc: null,
      });
      setSelectedHours([]);
      setPurpose("");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selectedRoom) {
    return (
      <article className="card">
        <h3>Room not found</h3>
        <button type="button" onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </article>
    );
  }

  return (
    <article className="card">
      <div className="row between">
        <h3>
          {selectedRoom.code} - {selectedRoom.name}
        </h3>
        <button
          type="button"
          onClick={() =>
            navigate(
              `/room?building=${encodeURIComponent(selectedRoom.building)}`,
            )
          }
        >
          Back to class list
        </button>
      </div>

      <div className="row week-nav">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          Prev Week
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          This Week
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          Next Week
        </button>
      </div>

      <div className="week-grid">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            type="button"
            className={sameDay(day, selectedDate) ? "active" : ""}
            onClick={() => {
              setSelectedDate(day);
              setSelectedHours([]);
            }}
          >
            <span>
              {day.toLocaleDateString(undefined, {
                weekday: "short",
                timeZone: "UTC",
              })}
            </span>
            <strong>
              {day.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                timeZone: "UTC",
              })}
            </strong>
          </button>
        ))}
      </div>

      <h4>
        Day calendar -{" "}
        {selectedDate.toLocaleDateString(undefined, {
          weekday: "long",
          day: "2-digit",
          month: "long",
          timeZone: "UTC",
        })}
        {" (UTC)"}
      </h4>

      <div className="day-calendar">
        {hourSlots.map((hour) => {
          const isBooked = bookedHours.has(hour);
          const isSelected = selectedHours.includes(hour);
          return (
            <button
              key={hour}
              type="button"
              className={`slot ${isBooked ? "booked" : isSelected ? "selected" : "empty"}`}
              onClick={() => toggleHour(hour)}
              disabled={isBooked}
            >
              <span>{formatHour(hour)}</span>
              <span>
                {isBooked ? "Booked" : isSelected ? "Selected" : "Empty"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="booking-form">
        <h4>Create request</h4>
        <textarea
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          placeholder="Purpose"
          rows={3}
        />
        <p>Selected duration: {selectedHours.length} hour(s).</p>
        {!isConsecutive(selectedHours) && selectedHours.length > 0 && (
          <p className="danger">Selected hours must be consecutive.</p>
        )}
        <button
          type="button"
          disabled={
            submitting ||
            selectedHours.length === 0 ||
            !isConsecutive(selectedHours) ||
            !purpose.trim()
          }
          onClick={() => void submitRequest()}
        >
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </div>
    </article>
  );
}

export default RoomSchedulePage;
