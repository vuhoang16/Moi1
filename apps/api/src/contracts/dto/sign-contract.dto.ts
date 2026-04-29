import { IsString } from 'class-validator';

export class SignContractDto {
  @IsString()
  signatureBase64: string;
}
