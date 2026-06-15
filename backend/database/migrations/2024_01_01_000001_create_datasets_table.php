<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('datasets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('original_filename');
            $table->string('stored_filename');
            $table->string('file_type', 20);            // csv, json, xlsx, parquet
            $table->unsignedBigInteger('file_size_bytes');
            $table->unsignedInteger('row_count')->default(0);
            $table->json('schema_meta');                // Inferred schema
            $table->json('chart_recommendation');      // Auto-selected chart
            $table->string('status', 20)->default('active'); // active, archived
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('file_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('datasets');
    }
};
