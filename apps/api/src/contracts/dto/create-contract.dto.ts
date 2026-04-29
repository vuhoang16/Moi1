import {
  IsString,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateContractDto {
  @IsString()
  roomId: string;

  @IsString()
  tenantId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @IsPositive()
  monthlyRent: number;

  @IsNumber()
  @IsPositive()
  depositAmount: number;

  @IsInt()
  @Min(1)
  @Max(31)
  paymentDueDay: number;

  @IsNumber()
  @Min(0)
  electricityStartReading: number;

  @IsNumber()
  @Min(0)
  waterStartReading: number;

  @IsString()
  terms: string;
}
