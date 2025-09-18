<?php

use App\Setting;
use App\SettingCategory;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $category = SettingCategory::query()->updateOrCreate([
            'name' => 'SSO',
        ]);

        Setting::query()->updateOrCreate([
            'setting_category_id' => $category->getKey(),
            'key' => 'services.passport.client_id',
        ], [
            'value' => null,
            'type' => 'string',
            'description' => 'Código do cliente (Client ID)',
        ]);

        Setting::query()->updateOrCreate([
            'setting_category_id' => $category->getKey(),
            'key' => 'services.passport.client_secret',
        ], [
            'value' => null,
            'type' => 'string',
            'description' => 'Chave secreta do cliente (Secret key)',
        ]);

        Setting::query()->updateOrCreate([
            'setting_category_id' => $category->getKey(),
            'key' => 'services.passport.redirect',
        ], [
            'value' => null,
            'type' => 'string',
            'description' => 'URL de redirecionamento',
        ]);
    }
};
