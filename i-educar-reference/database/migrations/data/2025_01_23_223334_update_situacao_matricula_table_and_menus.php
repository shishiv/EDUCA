<?php

use App\Menu;
use App\Models\RegistrationStatus;
use iEducar\Modules\Enrollments\Model\EnrollmentStatusFilter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // situações
        DB::table('relatorio.situacao_matricula')
            ->where('cod_situacao', 6)
            ->update(['descricao' => 'Deixou de Frequentar']);

        DB::table('relatorio.situacao_matricula')
            ->where('cod_situacao', 9)
            ->update(['descricao' => 'Exceto Transferidos/Deixou de Frequentar']);

        // menus
        Menu::query()->where('process', 685)->update([
            'title' => 'Deixou de Frequentar',
        ]);
        Menu::query()->where('process', 950)->update([
            'title' => 'Tipos da situação deixou de frequentar',
            'description' => 'Tipos da situação deixou de frequentar da matrícula',
        ]);
    }

    public function down(): void
    {
        // situações
        DB::table('relatorio.situacao_matricula')
            ->where('cod_situacao', RegistrationStatus::ABANDONED)
            ->update(['descricao' => 'Abandono']);

        DB::table('relatorio.situacao_matricula')
            ->where('cod_situacao', EnrollmentStatusFilter::EXCEPT_TRANSFERRED_OR_ABANDONMENT)
            ->update(['descricao' => 'Exceto Transferidos/Abandono']);

        // menus
        Menu::query()->where('process', 685)->update([
            'title' => 'Abandono',
        ]);
        Menu::query()->where('process', 950)->update([
            'title' => 'Tipos de abandono',
            'description' => 'Tipos de abandono da matrícula',
        ]);
    }
};
