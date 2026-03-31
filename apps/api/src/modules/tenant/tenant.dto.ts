import { IsString, IsOptional, IsBoolean, IsInt, IsArray, Min, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTenantDto {
  @ApiProperty({ example: "universite-montreal" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "Slug must be lowercase alphanumeric with hyphens" })
  slug!: string;

  @ApiProperty({ example: "Universit\u00e9 de Montr\u00e9al" })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keycloakRealm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keycloakClientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{3,8}$/, { message: "primaryColor must be a valid hex color (e.g. #003366)" })
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\//, { message: "logoUrl must be a valid HTTP(S) URL" })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({ type: [String], example: ["credentials", "google"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledSsoProviders?: string[];

  @ApiPropertyOptional({ type: [String], example: ["courses", "exams"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: "Universit\u00e9 de Montr\u00e9al" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keycloakRealm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keycloakClientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{3,8}$/, { message: "primaryColor must be a valid hex color (e.g. #003366)" })
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\//, { message: "logoUrl must be a valid HTTP(S) URL" })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledSsoProviders?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;
}

export class ToggleTenantDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}
