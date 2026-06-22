import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() body: unknown) {
    const input = loginSchema.parse(body);
    return this.auth.login(input.username, input.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getMe(user);
  }
}
