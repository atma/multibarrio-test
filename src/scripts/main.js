//import Dumb from './modules/dumb';

import Autocomplete from './modules/autocomplete';

let searchText = document.querySelector('.nav-search-input');
let suggestionsMock = {"paging":{"total":8400,"limit":10,"offset":0},"filters":{"country":"MLM","query_category":"classified","q":"san","wildcard":"true"},"suggestions": [
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Del Valle Centro",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Benito Juárez",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Del Valle Norte",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Benito Juárez",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Del Valle",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Benito Juárez",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Del Valle Sur",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Benito Juárez",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Letrán Valle",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Benito Juárez",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Tlacoquemecatl del Valle",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Benito Juárez",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Nápoles",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Benito Juárez",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Roma Norte",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Roma Sur",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Hipódromo de la Condesa",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Condesa",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Hipódromo",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "San Rafael",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Santa María la Ribera",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Tabacalera",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Juárez",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Doctores",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Cuauhtémoc",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Buenos Aires",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Cuauhtemoc",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Bosques de las Lomas",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Lomas de Chapultepec",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Lomas Altas",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Lomas Barrilaco",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Lomas de Bezares",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Lomas de Reforma",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Lomas de Sotelo",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Lomas Virreyes",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Polanco Chapultepec",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Polanco I Sección",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Polanco II Sección",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Polanco III Sección",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Polanco IV Sección",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Polanco V Sección",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Polanco Reforma",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Granada",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Anahuac",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Nueva Anzures",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Verónica Anzueres",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        },
        {
            "id": "B-MX-BCA-ENS-SS1",
            "legacy_classified_id": "TUxNQlNBTjg1MDY",
            "name": "Anahuac I Sección",
            "type": "neighborhood",
            "filters_to_apply": [{
                "country_id": "P-MX",
                "country_name": "Mexico",
                "country_legacy_core_id": "MX",
                "country_legacy_classified_id": "MX",
                "state_id": "E-MX-DIF",
                "state_name": "Distrito Federal",
                "state_legacy_core_id": "MX-DIF",
                "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
                "city_id": "C-MX-BCA-ENS",
                "city_name": "Miguel Hidalgo",
                "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
                "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
            }]
        }
    ]
};

window.autocomplete = new Autocomplete(searchText, {
        wrapper: 'autocomplete-wrapper',
        multiple: true
    })
    .on('type', searchText => {
        if (searchText.length >= 2) {
            getSuggestion(searchText);
        } else {
            autocomplete.suggest([]);
        }
    })
    .on('select', (val, pos) => {
        const f = autocomplete._suggestionsData[pos].filters_to_apply[0];

        if (!autocomplete.getFilters().length) {
            autocomplete.setFilters([
                {key: 'state_name', name: f.state_name, value: f.state_name},
                {key: 'city_name', name: f.city_name, value: f.city_name}
            ]);
        }
    });

function getSuggestion(searchText) {
    function remove_accents(s) {
        let r = s.toLowerCase();
        const non_asciis = {'a': '[àáâãäå]', 'ae': 'æ', 'c': 'ç', 'e': '[èéêë]', 'i': '[ìíîï]', 'n': 'ñ', 'o': '[òóôõö]', 'oe': 'œ', 'u': '[ùúûűü]', 'y': '[ýÿ]'};
        for (let i in non_asciis) { r = r.replace(new RegExp(non_asciis[i], 'g'), i); }
        return r;
    }

    searchText = remove_accents(searchText);

    const filters = autocomplete.getFilters();
    const values = autocomplete.getValue();
    let suggestionsList = [];
    let suggestions = [];

    if (filters.length) {
        suggestionsMock.suggestions.forEach(s => {
            if (s.filters_to_apply[0][filters[0].key] == filters[0].value && s.filters_to_apply[0][filters[1].key] == filters[1].value) {
                suggestionsList.push(s);
            }
        });
    } else {
        suggestionsList = suggestionsMock.suggestions;
    }

    suggestionsList.forEach(s => {
        const val = remove_accents(s.name);
        if (values.indexOf(s.name) == -1 && val.indexOf(searchText) !== -1) {
            suggestions.push(s);
        }
    });

    return parseResults(suggestions);
}

function parseResults(suggestions) {
    const s = suggestions.map(function(s) {
        var nameParts = [s.name],
            filter;

        if (s.filters_to_apply.length) {
            filter = s.filters_to_apply[0];

            if (s.type === 'neighborhood') {
                nameParts.push(filter.city_name);
            }
            if (s.type !== 'state') {
                nameParts.push(filter.state_name);
            }
        }

        return nameParts.join(', ');
    }).slice(0, 10);

    autocomplete.suggest(s, suggestions.slice(0, 10));
}

tiny.on('.nav-search', 'submit', e => {
    e.preventDefault();
});

tiny.on('.nav-search-submit', 'click', e => {
    e.preventDefault();
    //setTimeout(() => {window.location.reload(true)}, 1000);
});
