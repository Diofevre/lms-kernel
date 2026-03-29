import { IsString, IsOptional, IsIn } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CorrectionRequestDto {
  @ApiProperty({ example: "My last name is misspelled" })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: "email" })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({ example: "jean.dupont@example.com" })
  @IsOptional()
  @IsString()
  expectedValue?: string;
}

export class ProcessRequestDto {
  @ApiProperty({ enum: ["approved", "denied"], example: "approved" })
  @IsString()
  @IsIn(["approved", "denied"])
  action!: string;

  @ApiPropertyOptional({ example: "Cannot verify identity" })
  @IsOptional()
  @IsString()
  reason?: string;
}
