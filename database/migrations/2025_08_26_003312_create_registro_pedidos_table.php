<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('registro_pedidos', function (Blueprint $table) {
            $table->charset("utf8mb4");
            $table->id();
            $table->string("cliente");
            $table->datetime("fecha");
            $table->decimal("precio_final");
            $table->string("nombre_producto", 80);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registro_pedidos');
    }
};
