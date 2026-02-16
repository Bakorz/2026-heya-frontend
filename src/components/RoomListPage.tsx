import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Room } from "../types";

type RoomListPageProps = {
  rooms: Room[];
};

function RoomListPage({ rooms }: RoomListPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const building = searchParams.get("building") ?? "";

  const activeBuildings = useMemo(
    () =>
      Array.from(
        new Set(
          rooms.filter((room) => room.isActive).map((room) => room.building),
        ),
      ),
    [rooms],
  );

  const isValidBuilding = activeBuildings.includes(building);

  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.isActive && room.building === building),
    [rooms, building],
  );

  if (!building) {
    return (
      <article className="card">
        <h3>No building selected</h3>
        <p>Select a building from Home first.</p>
        <button type="button" onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </article>
    );
  }

  if (!isValidBuilding) {
    return (
      <article className="card">
        <h3>Invalid building</h3>
        <p>This building was not found.</p>
        <button type="button" onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </article>
    );
  }

  return (
    <article className="card">
      <div className="row between">
        <h3>{building}</h3>
        <button type="button" onClick={() => navigate("/home")}>
          Back
        </button>
      </div>
      <p>Available classes</p>
      <div className="room-list">
        {filteredRooms.map((room) => (
          <button
            key={room.id}
            type="button"
            className="room-item"
            onClick={() => navigate(`/room/${room.id}`)}
          >
            {room.code} - {room.name}
          </button>
        ))}
        {filteredRooms.length === 0 && (
          <p>No class available in this building.</p>
        )}
      </div>
    </article>
  );
}

export default RoomListPage;
