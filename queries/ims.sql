SELECT 
    Product,
    Corporation,
    Laboratories,
    ATC,
    ATCName,
    Market,
    Molecules,
    USD,
    Guaranies,
    Units,
    Year,
    Month
FROM
    bagodb.baseims
LEFT JOIN (SELECT * FROM atcnames GROUP BY ATCCod) AS ATCnames ON ATC = ATCcod