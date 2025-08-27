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
        Schema::create('caracteristicas_componentes', function (Blueprint $table) {
            $table->charset("utf8mb4");
            $table->id();
            $table->string("nombre_componente");
            $table->foreignId('componente_id')->constrained();
            $table->string("color", 30);
            $table->string("tamanio", 100);
            $table->json("dimensiones");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('caracteristicas_componentes');
    }
};
