import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ComponentesModule } from './componentes/componentes.module';

@Module({
    imports: [PrismaModule, ComponentesModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
