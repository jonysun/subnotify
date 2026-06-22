import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { UsersService } from "./users.service.js";

const createUserSchema = z.object({
  username: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(8),
  role: z.enum(["admin", "user"]).optional().default("user")
});

const statusSchema = z.object({ status: z.enum(["active", "disabled"]) });
const resetPasswordSchema = z.object({ password: z.string().min(8) });

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  listUsers() {
    return this.users.listUsers();
  }

  @Post()
  createUser(@Body() body: unknown) {
    return this.users.createUser(createUserSchema.parse(body));
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() body: unknown) {
    const input = statusSchema.parse(body);
    return this.users.updateStatus(id, input.status);
  }

  @Post(":id/reset-password")
  resetPassword(@Param("id") id: string, @Body() body: unknown) {
    const input = resetPasswordSchema.parse(body);
    return this.users.resetPassword(id, input.password);
  }
}
