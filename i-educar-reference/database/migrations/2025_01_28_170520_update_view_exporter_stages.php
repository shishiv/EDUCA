<?php

use App\Support\Database\AsView;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    use AsView;

    public function up(): void
    {
        $this->dropView('public.exporter_stages');

        $this->dropView('public.exporter_school_class_stages');
        $this->createView('public.exporter_school_class_stages', '2025-01-28');

        $this->dropView('public.exporter_school_stages');
        $this->createView('public.exporter_school_stages', '2025-01-28');

        $this->createView('public.exporter_stages', '2020-07-10');
    }

    public function down(): void
    {
        $this->dropView('public.exporter_stages');

        $this->dropView('public.exporter_school_stages');
        $this->createView('public.exporter_school_stages', '2020-07-09');

        $this->dropView('public.exporter_school_class_stages');
        $this->createView('public.exporter_school_class_stages', '2020-09-18');

        $this->createView('public.exporter_stages', '2020-07-10');
    }
};
