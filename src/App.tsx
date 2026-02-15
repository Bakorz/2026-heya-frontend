import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "./api";
import "./App.css";
import AdminPanel from "./components/AdminPanel";
import LandingPage from "./components/LandingPage";
import UserPanel from "./components/UserPanel";
import type {
  BookingRequest,
  CreateRequestPayload,
  CreateRoomPayload,
  Room,
} from "./types";

type Screen = "landing" | "admin" | "user";

function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [queue, setQueue] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function loadQueue() {
    setError(null);
    try {
      const queueResponse = await apiGet<BookingRequest[]>("/approvals/queue");
      setQueue(queueResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unexpected error while loading approval queue.",
      );
    }
  }

  useEffect(() => {
    void loadCoreData();
  }, []);

  useEffect(() => {
    if (screen === "admin") {
      void loadQueue();
    }
  }, [screen]);

  async function createRoom(payload: CreateRoomPayload) {
    setError(null);
    try {
      await apiPost<CreateRoomPayload, Room>("/rooms", payload);
      await loadCoreData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create room.",
      );
    }
  }

  async function createRequest(payload: CreateRequestPayload) {
    setError(null);
    try {
      await apiPost<CreateRequestPayload, BookingRequest>("/requests", payload);
      await loadCoreData();
      if (screen === "admin") {
        await loadQueue();
      }
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
      await apiPost<
        { adminName: string; isApproved: boolean; comment: string },
        BookingRequest
      >(`/approvals/${requestId}/decide`, {
        adminName: "admin",
        isApproved,
        comment: isApproved
          ? "Approved in admin queue"
          : "Rejected in admin queue",
      });
      await Promise.all([loadCoreData(), loadQueue()]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to process decision.",
      );
    }
  }

  async function deleteBooking(requestId: string) {
    setError(null);
    try {
      await apiDelete(`/requests/${requestId}?actor=admin`);
      await Promise.all([loadCoreData(), loadQueue()]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete booking.",
      );
    }
  }

  return (
    <main className="layout">
      <header className="topbar card">
        <h1>Campus Room Management</h1>
        <div className="topbar-actions">
          <button type="button" onClick={() => setScreen("landing")}>
            Home
          </button>
          <button type="button" onClick={() => setScreen("user")}>
            User
          </button>
          <button type="button" onClick={() => setScreen("admin")}>
            Admin
          </button>
          <button type="button" onClick={() => void loadCoreData()}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading...</div>}

      {screen === "landing" && (
        <LandingPage
          onEnterUser={() => setScreen("user")}
          onEnterAdmin={() => setScreen("admin")}
        />
      )}

      {screen === "admin" && (
        <AdminPanel
          rooms={rooms}
          requests={requests}
          queue={queue}
          onCreateRoom={createRoom}
          onDecide={decide}
          onDeleteBooking={deleteBooking}
        />
      )}

      {screen === "user" && (
        <UserPanel
          rooms={rooms}
          requests={requests}
          onCreateRequest={createRequest}
        />
      )}
    </main>
  );
}

export default App;
