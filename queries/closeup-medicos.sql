SELECT 
    matricula,
    nombre,
    localidad,
    val AS PXs,
    Year,
    NroMes As Month,
    TRM,
    SEM,
    DESC_raiz AS Product,
    desc_labo AS Lab,
    /*Corporacion AS Corporation,*/
    Clase AS ATC,
    Moleculas AS Molecules,
    nombre_vis AS Visitador,
    CASE
		WHEN nombre_vis IS NULL THEN "No Visitado"
        ELSE "Visitado"
	END AS Visted
FROM
    (SELECT 
			descripcion,
            matricula,
            nombre,
            localidad,
            prod,
            val,
            CONCAT(20, RIGHT(periodo, 2)) AS Year,
            NroMes,
            TRM,
            SEM
    FROM
        bagodb.pxreportmensual
    JOIN meses ON LEFT(periodo, 3) = MesCloseUp) AS tab
        LEFT JOIN
    basecloseupfamilias ON LEFT(prod, LENGTH(prod) - 4) = DESC_RAIZ
        LEFT JOIN
    (SELECT DISTINCT
        rpm, nombre_medico, nombre_vis
    FROM
        carteras2018
    WHERE
        ciclo IN (SELECT MAX(CICLO) FROM carteras2018)
	GROUP BY rpm) AS carteras2018 ON rpm = matricula