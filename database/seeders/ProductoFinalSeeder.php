<?php

namespace Database\Seeders;

use App\Models\Material;
use App\Models\Producto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ProductoFinalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        try {
            DB::transaction(static function () {
                foreach (Producto::all() as $producto) {
                    $producto->materiales()->saveMany(
                        new Collection(
                            [
                                new Material(['nombre' => 'cartón',
                                    'dimensiones' => [
                                        'ancho' => '80cm', 'largo' => '50cm'], 'precio_promedio' => 8
                                ]),
                                new Material([

                                ]),
                            ]
                        )
                    );
                }
            }, 2);
        } catch (\Throwable $e) {
            //logger logic
        }

    }
}
