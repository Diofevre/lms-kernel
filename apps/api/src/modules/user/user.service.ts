import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateUserDto } from "./user.dto.js";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(
    tenantId: string,
    options?: { search?: string; role?: string; page?: number; limit?: number },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (options?.search) {
      where["OR"] = [
        { email: { contains: options.search, mode: "insensitive" } },
        { username: { contains: options.search, mode: "insensitive" } },
        { firstName: { contains: options.search, mode: "insensitive" } },
        { lastName: { contains: options.search, mode: "insensitive" } },
      ];
    }

    if (options?.role) {
      where["roles"] = { has: options.role };
    }

    const [data, total] = await Promise.all([
      this.prisma.tenantUser.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          keycloakId: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          roles: true,
          isActive: true,
          lastLoginAt: true,
          mfaEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.tenantUser.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const user = await this.prisma.tenantUser.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        keycloakId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        lastLoginAt: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User "${id}" not found in this tenant`);
    }
    return user;
  }

  async findByKeycloakId(keycloakId: string, tenantId: string) {
    return this.prisma.tenantUser.findFirst({
      where: { keycloakId, tenantId, deletedAt: null },
      select: {
        id: true,
        keycloakId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        lastLoginAt: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(data: CreateUserDto, tenantId: string) {
    // Check for duplicates
    const existing = await this.prisma.tenantUser.findFirst({
      where: {
        tenantId,
        OR: [
          { email: data.email },
          { keycloakId: data.keycloakId },
        ],
      },
    });
    if (existing) {
      throw new ConflictException("A user with this email or keycloakId already exists in this tenant");
    }

    return this.prisma.tenantUser.create({
      data: {
        tenantId,
        keycloakId: data.keycloakId,
        email: data.email,
        username: data.username,
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        roles: data.roles ?? ["user"],
      },
    });
  }

  async updateRoles(id: string, tenantId: string, roles: string[]) {
    // Verify user exists in this tenant
    await this.findById(id, tenantId);
    return this.prisma.tenantUser.update({
      where: { id },
      data: { roles },
    });
  }

  async toggleActive(id: string, tenantId: string, isActive: boolean) {
    // Verify user exists in this tenant
    await this.findById(id, tenantId);
    return this.prisma.tenantUser.update({
      where: { id },
      data: { isActive },
    });
  }
}
