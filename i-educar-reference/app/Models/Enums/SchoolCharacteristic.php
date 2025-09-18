<?php

namespace App\Models\Enums;

use Illuminate\Support\Collection;

enum SchoolCharacteristic: int
{
    case EARLY_CHILDHOOD_ACCREDITED = 1;
    case ELEMENTARY_ACCREDITED = 2;
    case EARLY_CHILDHOOD = 3;
    case ELEMENTARY = 4;

    public function name(): string
    {
        return match ($this) {
            self::EARLY_CHILDHOOD_ACCREDITED => 'Educação infantil (credenciada)',
            self::ELEMENTARY_ACCREDITED => 'Ensino fundamental (credenciada)',
            self::EARLY_CHILDHOOD => 'Educação infantil',
            self::ELEMENTARY => 'Ensino fundamental',
        };
    }

    /**
     * @return Collection<int, string>
     */
    public static function getDescriptiveValues(): Collection
    {
        return collect(self::cases())->mapWithKeys(fn (self $type) => [$type->value => $type->name()]);
    }
}
