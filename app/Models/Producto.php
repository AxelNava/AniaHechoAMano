<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property string $nombre
 * @property Carbon $tiempo_requerido
 * @property float $costo_promedio
 */
final class Producto extends Model
{
    protected $casts = [
        "nombre" => 'string',
        "tiempo_promedio_requerido" => 'timestamp',
        "costo_promedio" => 'decimal:2',
    ];

    //
    protected $fillable = [
        "nombre", "tiempo_promedio_requerido", "costo_promedio",'categoria_id'
    ];

    public function category(): HasOne
    {
        return $this->hasOne(Categoria::class);
    }
}
