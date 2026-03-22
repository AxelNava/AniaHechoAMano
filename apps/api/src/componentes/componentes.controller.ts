import { Controller, Get, Post, Body } from '@nestjs/common';
import { ComponentesService, CreateComponenteDto } from './componentes.service';

@Controller('componentes')
export class ComponentesController {
  constructor(private readonly componentesService: ComponentesService) {}

  @Post()
  create(@Body() createComponenteDto: CreateComponenteDto) {
    return this.componentesService.create(createComponenteDto);
  }

  @Get()
  findAll() {
    return this.componentesService.findAll();
  }
}
