<?php

namespace iEducar\Modules\Reports\QueryFactory;

class MovimentoMensalMatTransfQueryFactory extends MovimentoMensalDetalheQueryFactory
{
    public function where()
    {
        return 'transferido and enturmacao_transferida and saiu_durante';
    }
}
