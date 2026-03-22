import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoComponente } from '@prisma/client';

export class CreateComponenteDto {
  tipo: TipoComponente;
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
}

@Injectable()
export class ComponentesService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateComponenteDto) {
    return this.prisma.componente.create({
      data,
    });
  }

  findAll() {
    return this.prisma.componente.findMany();
  }
}
