<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $producto_id
 * @property int $componente_id
 * @property string $tiempo_promedio
 * @method static \Database\Factories\ProductoFinalFactory factory($count = null, $state = [])
 * @method static Builder<static>|ProductoFinal newModelQuery()
 * @method static Builder<static>|ProductoFinal newQuery()
 * @method static Builder<static>|ProductoFinal query()
 * @method static Builder<static>|ProductoFinal whereComponenteId($value)
 * @method static Builder<static>|ProductoFinal whereId($value)
 * @method static Builder<static>|ProductoFinal whereProductoId($value)
 * @method static Builder<static>|ProductoFinal whereTiempoPromedio($value)
 * @mixin Builder
 */
final class ProductoFinal extends Model
{
    /** @use HasFactory<\Database\Factories\ProductoFinalFactory> */
    use HasFactory;

    public function producto(): HasMany
    {

}
}
