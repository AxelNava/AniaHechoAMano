<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $nombre
 * @property float $precio_promedio
 * @property float $precio_mas_bajo
 * @property float $precio_mas_alto
 * @property float $precio_actual
 */
final class Componente extends Model
{
    protected $fillable = [
        'nombre', 'precio_promedio', 'precio_mas_bajo', 'precio_mas_alto', 'precio_actual'
    ];

    protected $casts = [
        'nombre' => 'string',
        'precio_promedio' => 'decimal:2',
        'precio_mas_bajo' => 'decimal:2',
        'precio_mas_alto' => 'decimal:2',
        'precio_actual' => 'decimal:2'
    ];


}
