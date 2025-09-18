<?php

use App\Menu;
use App\Process;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Menu::query()->updateOrCreate(['old' => Process::STAGE], [
            'parent_id' => Menu::query()->where('old', Process::CONFIGURATIONS_TOOLS)->firstOrFail()->getKey(),
            'process' => Process::STAGE,
            'title' => 'Atualização das etapas da escola ou turma em lote',
            'order' => 0,
            'parent_old' => Process::CONFIGURATIONS_TOOLS,
            'link' => '/atualiza-etapa',
        ]);
    }

    public function down(): void
    {
        Menu::query()->updateOrCreate(['old' => Process::STAGE], [
            'parent_id' => Menu::query()->where('old', Process::CONFIGURATIONS_TOOLS)->firstOrFail()->getKey(),
            'process' => Process::STAGE,
            'title' => 'Atualizar etapas da turma em lote',
            'order' => 0,
            'parent_old' => Process::CONFIGURATIONS_TOOLS,
            'link' => '/atualiza-etapa-turma',
        ]);
    }
};
