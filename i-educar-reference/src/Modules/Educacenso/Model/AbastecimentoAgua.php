<?php

namespace iEducar\Modules\Educacenso\Model;

class AbastecimentoAgua
{
    public const REDE_PUBLICA = 1;

    public const POCO_ARTESIANO = 2;

    public const CACIMBA_CISTERNA_POCO = 3;

    public const FONTE = 4;

    public const INEXISTENTE = 5;

    public const CARRO_PIPA = 6;

    public static function getDescriptiveValues()
    {
        return [
            self::REDE_PUBLICA => 'Rede pública',
            self::POCO_ARTESIANO => 'Poço artesiano',
            self::CACIMBA_CISTERNA_POCO => 'Cacimba/cisterna/poço',
            self::FONTE => 'Fonte/rio/igarapé/riacho/córrego',
            self::CARRO_PIPA => 'Carro-Pipa',
            self::INEXISTENTE => 'Não há abastecimento de água',
        ];
    }
}
