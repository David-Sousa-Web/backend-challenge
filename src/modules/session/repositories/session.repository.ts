export interface SessionEntity {
  id: string;
  movieTitle: string;
  room: string;
  startsAt: Date;
  ticketPriceInCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeatEntity {
  id: string;
  sessionId: string;
  label: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionWithSeats extends SessionEntity {
  seats: SeatEntity[];
}

export interface CreateSessionData {
  movieTitle: string;
  room: string;
  startsAt: Date;
  ticketPriceInCents: number;
  seatLabels: string[];
}

export abstract class SessionRepository {
  abstract create(data: CreateSessionData): Promise<SessionWithSeats>;
  abstract findById(id: string): Promise<SessionWithSeats | null>;
  abstract findAll(): Promise<SessionEntity[]>;
  abstract findSeatsBySessionId(sessionId: string): Promise<SeatEntity[]>;
  abstract findAvailableSeatsBySessionId(
    sessionId: string,
  ): Promise<SeatEntity[]>;
}
