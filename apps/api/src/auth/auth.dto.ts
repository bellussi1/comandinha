import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionRequestDto {
  @ApiProperty({ type: String, format: 'email', example: 'owner@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 1024, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'my-restaurant',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  restaurantSlug?: string;
}

export class TooManyRequestsDto {
  @ApiProperty({ type: Number, example: 429 })
  statusCode!: number;

  @ApiProperty({ type: String, example: 'ThrottlerException: Too Many Requests' })
  message!: string;
}

export class SessionUserDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, format: 'email' })
  email!: string;
}

export class SessionRestaurantDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  slug!: string;
}

export class SessionMembershipDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, enum: ['OWNER', 'ADMIN', 'STAFF'] })
  role!: 'OWNER' | 'ADMIN' | 'STAFF';
}

export class SessionMetadataDto {
  @ApiProperty({ type: () => SessionUserDto })
  user!: SessionUserDto;

  @ApiProperty({ type: () => SessionRestaurantDto })
  restaurant!: SessionRestaurantDto;

  @ApiProperty({ type: () => SessionMembershipDto })
  membership!: SessionMembershipDto;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: string;
}

export class CreatedSessionDto extends SessionMetadataDto {
  @ApiProperty({
    type: String,
    description: 'Opaque session secret; returned only to the trusted Next.js gateway.',
  })
  sessionToken!: string;
}

export class MembershipChoiceDto {
  @ApiProperty({ type: String, format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ type: String, enum: ['OWNER', 'ADMIN', 'STAFF'] })
  role!: 'OWNER' | 'ADMIN' | 'STAFF';

  @ApiProperty({ type: () => SessionRestaurantDto })
  restaurant!: SessionRestaurantDto;
}

export class MembershipSelectionRequiredDto {
  @ApiProperty({ type: String, enum: ['RESTAURANT_SELECTION_REQUIRED'] })
  code!: 'RESTAURANT_SELECTION_REQUIRED';

  @ApiProperty({ type: () => [MembershipChoiceDto] })
  memberships!: MembershipChoiceDto[];
}
