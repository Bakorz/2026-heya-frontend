import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { BookingRequest, CreateRoomPayload, Room } from "../types";

type AdminSection = "create-room" | "bookings";
type BookingStatusFilter = "Pending" | "Approved" | "Rejected";

type AdminPanelProps = {
  rooms: Room[];
  requests: BookingRequest[];
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

function toDisplayStatus(
  status: BookingRequest["status"],
): BookingStatusFilter {
  if (status === "Submitted") {
    return "Pending";
  }

  return status === "Rejected" ? "Rejected" : "Approved";
}

function AdminPanel({
  rooms,
  requests,
  onCreateRoom,
  onDecide,
  onDeleteBooking,
}: AdminPanelProps) {
  const [activeSection, setActiveSection] =
    useState<AdminSection>("create-room");
  const [bookingStatusFilter, setBookingStatusFilter] =
    useState<BookingStatusFilter>("Pending");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateRoomPayload>({
    code: "",
    name: "",
    building: "",
    capacity: 30,
    actor: "admin",
  });

  const filteredBookings = useMemo(() => {
    return requests.filter((request) => {
      if (bookingStatusFilter === "Pending") {
        return request.status === "Submitted";
      }

      return request.status === bookingStatusFilter;
    });
  }, [bookingStatusFilter, requests]);

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) {
      return null;
    }

    return requests.find((request) => request.id === selectedRequestId) ?? null;
  }, [requests, selectedRequestId]);

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
          className={activeSection === "bookings" ? "active" : ""}
          onClick={() => setActiveSection("bookings")}
        >
          Bookings
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

        {activeSection === "bookings" && (
          <>
            <h3>Bookings</h3>
            <div className="actions" style={{ marginBottom: "0.75rem" }}>
              <button
                type="button"
                className={bookingStatusFilter === "Pending" ? "active" : ""}
                onClick={() => setBookingStatusFilter("Pending")}
              >
                Pending
              </button>
              <button
                type="button"
                className={bookingStatusFilter === "Approved" ? "active" : ""}
                onClick={() => setBookingStatusFilter("Approved")}
              >
                Approved
              </button>
              <button
                type="button"
                className={bookingStatusFilter === "Rejected" ? "active" : ""}
                onClick={() => setBookingStatusFilter("Rejected")}
              >
                Rejected
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>NRP</th>
                  <th>Class</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((request) => {
                  const requester = parseRequester(request.requestedBy);
                  const displayStatus = toDisplayStatus(request.status);

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
                      <td>{displayStatus}</td>
                      <td className="actions">
                        <button
                          type="button"
                          onClick={() => setSelectedRequestId(request.id)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {selectedRequest && (
              <div
                className="modal-overlay"
                role="presentation"
                onClick={() => setSelectedRequestId(null)}
              >
                <section
                  className="card modal-content"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Booking Detail"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h4>Booking Detail</h4>
                  <div className="form two-cols">
                    <div>
                      <strong>Name</strong>
                      <div>
                        {parseRequester(selectedRequest.requestedBy).name}
                      </div>
                    </div>
                    <div>
                      <strong>NRP</strong>
                      <div>
                        {parseRequester(selectedRequest.requestedBy).nrp}
                      </div>
                    </div>
                    <div>
                      <strong>Class</strong>
                      <div>
                        {selectedRequest.room
                          ? `${selectedRequest.room.code} - ${selectedRequest.room.name}`
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <strong>Status</strong>
                      <div>{toDisplayStatus(selectedRequest.status)}</div>
                    </div>
                    <div>
                      <strong>Start</strong>
                      <div>
                        {new Date(selectedRequest.startUtc).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <strong>End</strong>
                      <div>
                        {new Date(selectedRequest.endUtc).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="row" style={{ marginTop: "0.75rem" }}>
                    {toDisplayStatus(selectedRequest.status) === "Pending" && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await onDecide(selectedRequest.id, true);
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={async () => {
                            await onDecide(selectedRequest.id, false);
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {toDisplayStatus(selectedRequest.status) === "Approved" && (
                      <button
                        type="button"
                        className="danger"
                        onClick={async () => {
                          await onDecide(selectedRequest.id, false);
                        }}
                      >
                        Move to Rejected
                      </button>
                    )}

                    {toDisplayStatus(selectedRequest.status) === "Rejected" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onDecide(selectedRequest.id, true);
                        }}
                      >
                        Move to Approved
                      </button>
                    )}

                    <button
                      type="button"
                      className="danger"
                      onClick={async () => {
                        await onDeleteBooking(selectedRequest.id);
                        setSelectedRequestId(null);
                      }}
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRequestId(null)}
                    >
                      Close
                    </button>
                  </div>
                </section>
              </div>
            )}
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
