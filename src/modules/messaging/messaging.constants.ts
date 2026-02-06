export const RABBITMQ_QUEUES = {
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_EXPIRED: 'reservation.expired',
  RESERVATION_CANCELLED: 'reservation.cancelled',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  SEAT_RELEASED: 'seat.released',
} as const;

export const RABBITMQ_DLQ_SUFFIX = '.dlq';

export const REDIS_KEYS = {
  reservationTracking: (id: string) => `reservation:tracking:${id}`,
  seatAvailability: (sessionId: string) =>
    `session:${sessionId}:available_seats`,
  ticket: (saleId: string) => `ticket:${saleId}`,
} as const;
