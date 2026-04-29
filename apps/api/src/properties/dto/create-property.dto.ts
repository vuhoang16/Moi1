import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  address: string;

  @IsString()
  ward: string;

  @IsString()
  district: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsNumber()
  @IsPositive()
  electricityRate: number;

  @IsNumber()
  @IsPositive()
  waterRate: number;
}
