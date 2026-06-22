import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../decorators/current-user.decorator.js";
import { DbService } from "../../db/db.service.js";
import { users } from "../../db/schema.js";

type AuthRequest = { headers: { authorization?: string }; user?: AuthUser };
type JwtPayload = { sub: string; username: string; role: "admin" | "user" };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(DbService) private readonly db: DbService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }

    const rows = await this.db.db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    const user = rows[0];
    if (!user || user.status !== "active") {
      throw new UnauthorizedException("User is not active");
    }

    request.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status
    };
    return true;
  }
}
