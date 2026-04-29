import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { RoomsModule } from './rooms/rooms.module';
import { ContractsModule } from './contracts/contracts.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { DepositsModule } from './deposits/deposits.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    ScheduleModule.forRoot(),

    BullModule.forRoot({
      redis: process.env.REDIS_URL,
    }),

    PrismaModule,
    AuthModule,
    PropertiesModule,
    RoomsModule,
    ContractsModule,
    InvoicesModule,
    PaymentsModule,
    DepositsModule,
    ChecklistsModule,
    MaintenanceModule,
    ChatModule,
    NotificationsModule,
    ReportsModule,
    WebhooksModule,
    HealthModule,
  ],
})
export class AppModule {}
