import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { BookingRequest, CreateRoomPayload, Room } from "../types";

type AdminSection = "create-room" | "approve-request" | "booking-history";

type AdminPanelProps = {
  rooms: Room[];
  requests: BookingRequest[];
  queue: BookingRequest[];
  onCreateRoom: (payload: CreateRoomPayload) => Promise<void>;
  onDecide: (requestId: string, isApproved: boolean) => Promise<void>;
  onDeleteBooking: (requestId: string) => Promise<void>;
};

function parseRequester(value: string): { name: string; nrp: string } {
  const match = value.match(/^(.*)\((.*)\)$/);
  if (!match) {
    return { name: value, nrp: value };
  }

  return { name: match[1].trim(), nrp: match[2].trim() };
}

function AdminPanel({
  rooms,
  requests,
  queue,
  onCreateRoom,
  onDecide,
  onDeleteBooking,
}: AdminPanelProps) {
  const [activeSection, setActiveSection] =
    useState<AdminSection>("create-room");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateRoomPayload>({
    code: "",
    name: "",
    building: "",
    capacity: 30,
    actor: "admin",
  });

  const history = useMemo(
    () => requests.filter((request) => request.status !== "Draft"),
    [requests],
  );

  async function submitCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onCreateRoom(form);
      setForm({ ...form, code: "", name: "", building: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Admin</h2>
        <button
          type="button"
          className={activeSection === "create-room" ? "active" : ""}
          onClick={() => setActiveSection("create-room")}
        >
          Create Room
        </button>
        <button
          type="button"
          className={activeSection === "approve-request" ? "active" : ""}
          onClick={() => setActiveSection("approve-request")}
        >
          Approve Request
        </button>
        <button
          type="button"
          className={activeSection === "booking-history" ? "active" : ""}
          onClick={() => setActiveSection("booking-history")}
        >
          Booking History
        </button>
      </aside>

      <article className="admin-content card">
        {activeSection === "create-room" && (
          <>
            <h3>Create Room</h3>
            <form
              onSubmit={(event) => void submitCreateRoom(event)}
              className="form"
            >
              <input
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value })
                }
                placeholder="Code"
                required
              />
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Room name"
                required
              />
              <input
                value={form.building}
                onChange={(event) =>
                  setForm({ ...form, building: event.target.value })
                }
                placeholder="Building"
                required
              />
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) =>
                  setForm({ ...form, capacity: Number(event.target.value) })
                }
                required
              />
              <button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create room"}
              </button>
            </form>
          </>
        )}

        {activeSection === "approve-request" && (
          <>
            <h3>Approve Request</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>NRP</th>
                  <th>Purpose</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Booked class</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((request) => {
                  const requester = parseRequester(request.requestedBy);
                  return (
                    <tr key={request.id}>
                      <td>{requester.name}</td>
                      <td>{requester.nrp}</td>
                      <td>{request.purpose}</td>
                      <td>{new Date(request.startUtc).toLocaleString()}</td>
                      <td>{new Date(request.endUtc).toLocaleString()}</td>
                      <td>
                        {request.room
                          ? `${request.room.code} - ${request.room.name}`
                          : "-"}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          onClick={() => void onDecide(request.id, true)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDecide(request.id, false)}
                          className="danger"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {activeSection === "booking-history" && (
          <>
            <h3>Booking History</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>NRP</th>
                  <th>Class</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((request) => {
                  const requester = parseRequester(request.requestedBy);
                  return (
                    <tr key={request.id}>
                      <td>{requester.name}</td>
                      <td>{requester.nrp}</td>
                      <td>
                        {request.room
                          ? `${request.room.code} - ${request.room.name}`
                          : "-"}
                      </td>
                      <td>{request.purpose}</td>
                      <td>{request.status}</td>
                      <td>{new Date(request.startUtc).toLocaleString()}</td>
                      <td>{new Date(request.endUtc).toLocaleString()}</td>
                      <td>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => void onDeleteBooking(request.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <div className="admin-footer">
          <small>Total rooms: {rooms.length}</small>
        </div>
      </article>
    </section>
  );
}

export default AdminPanel;
