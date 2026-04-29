import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  propertyId: string;

  @IsString()
  roomNumber: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  floor?: number;

  @IsNumber()
  @IsPositive()
  area: number;

  @IsNumber()
  @IsPositive()
  baseRent: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxOccupants?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
