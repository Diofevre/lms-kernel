import { IsString, IsEmail, IsOptional, IsArray, IsBoolean, IsInt, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "jdoe" })
  @IsString()
  username!: string;

  @ApiProperty({ example: "kc-uuid-123" })
  @IsString()
  keycloakId!: string;

  @ApiPropertyOptional({ example: "Jean" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Dupont" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ type: [String], example: ["user"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}

export class UpdateRolesDto {
  @ApiProperty({ type: [String], example: ["user", "tenant_admin"] })
  @IsArray()
  @IsString({ each: true })
  roles!: string[];
}

export class ToggleUserDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}

export class UserQueryDto {
  @ApiPropertyOptional({ example: "jean" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: "user" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
