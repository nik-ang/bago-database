SELECT
	REPLACE(desc_raiz, "'", " ") AS Product,
    desc_labo AS Lab,
    Corporacion AS Corporation,
    Clase AS ATC,
    atcname AS ATCName,
    Moleculas AS Molecule,
    val AS PXs,
    Year,
    NroMes AS Month,
    TRM,
    SEM
FROM
(SELECT 
    descripcion,
    prod,
    SUM(val) AS val,
    CONCAT(20, RIGHT(periodo, 2)) AS Year,
    NroMes,
    TRM,
    SEM
FROM
    bagodb.pxreportmensual
        JOIN
    meses ON LEFT(periodo, 3) = MesCloseUp
GROUP BY prod, NroMes, Year) AS tab
	JOIN basecloseupfamilias ON LEFT(prod, LENGTH(prod)-4) = DESC_RAIZ
    LEFT JOIN (SELECT * FROM atcnames GROUP BY ATCCod) AS ATCNames ON atccod = clase