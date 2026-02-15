export type RequestStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export type RecurrencePattern = "None" | "Daily" | "Weekly";

export type Room = {
  id: string;
  code: string;
  name: string;
  building: string;
  capacity: number;
  isActive: boolean;
};

export type BookingOccurrence = {
  id: string;
  bookingRequestId: string;
  roomId: string;
  startUtc: string;
  endUtc: string;
  status: RequestStatus;
  createdAtUtc: string;
};

export type BookingRequest = {
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
  adminComment?: string | null;
  createdAtUtc: string;
  modifiedAtUtc: string;
  occurrences: BookingOccurrence[];
};

export type CreateRoomPayload = {
  code: string;
  name: string;
  building: string;
  capacity: number;
  actor: string;
};

export type CreateRequestPayload = {
  roomId: string;
  requestedBy: string;
  purpose: string;
  attendeeCount: number;
  startUtc: string;
  endUtc: string;
  recurrencePattern: RecurrencePattern;
  recurrenceUntilUtc: string | null;
};
