<?php

use App\Menu;
use App\Models\SchoolNotice;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $toolsMenuId = Menu::query()->where('old', 999926)->first()?->id;

        if (is_int($toolsMenuId)) {
            Menu::query()->create([
                'title' => 'Comunicados Escolares',
                'link' => '/intranet/educar_comunicados_escolares_lst.php',
                'parent_id' => $toolsMenuId,
                'process' => SchoolNotice::PROCESS,
                'old' => SchoolNotice::PROCESS,
            ]);
        }
    }

    public function down(): void
    {
        Menu::query()
            ->where('process', SchoolNotice::PROCESS)
            ->delete();
    }
};
