SELECT 
    year AS Year,
    month AS Month,
    CliCod,
    CLIENTE as Client,
    LOCALIDAD,
    COD,
    PRO_DES AS Product,
    SUM(NsProQtd) AS Units,
    SUM(NETO) AS Guaranies,
    SUM(Descuento) AS Discount,
    SUM("BRUTO REAL") AS BruteSales,
    CASE
		WHEN LEFT(COD, 2) = 'BG' THEN "BAGO"
        WHEN LEFT(COD, 2) = 'SA' THEN "SANCOR"
        WHEN LEFT(COD, 2) = 'EN' THEN "ENFA"
        ELSE "LANZ"
    END AS SUC    
FROM
    ventas
GROUP BY
	Year,
    Month,
    CliCod,
    Cliente,
    Localidad,
    COD;