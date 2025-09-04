<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $componente_id
 * @property string $nombre_componente
 * @property string $precio_registro
 * @method static \Database\Factories\PrecioComponenteFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PrecioComponente newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PrecioComponente newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PrecioComponente query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PrecioComponente whereComponenteId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PrecioComponente whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PrecioComponente whereNombreComponente($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PrecioComponente wherePrecioRegistro($value)
 * @mixin \Eloquent
 */
class PrecioComponente extends Model
{
    /** @use HasFactory<\Database\Factories\PrecioComponenteFactory> */
    use HasFactory;
}
