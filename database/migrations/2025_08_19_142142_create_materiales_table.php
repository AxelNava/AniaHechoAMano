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
        Schema::create('materiales', static function (Blueprint $table) {
            $table->charset("utf8mb4");
            $table->id();
            $table->string("nombre");
            $table->decimal("precio_promedio");
            $table->decimal('precio_mas_bajo');
            $table->decimal('precio_mas_alto');
            $table->decimal('precio_actual');
            $table->json('dimensiones');
            $table->json('detalles_adicionales');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('materiales');
    }
};
