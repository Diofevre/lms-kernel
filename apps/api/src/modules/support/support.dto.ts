import { IsString, IsOptional, IsIn, MinLength, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTicketDto {
  @ApiProperty({ example: "Cannot access my files" })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: "When I click on download, nothing happens..." })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ enum: ["low", "medium", "high", "urgent"], example: "medium" })
  @IsOptional()
  @IsString()
  @IsIn(["low", "medium", "high", "urgent"])
  priority?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ["open", "in_progress", "resolved", "closed"] })
  @IsString()
  @IsIn(["open", "in_progress", "resolved", "closed"])
  status!: string;
}
