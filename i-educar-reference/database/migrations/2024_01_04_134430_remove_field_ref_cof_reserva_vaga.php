<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('pmieducar.matricula', 'ref_cod_reserva_vaga')) {
            Schema::table('pmieducar.matricula', function (Blueprint $table) {
                $table->dropColumn('ref_cod_reserva_vaga');
            });
        }
    }
};
