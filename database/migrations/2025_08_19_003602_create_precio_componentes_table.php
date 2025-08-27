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
        Schema::create('precio_componentes', function (Blueprint $table) {
            $table->charset("utf8mb4");
            $table->id();
            $table->foreignId("componente_id")->constrained();
            $table->string("nombre_componente");
            $table->decimal("precio_registro");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('precio_componentes');
    }
};
