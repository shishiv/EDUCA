<?php

namespace App\Models\Builders;

class LegacyIndividualBuilder extends LegacyBuilder
{
    public function whereRace(int $race): self
    {
        return $this->whereHas('races', fn ($q) => $q->where('cod_raca', $race));
    }

    public function whereCpf(int $cpf): self
    {
        return $this->where('cpf', $cpf);
    }

    public function whereBirthdate(string $birthdate): self
    {
        return $this->where('data_nasc', $birthdate);
    }
}
