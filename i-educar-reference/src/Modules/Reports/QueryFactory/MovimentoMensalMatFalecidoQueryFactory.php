<?php

namespace iEducar\Modules\Reports\QueryFactory;

class MovimentoMensalMatFalecidoQueryFactory extends MovimentoMensalDetalheQueryFactory
{
    public function where()
    {
        return 'falecido and enturmacao_falecido and saiu_durante';
    }
}
