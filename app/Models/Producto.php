<?php

namespace App\Models;

use App\EIsActive;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property string $nombre
 * @property numeric $costo_promedio
 * @property EIsActive $is_active
 * @property Carbon $tiempo_promedio_requerido
 * @property Categoria|null $category
 * @property Collection<int, Material> $materiales
 * @property-read int|null $materiales_count
 * @method static Builder<static>|Producto newModelQuery()
 * @method static Builder<static>|Producto newQuery()
 * @method static Builder<static>|Producto query()
 * @mixin Builder
 */
final class Producto extends Model
{
    protected function casts(): array
    {
        return [
            "nombre" => 'string',
            "tiempo_promedio_requerido" => 'timestamp',
            "costo_promedio" => 'decimal:2',
            'is_active' => EIsActive::class,
        ];
    }

    //
    protected $fillable = [
        "nombre", "tiempo_promedio_requerido", "costo_promedio", 'categoria_id'
    ];

    public function category(): HasOne
    {
        return $this->hasOne(Categoria::class);
    }

    public function materiales(): BelongsToMany
    {
        return $this->belongsToMany(Material::class);
    }
}
