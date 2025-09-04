<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

final class CategoriasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('categorias')->insert([
            [
                'nombre_categoria' => 'piñatas'
            ],
            [
                'nombre_categoria' => 'desayunos'
            ],
            [
                'nombre_categoria' => 'cajas sorpresa'
            ],
            [
                'nombre_categoria' => 'postres'
            ],
            [
                'nombre_categoria' => 'gelatinas'
            ],
            [
                'nombre_categoria' => 'pasteles'
            ],
            [
                'nombre_categoria' => 'helados'
            ],
            [
                'nombre_categoria' => 'fresas'
            ],
            [
                'nombre_categoria' => 'invitaciones'
            ],
            [
                'nombre_categoria' => 'papelería creativa'
            ],
            [
                'nombre_categoria' => 'trabajo escolar'
            ],
            [
                'nombre_categoria' => 'maquetas'
            ],
            [
                'nombre_categoria' => 'vinyl'
            ],
            [
                'nombre_categoria' => 'fotos'
            ],
            [
                'nombre_categoria' => 'diseño'
            ],
            [
                'nombre_categoria' => 'cajas grandes'
            ],
            [
                'nombre_categoria' => 'ramos'
            ],
            [
                'nombre_categoria' => 'flores naturales'
            ],
            [
                'nombre_categoria' => 'flores artificiales'
            ],
            [
                'nombre_categoria' => 'limpiapipa'
            ],
            [
                'nombre_categoria' => 'globos'
            ],
            [
                'nombre_categoria' => 'adornos'
            ],
            [
                'nombre_categoria' => 'cartas'
            ],
            [
                'nombre_categoria' => 'llaveros'
            ]
        ]);
    }
}
