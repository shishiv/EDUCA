<?php

use App\Menu;
use App\Process;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Menu::query()->updateOrCreate(['old' => Process::BLOCK_ENROLLMENT], [
            'parent_id' => Menu::query()->where('old', Process::CONFIGURATIONS_TOOLS)->firstOrFail()->getKey(),
            'process' => Process::BLOCK_ENROLLMENT,
            'title' => 'Bloquear enturmação em lote',
            'order' => 0,
            'parent_old' => Process::CONFIGURATIONS_TOOLS,
            'link' => '/bloquear-enturmacao',
        ]);
    }

    public function down(): void
    {
        Menu::query()->where('old', Process::BLOCK_ENROLLMENT)->delete();
    }
};
