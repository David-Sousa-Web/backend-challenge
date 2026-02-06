export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

export abstract class AuthRepository {
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract create(data: CreateUserData): Promise<UserEntity>;
}
