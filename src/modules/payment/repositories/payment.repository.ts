export interface SaleEntity {
  id: string;
  reservationId: string;
  userId: string;
  totalInCents: number;
  confirmedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleWithReservation extends SaleEntity {
  reservation: {
    id: string;
    sessionId: string;
    reservationSeats: {
      seat: {
        id: string;
        label: string;
      };
    }[];
  };
}

export interface CreateSaleData {
  reservationId: string;
  userId: string;
  totalInCents: number;
}

export abstract class PaymentRepository {
  abstract confirmPayment(data: CreateSaleData): Promise<SaleWithReservation>;
  abstract findSalesByUserId(userId: string): Promise<SaleEntity[]>;
  abstract findSaleById(id: string): Promise<SaleWithReservation | null>;
}
