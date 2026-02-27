import { Global, Module } from '@nestjs/common'
import { prisma } from '@lms/db'

@Global()
@Module({
  providers: [
    {
      provide: 'PRISMA',
      useValue: prisma,
    },
  ],
  exports: ['PRISMA'],
})
export class DatabaseModule {}
