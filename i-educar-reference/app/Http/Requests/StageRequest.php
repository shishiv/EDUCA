<?php

namespace App\Http\Requests;

use App\Models\LegacyStageType;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;

class StageRequest extends FormRequest
{
    protected function prepareForValidation()
    {
        $this->merge([
            'escola' => $this->has('escola') ? Arr::flatten($this->get('escola')) : null,
            'curso' => $this->has('curso') ? Arr::flatten($this->get('curso')) : null,
        ]);
    }

    public function rules()
    {
        $year = $this->get('ano');

        return [
            'ref_cod_instituicao' => ['required', 'integer'],
            'tipo' => ['required', 'in:schoolclass,school'],
            'escola' => ['nullable', 'array'],
            'curso' => ['nullable', 'array'],
            'ano' => ['required', 'integer', 'digits:4', 'min:1900'],
            'etapas.*.data_inicio' => [
                'nullable',
                'date_format:d/m/Y',
                function ($attribute, $value, $fail) use ($year) {
                    if ($value && Carbon::createFromFormat('d/m/Y', $value)->year != $year) {
                        $fail("O ano da data de início deve ser {$year}.");
                    }
                },
            ],
            'etapas.*.data_fim' => [
                'nullable',
                'date_format:d/m/Y',
                'after_or_equal:etapas.*.data_inicio',
                function ($attribute, $value, $fail) use ($year) {
                    if ($value && Carbon::createFromFormat('d/m/Y', $value)->year != $year) {
                        $fail("O ano da data de término deve ser {$year}.");
                    }
                },
            ],
            'etapas.*.dias_letivos' => ['nullable', 'integer', 'min:1', 'max:366'],
        ];
    }

    public function attributes()
    {
        return [
            'tipo' => 'Tipo',
            'ref_cod_instituicao' => 'Instituição',
            'escola' => 'Escola',
            'curso' => 'Curso',
            'etapas.*.data_inicio' => 'Data inicial da etapa',
            'etapas.*.data_fim' => 'Data final da etapa',
            'etapas.*.dias_letivos' => 'Dias letivos da etapa',
        ];
    }

    public function messages()
    {
        return [
            'etapas.*.data_inicial.date' => 'A :attribute deve ser uma data válida.',
            'etapas.*.data_fim.date' => 'A :attribute deve ser uma data válida.',
            'etapas.*.data_fim.date_format' => 'A :attribute deve estar no formato dia/mês/ano (ex: 01/01/2024).',
            'etapas.*.data_fim.after_or_equal' => 'A :attribute deve ser igual ou posterior à data inicial da etapa.',
            'etapas.*.dias_letivos.integer' => 'O campo :attribute deve ser um número inteiro.',
            'etapas.*.dias_letivos.min' => 'O campo :attribute deve ser no mínimo 1.',
            'etapas.*.dias_letivos.max' => 'O campo :attribute deve ser no máximo 366.',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $etapas = collect($this->input('etapas', []));

            // Verificar se todas as etapas estão vazias
            $allEmpty = $etapas->every(fn ($etapa) => empty($etapa['data_inicio']) &&
                empty($etapa['data_fim']) &&
                empty($etapa['dias_letivos']));

            if ($allEmpty) {
                $validator->errors()->add('etapas', 'Nenhuma informação a ser atualizada nas etapas');

                return;
            }

            // Validar se a data final de uma etapa é menor que a data inicial da próxima etapa
            for ($i = 0; $i < count($etapas) - 1; $i++) {
                $currentEndDate = $etapas[$i]['data_fim'] ?? null;
                $nextStartDate = $etapas[$i + 1]['data_inicio'] ?? null;

                if ($currentEndDate && $nextStartDate) {
                    $currentEndDateParsed = Carbon::createFromFormat('d/m/Y', $currentEndDate);
                    $nextStartDateParsed = Carbon::createFromFormat('d/m/Y', $nextStartDate);

                    if ($currentEndDateParsed->greaterThanOrEqualTo($nextStartDateParsed)) {
                        $validator->errors()->add(
                            "etapas.{$i}.data_fim",
                            sprintf(
                                'A data inicial da etapa %d deve ser maior que a data final da etapa %d',
                                $i + 1,
                                $i
                            )
                        );
                    }
                }
            }
            if ($stage = $this->get('ref_cod_modulo')) {
                $filledStagesCount = $etapas
                    ->filter(fn ($etapa) => !empty($etapa['data_inicio']) || !empty($etapa['data_fim']) || !empty($etapa['dias_letivos']))
                    ->count();

                // Valida número máximo de etapas
                $stagesCount = LegacyStageType::query()->where('cod_modulo', $stage)->value('num_etapas');

                if ($filledStagesCount > $stagesCount) {
                    $validator->errors()->add('etapas', "O número de etapas preenchidas não pode exceder {$stagesCount} conforme o filtro.");
                }
            }
        });
    }
}
