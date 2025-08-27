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
        Schema::create('producto_finals', function (Blueprint $table) {
            $table->charset("utf8mb4");
            $table->id();
            $table->foreignId("producto_id")->constrained()->onUpdate('cascade');
            $table->foreignId("componente_id")->constrained()->onUpdate('cascade');
            $table->timestamp("tiempo_promedio")->nullable(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_finals');
    }
};
