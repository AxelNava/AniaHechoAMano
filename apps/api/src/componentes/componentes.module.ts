import { Module } from '@nestjs/common';
import { ComponentesService } from './componentes.service';
import { ComponentesController } from './componentes.controller';

@Module({
  controllers: [ComponentesController],
  providers: [ComponentesService],
})
export class ComponentesModule {}
