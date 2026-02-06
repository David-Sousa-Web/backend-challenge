export interface ReservationEntity {
  id: string;
  userId: string;
  sessionId: string;
  status: string;
  expiresAt: Date;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationSeatWithDetails {
  seatId: string;
  seat: {
    id: string;
    label: string;
    status: string;
  };
}

export interface ReservationWithSeats extends ReservationEntity {
  reservationSeats: ReservationSeatWithDetails[];
}

export interface CreateReservationData {
  userId: string;
  sessionId: string;
  seatIds: string[];
  expiresAt: Date;
  idempotencyKey?: string;
}

export abstract class ReservationRepository {
  abstract createWithLock(
    data: CreateReservationData,
  ): Promise<ReservationWithSeats>;
  abstract findById(id: string): Promise<ReservationWithSeats | null>;
  abstract findByIdempotencyKey(
    key: string,
  ): Promise<ReservationWithSeats | null>;
  abstract findByUserId(userId: string): Promise<ReservationEntity[]>;
  abstract cancel(id: string): Promise<ReservationWithSeats>;
  abstract expirePendingReservations(): Promise<string[]>;
}
