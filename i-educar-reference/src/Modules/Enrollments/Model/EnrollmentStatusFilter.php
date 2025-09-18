<?php

namespace iEducar\Modules\Enrollments\Model;

use App\Models\RegistrationStatus;
use Illuminate\Support\Collection;

class EnrollmentStatusFilter
{
    public const EXCEPT_TRANSFERRED_OR_ABANDONMENT = 9;

    public const ALL = 10;

    public static function getDescriptiveValues()
    {
        return [
            1 => 'Aprovado',
            2 => 'Reprovado',
            3 => 'Cursando',
            4 => 'Transferido',
            5 => 'Reclassificado',
            6 => 'Deixou de Frequentar',
            9 => 'Exceto Transferidos/Deixou de Frequentar',
            self::ALL => 'Todas',
            12 => 'Aprovado com dependência',
            13 => 'Aprovado pelo conselho',
            14 => 'Reprovado por faltas',
            15 => 'Falecido',
        ];
    }

    public static function getShortWithDependecyAndBoardValues(): Collection
    {
        $excludedStatuses = [
            RegistrationStatus::IN_EXAM,
            RegistrationStatus::APPROVED_PAST_EXAM,
            RegistrationStatus::APPROVED_WITHOUT_EXAM,
            RegistrationStatus::PRE_REGISTRATION,
            RegistrationStatus::REPROVED_BY_ABSENCE,
            RegistrationStatus::DECEASED,
        ];

        return collect(RegistrationStatus::getRegistrationAndEnrollmentStatus())
            ->except($excludedStatuses)
            ->prepend('Exceto Transferidos/Deixou de Frequentar', 9)
            ->prepend('Todas', 10
            );
    }

    public static function getShortWithExamAndDependecyValues(): Collection
    {
        $excludedStatuses = [
            RegistrationStatus::APPROVED_PAST_EXAM,
            RegistrationStatus::APPROVED_WITHOUT_EXAM,
            RegistrationStatus::PRE_REGISTRATION,
            RegistrationStatus::APPROVED_BY_BOARD,
            RegistrationStatus::REPROVED_BY_ABSENCE,
            RegistrationStatus::DECEASED,
        ];

        return collect(RegistrationStatus::getRegistrationAndEnrollmentStatus())
            ->except($excludedStatuses)
            ->prepend('Exceto Transferidos/Deixou de Frequentar', 9)
            ->prepend('Todas', 10
            );
    }

    public static function getShortValues(): Collection
    {
        $excludedStatuses = [
            RegistrationStatus::IN_EXAM,
            RegistrationStatus::APPROVED_WITH_DEPENDENCY,
            RegistrationStatus::APPROVED_PAST_EXAM,
            RegistrationStatus::APPROVED_WITHOUT_EXAM,
            RegistrationStatus::PRE_REGISTRATION,
            RegistrationStatus::APPROVED_BY_BOARD,
            RegistrationStatus::REPROVED_BY_ABSENCE,
            RegistrationStatus::DECEASED,
        ];

        return collect(RegistrationStatus::getRegistrationAndEnrollmentStatus())
            ->except($excludedStatuses)
            ->prepend('Exceto Transferidos/Deixou de Frequentar', 9)
            ->prepend('Todas', 10);
    }
}
