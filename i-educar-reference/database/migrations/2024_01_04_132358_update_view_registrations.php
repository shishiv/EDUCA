<?php

use App\Support\Database\AsView;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    use AsView;

    public function up(): void
    {
        $this->dropView('public.registrations');
        $this->createView('registrations', '2024-01-04');
    }

    public function down(): void
    {
        $this->dropView('public.registrations');
        $this->createView('registrations');
    }
};
