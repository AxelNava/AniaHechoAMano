<?php

namespace App\Models;

use Database\Factories\CategoriaFactory;
use Eloquent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

/**
 * @property int $id
 * @property string $nombre_categoria
 * @method static CategoriaFactory factory($count = null, $state = [])
 * @method static Builder<static>|Categoria newModelQuery()
 * @method static Builder<static>|Categoria newQuery()
 * @method static Builder<static>|Categoria query()
 * @method static Builder<static>|Categoria whereId($value)
 * @method static Builder<static>|Categoria whereNombreCategoria($value)
 * @mixin Eloquent
 */
final class Categoria extends Model
{
    /** @use HasFactory<CategoriaFactory> */
    use HasFactory;

    protected $casts = [
        'nombre_categoria' => 'string',
        'id' => 'integer'

    ];
    protected $fillable = [
        'nombre_categoria'
    ];
}
