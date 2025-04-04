SELECT DISTINCT
                E.CODCFO AS CODIGO_INTEGRACAO,
                E.NOME AS RAZAO_SOCIAL,
                E.NOMEFANTASIA,
                E.CGCCFO AS CNPJ_CPF,
                E.RUA AS ENDERECO,
                E.NUMERO,
                E.BAIRRO,
                E.COMPLEMENTO,
                E.CODETD AS ESTADO,
                E.CIDADE,
                E.CEP,
                E.CONTATO,
                E.EMAIL,
                E.TELEFONE,
                E.INSCRESTADUAL,
                E.INSCRMUNICIPAL,
                CASE 
                    WHEN E.RAMOATIV = 1 THEN 'COMERCIO'
                    WHEN E.RAMOATIV = 3 THEN 'INDÚSTRIA'
                    WHEN E.RAMOATIV = 16 THEN 'RURAL'
                    ELSE 'OUTROS'
                END AS RAMO_ATIVIDADE
            FROM FCFO E
            WHERE E.CODCFO = :codigoClienteRM