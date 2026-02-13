import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type RequestStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Cancelled";
type RecurrencePattern = "None" | "Daily" | "Weekly";

type Room = {
  id: string;
  code: string;
  name: string;
  building: string;
  capacity: number;
  isActive: boolean;
};

type BookingRequest = {
  id: string;
  roomId: string;
  room?: Room;
  requestedBy: string;
  purpose: string;
  attendeeCount: number;
  startUtc: string;
  endUtc: string;
  recurrencePattern: RecurrencePattern;
  recurrenceUntilUtc?: string | null;
  status: RequestStatus;
  modifiedAtUtc: string;
};

type AuditEvent = {
  id: string;
  entityType: string;
  eventType: string;
  actor: string;
  details?: string | null;
  createdAtUtc: string;
};

type Summary = {
  totalRooms: number;
  activeRooms: number;
  requestCounts: Array<{ status: string; count: number }>;
};

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5216/api";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

async function apiPost<TBody, TResponse>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as TResponse;
}

function App() {
  const [currentView, setCurrentView] = useState<
    "user" | "admin" | "analytics"
  >("user");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [queue, setQueue] = useState<BookingRequest[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roomForm, setRoomForm] = useState({
    code: "",
    name: "",
    building: "",
    capacity: 30,
    actor: "admin",
  });
  const [requestForm, setRequestForm] = useState({
    roomId: "",
    requestedBy: "user1",
    purpose: "",
    attendeeCount: 10,
    startUtc: "",
    endUtc: "",
    recurrencePattern: "None" as RecurrencePattern,
    recurrenceUntilUtc: "",
  });
  const [historySearch, setHistorySearch] = useState("");

  const activeRooms = useMemo(
    () => rooms.filter((room) => room.isActive),
    [rooms],
  );

  async function loadCoreData() {
    setLoading(true);
    setError(null);
    try {
      const [roomsResponse, requestsResponse] = await Promise.all([
        apiGet<Room[]>("/rooms"),
        apiGet<BookingRequest[]>("/requests?sortBy=modifiedAt&desc=true"),
      ]);
      setRooms(roomsResponse);
      setRequests(requestsResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unexpected error while loading data.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminData() {
    setLoading(true);
    setError(null);
    try {
      const queueResponse = await apiGet<BookingRequest[]>("/approvals/queue");
      setQueue(queueResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unexpected error while loading queue.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalyticsData() {
    setLoading(true);
    setError(null);
    try {
      const query = historySearch
        ? `?search=${encodeURIComponent(historySearch)}&sortBy=createdAt&desc=true`
        : "?sortBy=createdAt&desc=true";
      const [eventsResponse, summaryResponse] = await Promise.all([
        apiGet<AuditEvent[]>(`/analytics/events${query}`),
        apiGet<Summary>("/analytics/summary"),
      ]);
      setEvents(eventsResponse);
      setSummary(summaryResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unexpected error while loading analytics.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoreData();
  }, []);

  useEffect(() => {
    if (currentView === "admin") {
      void loadAdminData();
    }
    if (currentView === "analytics") {
      void loadAnalyticsData();
    }
  }, [currentView]);

  async function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiPost("/rooms", {
        code: roomForm.code,
        name: roomForm.name,
        building: roomForm.building,
        capacity: roomForm.capacity,
        actor: roomForm.actor,
      });
      setRoomForm({ ...roomForm, code: "", name: "", building: "" });
      await loadCoreData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create room.",
      );
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiPost("/requests", {
        roomId: requestForm.roomId,
        requestedBy: requestForm.requestedBy,
        purpose: requestForm.purpose,
        attendeeCount: requestForm.attendeeCount,
        startUtc: requestForm.startUtc,
        endUtc: requestForm.endUtc,
        recurrencePattern: requestForm.recurrencePattern,
        recurrenceUntilUtc: requestForm.recurrenceUntilUtc || null,
      });
      setRequestForm({ ...requestForm, purpose: "" });
      await loadCoreData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to submit request.",
      );
    }
  }

  async function decide(requestId: string, isApproved: boolean) {
    setError(null);
    try {
      await apiPost(`/approvals/${requestId}/decide`, {
        adminName: "admin",
        isApproved,
        comment: isApproved
          ? "Approved in admin queue"
          : "Rejected in admin queue",
      });
      await Promise.all([loadCoreData(), loadAdminData()]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to process decision.",
      );
    }
  }

  return (
    <main className="layout">
      <header className="header">
        <h1>Campus Room Management</h1>
        <p>User requests room usage, admin approves or rejects.</p>
        <div className="tabs">
          <button
            type="button"
            onClick={() => setCurrentView("user")}
            className={currentView === "user" ? "active" : ""}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("admin")}
            className={currentView === "admin" ? "active" : ""}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("analytics")}
            className={currentView === "analytics" ? "active" : ""}
          >
            Analytics
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading...</div>}

      {currentView === "user" && (
        <section className="grid">
          <article className="card">
            <h2>Create Room (Admin setup)</h2>
            <form onSubmit={(event) => void submitRoom(event)} className="form">
              <input
                value={roomForm.code}
                onChange={(event) =>
                  setRoomForm({ ...roomForm, code: event.target.value })
                }
                placeholder="Code (A101)"
                required
              />
              <input
                value={roomForm.name}
                onChange={(event) =>
                  setRoomForm({ ...roomForm, name: event.target.value })
                }
                placeholder="Room name"
                required
              />
              <input
                value={roomForm.building}
                onChange={(event) =>
                  setRoomForm({ ...roomForm, building: event.target.value })
                }
                placeholder="Building"
                required
              />
              <input
                type="number"
                min={1}
                value={roomForm.capacity}
                onChange={(event) =>
                  setRoomForm({
                    ...roomForm,
                    capacity: Number(event.target.value),
                  })
                }
                required
              />
              <button type="submit">Create room</button>
            </form>
          </article>

          <article className="card">
            <h2>Submit Request</h2>
            <form
              onSubmit={(event) => void submitRequest(event)}
              className="form"
            >
              <select
                value={requestForm.roomId}
                onChange={(event) =>
                  setRequestForm({ ...requestForm, roomId: event.target.value })
                }
                required
              >
                <option value="">Select room</option>
                {activeRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} - {room.name}
                  </option>
                ))}
              </select>
              <input
                value={requestForm.requestedBy}
                onChange={(event) =>
                  setRequestForm({
                    ...requestForm,
                    requestedBy: event.target.value,
                  })
                }
                placeholder="Requested by"
                required
              />
              <input
                value={requestForm.purpose}
                onChange={(event) =>
                  setRequestForm({
                    ...requestForm,
                    purpose: event.target.value,
                  })
                }
                placeholder="Purpose"
                required
              />
              <input
                type="number"
                min={1}
                value={requestForm.attendeeCount}
                onChange={(event) =>
                  setRequestForm({
                    ...requestForm,
                    attendeeCount: Number(event.target.value),
                  })
                }
                required
              />
              <label>
                Start (UTC)
                <input
                  type="datetime-local"
                  value={requestForm.startUtc}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      startUtc: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label>
                End (UTC)
                <input
                  type="datetime-local"
                  value={requestForm.endUtc}
                  onChange={(event) =>
                    setRequestForm({
                      ...requestForm,
                      endUtc: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <select
                value={requestForm.recurrencePattern}
                onChange={(event) =>
                  setRequestForm({
                    ...requestForm,
                    recurrencePattern: event.target.value as RecurrencePattern,
                  })
                }
              >
                <option value="None">No recurrence</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
              {requestForm.recurrencePattern !== "None" && (
                <label>
                  Repeat until (UTC)
                  <input
                    type="datetime-local"
                    value={requestForm.recurrenceUntilUtc}
                    onChange={(event) =>
                      setRequestForm({
                        ...requestForm,
                        recurrenceUntilUtc: event.target.value,
                      })
                    }
                    required
                  />
                </label>
              )}
              <button type="submit">Submit request</button>
            </form>
          </article>

          <article className="card span-2">
            <h2>Request History</h2>
            <table>
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Room</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Modified</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.requestedBy}</td>
                    <td>{request.room?.name ?? request.roomId}</td>
                    <td>{request.purpose}</td>
                    <td>{request.status}</td>
                    <td>{new Date(request.modifiedAtUtc).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      )}

      {currentView === "admin" && (
        <section className="card">
          <h2>Approval Queue</h2>
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Purpose</th>
                <th>Start</th>
                <th>End</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestedBy}</td>
                  <td>{request.purpose}</td>
                  <td>{new Date(request.startUtc).toLocaleString()}</td>
                  <td>{new Date(request.endUtc).toLocaleString()}</td>
                  <td className="actions">
                    <button
                      type="button"
                      onClick={() => void decide(request.id, true)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void decide(request.id, false)}
                      className="danger"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {currentView === "analytics" && (
        <section className="grid">
          <article className="card">
            <h2>Summary</h2>
            <button type="button" onClick={() => void loadAnalyticsData()}>
              Refresh
            </button>
            {summary && (
              <ul>
                <li>Total rooms: {summary.totalRooms}</li>
                <li>Active rooms: {summary.activeRooms}</li>
                {summary.requestCounts.map((row) => (
                  <li key={row.status}>
                    {row.status}: {row.count}
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="card span-2">
            <h2>History</h2>
            <div className="row">
              <input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search event/actor/details"
              />
              <button type="button" onClick={() => void loadAnalyticsData()}>
                Search
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Entity</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((eventRow) => (
                  <tr key={eventRow.id}>
                    <td>{new Date(eventRow.createdAtUtc).toLocaleString()}</td>
                    <td>{eventRow.entityType}</td>
                    <td>{eventRow.eventType}</td>
                    <td>{eventRow.actor}</td>
                    <td>{eventRow.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      )}
    </main>
  );
}

export default App;
