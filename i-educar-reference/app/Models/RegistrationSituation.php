<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationSituation extends Model
{
    protected $table = 'relatorio.situacao_matricula';

    public $timestamps = false;

    protected $fillable = [
        'descricao',
    ];
}
