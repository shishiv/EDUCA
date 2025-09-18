<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchoolNotice extends Model
{
    use SoftDeletes;

    public const PROCESS = 1027;

    protected $table = 'school_notices';

    protected $casts = [
        'date' => 'date',
        'hour' => 'datetime',
    ];

    protected $fillable = [
        'institution_id',
        'user_id',
        'school_id',
        'title',
        'description',
        'date',
        'hour',
        'local',
    ];

    /**
     * @return BelongsTo<LegacyInstitution, $this>
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(LegacyInstitution::class, 'institution_id');
    }

    /**
     * @return BelongsTo<LegacyUser, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(LegacyUser::class, 'user_id');
    }

    /**
     * @return BelongsTo<Employee, $this>
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'user_id');
    }

    /**
     * @return BelongsTo<LegacySchool, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(LegacySchool::class, 'school_id');
    }
}
