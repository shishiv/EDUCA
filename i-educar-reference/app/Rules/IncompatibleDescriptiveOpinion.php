<?php

namespace App\Rules;

use App\Models\LegacyEvaluationRuleGradeYear;
use App\Models\LegacySchoolClass;
use Illuminate\Contracts\Validation\Rule;
use RegraAvaliacao_Model_TipoParecerDescritivo;

class IncompatibleDescriptiveOpinion implements Rule
{
    /**
     * Determine if the validation rule passes.
     *
     * @param string $attribute
     * @param mixed  $value
     * @return bool
     */
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return false;
        }

        $schoolClass = $value[0]['turma_id'];
        $schoolClass = LegacySchoolClass::find($schoolClass);
        $grades = array_column($value, 'serie_id');
        $utilizaRegraDiferenciada = $schoolClass->school->utiliza_regra_diferenciada;

        $descriptiveOpinionType = LegacyEvaluationRuleGradeYear::query()
            ->whereIn('serie_id', $grades)
            ->where('ano_letivo', $schoolClass->ano)
            ->with(['evaluationRule', 'differentiatedEvaluationRule'])
            ->get()
            ->map(function ($model) use ($utilizaRegraDiferenciada) {
                if ($utilizaRegraDiferenciada && $model->differentiatedEvaluationRule) {
                    return $model->differentiatedEvaluationRule->parecer_descritivo;
                }

                return $model->evaluationRule->parecer_descritivo;
            })
            ->toArray();

        // Ignora regra que não usa parecer descritivo
        $descriptiveOpinionType = array_diff($descriptiveOpinionType, [RegraAvaliacao_Model_TipoParecerDescritivo::NENHUM]);

        return count(array_unique($descriptiveOpinionType)) <= 1;
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        return 'As séries selecionadas devem possuir o mesmo tipo de parecer descritivo.';
    }
}
