import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPost } from "./api";
import "./App.css";
import AdminPanel from "./components/AdminPanel";
import LandingPage from "./components/LandingPage";
import RegisterPage from "./components/RegisterPage";
import RoomListPage from "./components/RoomListPage";
import RoomSchedulePage from "./components/RoomSchedulePage";
import SignInPage from "./components/SignInPage";
import type {
  BookingRequest,
  CreateRequestPayload,
  CreateRoomPayload,
  LoginPayload,
  RegisterPayload,
  Room,
  UserSession,
} from "./types";

const sessionStorageKey = "campusrooms.session";

function App() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [session, setSession] = useState<UserSession | null>(() => {
    const stored = localStorage.getItem(sessionStorageKey);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as UserSession;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = session !== null;
  const isAdmin = session?.role === "Admin";

  const activeRooms = useMemo(
    () => rooms.filter((room) => room.isActive),
    [rooms],
  );

  const buildingCards = useMemo(() => {
    return Array.from(new Set(activeRooms.map((room) => room.building)));
  }, [activeRooms]);

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

  async function login(payload: LoginPayload): Promise<UserSession> {
    const user = await apiPost<LoginPayload, UserSession>(
      "/auth/login",
      payload,
    );
    localStorage.setItem(sessionStorageKey, JSON.stringify(user));
    setSession(user);
    return user;
  }

  async function register(payload: RegisterPayload): Promise<UserSession> {
    const user = await apiPost<RegisterPayload, UserSession>(
      "/auth/register",
      payload,
    );
    return user;
  }

  function logout() {
    localStorage.removeItem(sessionStorageKey);
    setSession(null);
    navigate("/");
  }

  useEffect(() => {
    if (isLoggedIn) {
      void loadCoreData();
    }
  }, [isLoggedIn]);

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
      await loadCoreData();
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
      await loadCoreData();
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
        <h1>Heya</h1>
        <div className="topbar-actions">
          {isLoggedIn && (
            <>
              <button type="button" onClick={() => navigate("/home")}>
                Home
              </button>
              <button type="button" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading...</div>}

      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/home" replace />
            ) : (
              <LandingPage
                onSignIn={() => navigate("/sign-in")}
                onRegister={() => navigate("/register")}
              />
            )
          }
        />

        <Route
          path="/sign-in"
          element={
            isLoggedIn ? (
              <Navigate to="/home" replace />
            ) : (
              <SignInPage
                onLogin={async (payload) => {
                  setError(null);
                  try {
                    const user = await login(payload);
                    navigate("/home", { replace: true });
                    return user;
                  } catch (requestError) {
                    setError(
                      requestError instanceof Error
                        ? requestError.message
                        : "Failed to sign in.",
                    );
                    throw requestError;
                  }
                }}
              />
            )
          }
        />

        <Route
          path="/register"
          element={
            isLoggedIn ? (
              <Navigate to="/home" replace />
            ) : (
              <RegisterPage
                onRegister={async (payload) => {
                  setError(null);
                  try {
                    const user = await register(payload);
                    return user;
                  } catch (requestError) {
                    setError(
                      requestError instanceof Error
                        ? requestError.message
                        : "Failed to register.",
                    );
                    throw requestError;
                  }
                }}
              />
            )
          }
        />

        <Route
          path="/home"
          element={
            !isLoggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <section className="user-shell">
                {isAdmin ? (
                  <AdminPanel
                    rooms={rooms}
                    requests={requests}
                    onCreateRoom={createRoom}
                    onDecide={decide}
                    onDeleteBooking={deleteBooking}
                  />
                ) : (
                  <>
                    <div className="hero card">
                      <h2>Heya, {session?.name ?? "Guest"}</h2>
                      <p>Select a building to continue to room list.</p>
                    </div>
                    <div className="building-grid">
                      {buildingCards.map((building) => (
                        <button
                          key={building}
                          type="button"
                          className="building-card"
                          onClick={() =>
                            navigate(
                              `/room?building=${encodeURIComponent(building)}`,
                            )
                          }
                        >
                          <strong>{building}</strong>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )
          }
        />

        <Route
          path="/room"
          element={
            !isLoggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <RoomListPage rooms={rooms} />
            )
          }
        />

        <Route
          path="/room/:id"
          element={
            !isLoggedIn || !session ? (
              <Navigate to="/" replace />
            ) : (
              <RoomSchedulePage
                rooms={rooms}
                requests={requests}
                user={session}
                onCreateRequest={createRequest}
              />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/home" : "/sign-in"} replace />}
        />
      </Routes>
    </main>
  );
}

export default App;
