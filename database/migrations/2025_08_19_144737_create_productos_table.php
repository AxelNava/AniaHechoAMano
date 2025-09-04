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
        Schema::create('productos', function (Blueprint $table) {
            $table->charset("utf8mb4");
            $table->id();
            $table->char("nombre", 50)->nullable(false);
            $table->enum('is_active', ['yes','no']);
            $table->time("tiempo_promedio_requerido")->nullable(false);
            $table->decimal("costo_promedio", 8,2)->nullable(false);
            $table->foreignId("categoria_id")->constrained()->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
