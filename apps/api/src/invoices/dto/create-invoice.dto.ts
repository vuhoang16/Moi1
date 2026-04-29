import {
  IsString,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class OtherFeeDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateInvoiceDto {
  @IsString()
  contractId: string;

  @Matches(/^\d{4}-\d{2}$/, { message: 'billingMonth format: YYYY-MM' })
  billingMonth: string;

  @IsDateString()
  dueDate: string;

  @IsNumber()
  @Min(0)
  electricityCurrentReading: number;

  @IsNumber()
  @Min(0)
  waterCurrentReading: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtherFeeDto)
  otherFees?: OtherFeeDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
