SELECT DISTINCT  
                        L.IDLAN AS codigo_lancamento_integracao,
                        L.CODCFO AS codigo_cliente_fornecedor,
                        L.DATAVENCIMENTO AS data_vencimento,       
                        L.VALORORIGINAL AS valor_documento
                        ,
                        NVL(T.DESCRICAO, 'Categoria Não Informada') AS codigo_categoria,
                        L.DATAPREVBAIXA AS data_previsao, 
                        L.CODCXA AS id_conta_corrente,
                        L.STATUSLAN, 
                        L.VALORBAIXADO AS valor_baixado,
                        NVL(    
                            CASE 
                                WHEN L.IDBAIXAPARCIAL IS NULL THEN 
                                    (L.VALOROP1 + L.VALOROP2 + L.VALOROP3 + 
                                        CASE 
                                            WHEN L.VALORDESCONTOBX IS NOT NULL AND L.VALORDESCONTOBX <> 0 THEN L.VALORDESCONTOBX
                                            WHEN L.VALORDESCONTO IS NOT NULL AND L.VALORDESCONTO <> 0 THEN L.VALORDESCONTO
                                            ELSE 0
                                        END + L.VALOROP4 + L.VALOROP5) 
                                ELSE NULL 
                            END, NULL
                        ) AS desconto_total,
                        L.VALORJUROSBX AS juros, 
                        L.VALORMULTABX AS multa,
                        L.DATABAIXA AS data_baixa,
                        L.HISTORICO AS observacao, 
                        UPPER(CC.NOME) || 
                            CASE 
                            WHEN CC.CODCOLIGADA = '10' THEN 
                                CASE 
                                    WHEN CC.CODCCUSTO IN ('10.07', '10.07.01', '10.07.02', '10.07.03', '10.07.04', '10.07.05', '10.07.06') THEN ' (TV CASTANHAL)'
                                    WHEN CC.CODCCUSTO IN ('10.08', '10.08.01', '10.08.02', '10.08.03', '10.08.04', '10.08.05', '10.08.06', '10.08.07') THEN ' (TV MARABÁ)'
                                    WHEN CC.CODCCUSTO IN ('10.09', '10.09.01', '10.09.02', '10.09.03', '10.09.04', '10.09.05', '10.09.06', '10.09.07') THEN ' (TV PARAGOMINAS)'
                                    WHEN CC.CODCCUSTO IN ('10.10', '10.10.01', '10.10.02', '10.10.03', '10.10.04', '10.10.05', '10.10.06', '10.10.07') THEN ' (TV REDENÇÃO)'
                                    WHEN CC.CODCCUSTO IN ('10.11', '10.11.01', '10.11.02', '10.11.03', '10.11.04', '10.11.05', '10.11.06') THEN ' (TV PARAUAPEBAS)'
                                    WHEN CC.CODCCUSTO IN ('10.12', '10.12.01', '10.12.02', '10.12.03', '10.12.04', '10.12.05', '10.12.06') THEN ' (TV ALTAMIRA)'
                                    ELSE ' (TELEVISÃO)' 
                                END
                            WHEN CC.CODCOLIGADA = '08' THEN ' (MODELO)'
                            WHEN CC.CODCOLIGADA = '12' THEN ' (LIBNET)'
                            WHEN CC.CODCOLIGADA = '15' THEN ' (DELTA)'
                            WHEN CC.CODCOLIGADA = '16' THEN ' (RADIO)'
                            WHEN CC.CODCOLIGADA = '21' THEN ' (ORM AIR)'
                            WHEN CC.CODCOLIGADA = '1'  THEN ' (DELTA DADOS)'
                            ELSE ' (OUTRA EMPRESA)'
                            END AS departamento,
                            L.CODCOLIGADA as coligada,
                            L.VALORIRRF,
                            FBAIXA.RECCREATEDON
                        
                    FROM FLAN L    
                        LEFT JOIN GFILIAL F ON L.CODCOLIGADA = F.CODCOLIGADA AND L.CODFILIAL = F.CODFILIAL
                        LEFT JOIN FCFO C ON L.CODCFO = C.CODCFO 
                        LEFT JOIN TMOV M ON M.CODCOLIGADA = F.CODCOLIGADA AND M.IDMOV = L.IDMOV 
                        LEFT JOIN FCXA CX ON CX.CODCXA = L.CODCXA  
                        LEFT JOIN GBANCO B ON B.NUMBANCO = CX.NUMBANCO  
                        LEFT JOIN FLANBAIXA FBAIXA ON FBAIXA.IDLAN = L.IDLAN AND FBAIXA.CODCOLIGADA = L.CODCOLIGADA AND FBAIXA.CODFILIAL = L.CODFILIAL 
                        LEFT JOIN GCCUSTO CC ON CC.CODCCUSTO = FBAIXA.CODCCUSTO AND CC.CODCOLIGADA = FBAIXA.CODCOLIGADA
                        LEFT JOIN FLANRATCCU NATU ON NATU.CODCCUSTO = CC.CODCCUSTO AND NATU.IDLAN = FBAIXA.IDLAN AND NATU.CODCOLIGADA = L.CODCOLIGADA
                        LEFT JOIN TTBORCAMENTO T ON NATU.CODCOLIGADA = T.CODCOLIGADA AND NATU.CODNATFINANCEIRA = T.CODTBORCAMENTO
                        LEFT JOIN GDEPTO DEPT ON DEPT.CODDEPARTAMENTO = L.CODDEPARTAMENTO AND DEPT.CODCOLIGADA = L.CODCOLIGADA AND L.CODFILIAL = DEPT.CODFILIAL
                   
                        WHERE FBAIXA.reccreatedon between TO_DATE('05/04/2025', 'DD/MM/YYYY')  and  TO_DATE(:datavencimento, 'DD/MM/YYYY')   
                        AND L.CODCOLIGADA IN (1, 8, 10, 12, 15, 16, 21) 
                        AND L.PAGREC = 2 
                        AND L.STATUSLAN IN (1)
                        AND FBAIXA.DATACANCELBAIXA IS NULL
                        AND L.CODCXA <> '777'   
                        AND L.HISTORICO  NOT LIKE ('%Transferencia%') AND L.HISTORICO NOT LIKE ('%Transferências%')
                        AND (T.DESCRICAO IS NULL OR T.DESCRICAO <> 'Transferências entre contas')  

 