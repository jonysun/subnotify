import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../../common/decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { users } from "../../db/schema.js";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
  status: "active" | "disabled";
};

export function toPublicUser(user: typeof users.$inferSelect): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(JwtService) private readonly jwt: JwtService
  ) {}

  async login(username: string, password: string) {
    const rows = await this.db.db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = rows[0];
    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Invalid username or password");
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException("Invalid username or password");
    }

    await this.db.db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id));
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role }),
      user: toPublicUser(user)
    };
  }

  async getMe(currentUser: AuthUser) {
    const rows = await this.db.db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
    const user = rows[0];
    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }
    return toPublicUser(user);
  }
}
