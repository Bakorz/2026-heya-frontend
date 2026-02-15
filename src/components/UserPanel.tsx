import { useMemo, useState } from "react";
import type { BookingRequest, CreateRequestPayload, Room } from "../types";

type UserPanelProps = {
  rooms: Room[];
  requests: BookingRequest[];
  onCreateRequest: (payload: CreateRequestPayload) => Promise<void>;
};

const startHour = 8;
const endHour = 20;

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

function UserPanel({ rooms, requests, onCreateRequest }: UserPanelProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [name, setName] = useState("Student");
  const [nrp, setNrp] = useState("000000");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeRooms = useMemo(
    () => rooms.filter((room) => room.isActive),
    [rooms],
  );

  const buildingCards = useMemo(() => {
    const values = Array.from(
      new Set(activeRooms.map((room) => room.building)),
    );
    const defaults = ["Building A", "Building B", "Building C", "Building D"];
    const output = values.slice(0, 4);
    while (output.length < 4) {
      output.push(defaults[output.length]);
    }
    return output;
  }, [activeRooms]);

  const roomsInBuilding = useMemo(
    () =>
      selectedBuilding
        ? activeRooms.filter((room) => room.building === selectedBuilding)
        : [],
    [activeRooms, selectedBuilding],
  );

  const selectedRoom = useMemo(
    () => activeRooms.find((room) => room.id === selectedRoomId) ?? null,
    [activeRooms, selectedRoomId],
  );

  const roomBookings = useMemo(() => {
    if (!selectedRoomId) {
      return [];
    }

    return requests
      .filter(
        (request) =>
          request.roomId === selectedRoomId &&
          (request.status === "Approved" || request.status === "Submitted"),
      )
      .flatMap((request) => request.occurrences);
  }, [requests, selectedRoomId]);

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

  function selectBuilding(building: string) {
    setSelectedBuilding(building);
    setSelectedRoomId(null);
    setSelectedHours([]);
  }

  function selectRoom(roomId: string) {
    setSelectedRoomId(roomId);
    setSelectedHours([]);
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today));
  }

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
    if (!selectedRoomId || selectedHours.length === 0 || !purpose.trim()) {
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
        roomId: selectedRoomId,
        requestedBy: `${name.trim()} (${nrp.trim()})`,
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

  return (
    <section className="user-shell">
      <div className="hero card">
        <h2>Book Classroom</h2>
        <p>
          Select a building, select class, and choose consecutive 1-hour slots
          (UTC).
        </p>
      </div>

      {!selectedBuilding && (
        <div className="building-grid">
          {buildingCards.map((building) => (
            <button
              key={building}
              type="button"
              className="building-card"
              onClick={() => selectBuilding(building)}
            >
              <strong>{building}</strong>
            </button>
          ))}
        </div>
      )}

      {selectedBuilding && !selectedRoom && (
        <article className="card">
          <div className="row between">
            <h3>{selectedBuilding}</h3>
            <button type="button" onClick={() => setSelectedBuilding(null)}>
              Back
            </button>
          </div>
          <p>Available classes</p>
          <div className="room-list">
            {roomsInBuilding.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => selectRoom(room.id)}
                className="room-item"
              >
                {room.code} - {room.name}
              </button>
            ))}
            {roomsInBuilding.length === 0 && (
              <p>No class available in this building.</p>
            )}
          </div>
        </article>
      )}

      {selectedBuilding && selectedRoom && (
        <article className="card">
          <div className="row between">
            <h3>
              {selectedRoom.code} - {selectedRoom.name}
            </h3>
            <button type="button" onClick={() => setSelectedRoomId(null)}>
              Back to classes
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
            <div className="form two-cols">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                required
              />
              <input
                value={nrp}
                onChange={(event) => setNrp(event.target.value)}
                placeholder="NRP"
                required
              />
            </div>
            <textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Purpose"
              rows={3}
            />
            <p>
              Selected duration: {selectedHours.length} hour(s), attendee count
              fixed by system.
            </p>
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
      )}
    </section>
  );
}

export default UserPanel;
