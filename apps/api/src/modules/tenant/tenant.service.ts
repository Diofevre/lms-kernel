import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateTenantDto, UpdateTenantDto } from "./tenant.dto.js";

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    // Convert BigInt fields to Number for JSON serialization
    return tenants.map((t) => ({
      ...t,
      maxStorageBytes: Number(t.maxStorageBytes),
    }));
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }
    return tenant;
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException(`Tenant "${id}" not found`);
    }
    return tenant;
  }

  async create(data: CreateTenantDto) {
    return this.prisma.tenant.create({ data });
  }

  async update(id: string, data: UpdateTenantDto) {
    // Verify tenant exists
    await this.findById(id);
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async toggleActive(id: string, isActive: boolean) {
    // Verify tenant exists
    await this.findById(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive },
    });
  }
}
