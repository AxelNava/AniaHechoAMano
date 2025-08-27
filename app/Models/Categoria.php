<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

/**
 * @property string $nombre_categoria
 * @property string $id
 * @mixin Builder
 */
final class Categoria extends Model
{
    /** @use HasFactory<\Database\Factories\CategoriaFactory> */
    use HasFactory;

    protected $casts = [
        'nombre_categoria' => 'string',
        'id' => 'integer'

    ];
    protected $fillable = [
        'nombre_categoria'
    ];
}
