import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class AuditQueryDto {
  @ApiPropertyOptional({ example: "2024-01-01T00:00:00Z" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: "2024-12-31T23:59:59Z" })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: "auth.login" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
