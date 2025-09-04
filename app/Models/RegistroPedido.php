<?php

namespace App\Models;

use Eloquent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string $cliente
 * @property string $fecha
 * @property string $precio_final
 * @property string $nombre_producto
 * @property int $categoria_id
 * @method static \Database\Factories\RegistroPedidoFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido whereCliente($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido whereFecha($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido whereNombreProducto($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RegistroPedido wherePrecioFinal($value)
 * @mixin Eloquent
 */
final class RegistroPedido extends Model
{
    /** @use HasFactory<\Database\Factories\RegistroPedidoFactory> */
    use HasFactory;

    public function categoria(): HasOne
    {
        return $this->hasOne(Categoria::class);
    }
}
