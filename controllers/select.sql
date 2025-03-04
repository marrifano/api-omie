SELECT 
    CODCCUSTO,
    CONCAT(UPPER(nome), ' (RADIO)') AS descricao, 
    CODCCUSTO AS estrutura
FROM gccusto 
WHERE codcoligada = '16' 
    AND CODCCUSTO >= '16' 
    AND ATIVO = 'T'
    AND nome NOT LIKE '%**%'
   -- AND CODCCUSTO like '_____'
ORDER BY codccusto;

