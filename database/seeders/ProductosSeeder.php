<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;


final class ProductosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $first_id = Categoria::where('nombre_categoria', 'piñatas')->get('id')->first()->id;
        DB::table('productos')->insert([
            [
                'nombre' => "Piñata",
                'tiempo_promedio_requerido' => 3,
                'costo_promedio' => 100.00,
                'categoria_id' =>$first_id
            ],
            [
                'nombre' => "Gelatina",
                'tiempo_promedio_requerido' => Carbon::createFromTime(hour: 36),
                'costo_promedio' => 100.00,
                'categoria_id' => Categoria::where('nombre_categoria', 'gelatinas')->get('id')->first()->id
            ],
            [
                'nombre' => "Mangonada",
                'tiempo_promedio_requerido' => Carbon::createFromTime(hour: 36),
                'costo_promedio' => 100.00,
                'categoria_id' => Categoria::where('nombre_categoria', 'postres')->get('id')->first()->id
            ],
            [
                'nombre' => "Caja adorno",
                'tiempo_promedio_requerido' => Carbon::createFromTime(hour: 36),
                'costo_promedio' => 100.00,
                'categoria_id' => Categoria::where('nombre_categoria', 'postres')->get('id')->first()->id
            ]
        ]);
    }
}
