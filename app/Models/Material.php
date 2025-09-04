<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $nombre
 * @property numeric $precio_promedio
 * @property numeric $precio_mas_bajo
 * @property numeric $precio_mas_alto
 * @property numeric $precio_actual
 * @property array $dimensiones
 * @property array $detalles_adicionales
 * @method static Builder<static>|Material newModelQuery()
 * @method static Builder<static>|Material newQuery()
 * @method static Builder<static>|Material query()
 * @method static Builder<static>|Material whereId($value)
 * @method static Builder<static>|Material whereNombre($value)
 * @method static Builder<static>|Material wherePrecioActual($value)
 * @method static Builder<static>|Material wherePrecioMasAlto($value)
 * @method static Builder<static>|Material wherePrecioMasBajo($value)
 * @method static Builder<static>|Material wherePrecioPromedio($value)
 * @mixin Builder
 */
final class Material extends Model
{
    protected $fillable = [
        'nombre', 'precio_promedio', 'precio_mas_bajo', 'precio_mas_alto', 'precio_actual', 'dimensiones', 'detalles_adicionales'
    ];

    protected $casts = [
        'nombre' => 'string',
        'precio_promedio' => 'decimal:2',
        'precio_mas_bajo' => 'decimal:2',
        'precio_mas_alto' => 'decimal:2',
        'precio_actual' => 'decimal:2',
        'dimensiones' => 'json',
        'detalles_adicionales' => 'json'
    ];

}
