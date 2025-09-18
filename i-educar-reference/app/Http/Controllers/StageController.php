<?php

namespace App\Http\Controllers;

use App\Exceptions\Stage\StageException;
use App\Http\Requests\StageRequest;
use App\Models\LegacyAcademicYearStage;
use App\Models\LegacySchoolAcademicYear;
use App\Models\LegacySchoolClass;
use App\Models\LegacySchoolClassStage;
use App\Process;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StageController extends Controller
{
    public function update(StageRequest $request)
    {
        $params = [
            'stageDates' => $request->get('etapas'),
            'institution' => $request->get('ref_cod_instituicao'),
            'year' => $request->get('ano'),
            'stage' => $request->get('ref_cod_modulo'),
            'courses' => $request->get('curso'),
            'schools' => $request->get('escola'),
        ];

        try {
            if ($request->get('tipo') === 'schoolclass') {
                $schoolClasses = $this->updateSchoolClasses($params);
                $count = $schoolClasses->count();
                $message = "Atualização em lote efetuada com sucesso em {$count} turmas.";
            } else {
                $schoolAcademicYears = $this->updateSchools($params);
                $count = $schoolAcademicYears->unique('ref_cod_escola')->count();
                $message = "Atualização em lote efetuada com sucesso em {$count} escolas.";
            }

            session()->flash('success', $message);
        } catch (StageException $e) {
            session()->flash('error', $e->getMessage());
        } catch (\Exception) {
            session()->flash('error', 'Atualização em lote não realizada.');
        }

        return redirect()->route('stage.edit')->withInput();
    }

    private function updateSchoolClasses(array $params): Collection
    {
        $schoolClasses = LegacySchoolClass::query()
            ->whereInstitution($params['institution'])
            ->whereYearEq($params['year'])
            ->when($params['schools'], fn ($q) => $q->whereIn('ref_ref_cod_escola', $params['schools']))
            ->when($params['courses'], fn ($q) => $q->whereIn('ref_cod_curso', $params['courses']))
            ->whereHas('schoolClassStages', function ($q) use ($params) {
                $q->when($params['stage'], fn ($q) => $q->where('ref_cod_modulo', $params['stage']));
            })
            ->whereHas('course', fn ($q) => $q->whereStandardCalendar(0))
            ->pluck('cod_turma');

        if ($schoolClasses->isEmpty()) {
            throw new StageException('Nenhuma turma encontrada com os filtros selecionados');
        }

        DB::beginTransaction();
        foreach ($params['stageDates'] as $stage => $data) {
            $updateData = $this->prepareUpdateData($data);
            if (!empty($updateData)) {
                LegacySchoolClassStage::query()
                    ->whereIn('ref_cod_turma', $schoolClasses)
                    ->where('sequencial', $stage)
                    ->update($updateData);
                LegacySchoolClass::query()
                    ->whereIn('cod_turma', $schoolClasses)
                    ->update(['updated_at' => now()]);
            }
        }
        DB::commit();

        return $schoolClasses;
    }

    private function updateSchools(array $params): Collection
    {
        $schoolAcademicYears = LegacySchoolAcademicYear::query()
            ->whereHas('school', fn ($q) => $q->whereInstitution($params['institution']))
            ->whereYearEq($params['year'])
            ->when($params['schools'], fn ($q, $schools) => $q->whereIn('ref_cod_escola', $schools))
            ->whereHas('academicYearStages', function ($q) use ($params) {
                $q->when($params['stage'], fn ($q) => $q->where('ref_cod_modulo', $params['stage']));
            })
            ->active()
            ->where('escola_ano_letivo.andamento', '<>', LegacySchoolAcademicYear::FINALIZED)
            ->get(['id', 'ref_cod_escola']);

        if ($schoolAcademicYears->isEmpty()) {
            throw new StageException('Nenhuma escola encontrada com os filtros selecionados');
        }

        $schoolAcademicYearsIds = $schoolAcademicYears->pluck('id');

        DB::beginTransaction();
        foreach ($params['stageDates'] as $stage => $data) {
            $updateData = $this->prepareUpdateData($data);
            if (!empty($updateData)) {
                LegacyAcademicYearStage::query()
                    ->whereIn('escola_ano_letivo_id', $schoolAcademicYearsIds)
                    ->where('sequencial', $stage)
                    ->update($updateData);
                LegacySchoolAcademicYear::query()
                    ->whereIn('id', $schoolAcademicYearsIds)
                    ->update(['updated_at' => now()]);
            }
        }
        DB::commit();

        return $schoolAcademicYears;
    }

    private function prepareUpdateData(array $data): array
    {
        // Deve-se remove os campos vazios, com intuito de manter os valores no banco durante o update
        // Transforma as datas no formato do banco
        return array_filter([
            'data_inicio' => $data['data_inicio'] ? Carbon::createFromFormat('d/m/Y', $data['data_inicio']) : null,
            'data_fim' => $data['data_fim'] ? Carbon::createFromFormat('d/m/Y', $data['data_fim']) : null,
            'dias_letivos' => $data['dias_letivos'],
        ]);
    }

    public function edit()
    {
        $this->menu(Process::STAGE);
        $this->breadcrumb('Atualizar etapas da escola e turma', [
            url('/intranet/educar_configuracoes_index.php') => 'Configurações',
        ]);

        return view('stage.edit', ['user' => request()->user()]);
    }
}
