// npm init -y
// npx http-server

mapboxgl.accessToken = "pk.eyJ1IjoiYm9zc2Jvc3NsZXUiLCJhIjoiY2trcHU5N2EyMGJwdDJvbnRvc2g2djNubSJ9.MH9jCElgj_r1kHN305ijZw";

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [121.6169873253, 25.054204596616],
    zoom: 16,
    pitch: 60,
    bearing: 0,
});

// Load and parse the CSV files
async function loadCsvData(urls) {
    const dataPromises = urls.map(url => fetch(url).then(response => response.text()).then(csvText => Papa.parse(csvText, { header: true }).data));
    const allData = await Promise.all(dataPromises);
    return allData;
}

// Add Layers and Visualize
async function addLayerAndSetFeatureState(map, source, sourceLayer, csvLookup) {
    const features = map.querySourceFeatures(source, { sourceLayer });

    features.forEach((feature) => {
        const NO = feature.properties.NO;
        const floor = feature.properties.floors;
        if (csvLookup[NO] && csvLookup[NO][floor] !== undefined) {
            const noice = csvLookup[NO][floor];
            map.setFeatureState(
                {
                    source,
                    sourceLayer,
                    id: feature.id,
                },
                {
                    noice: noice,
                }
            );
        }
    });

    if (!map.getLayer(sourceLayer)) {
        map.addLayer({
            id: sourceLayer,
            source,
            'source-layer': sourceLayer,
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
                'fill-extrusion-color': [
                    'interpolate',
                    ['linear'],
                    ['feature-state', 'noice'],
                    30, '#0392cf',
                    40, '#00f6cb',
                    50, '#61f205',
                    60, '#fdf498',
                    70, '#ebac00',
                    80, '#fb7607',
                    90, '#fb0505',
                ],
                'fill-extrusion-base': [
                    '*',
                    ['-', ['get', 'floors'], 1],
                    3.3,
                ],
                'fill-extrusion-height': ['*', ['get', 'floors'], 3.3],
                'fill-extrusion-opacity': 1,
            },
        });
    }
}

// Function to update the map with CSV data
map.on('load', async function () {
    const csvUrls = [
        'http://localhost:3000/api/Building_noise/building_Nangang_2024061312.csv',
        'http://localhost:3000/api/Building_noise/building_Xinyi_2024061312.csv'
    ];

    const csvDataArray = await loadCsvData(csvUrls);

    const sources = [
        { id: 'nangang-source', url: 'mapbox://bossbossleu.1qxhzc18' },
        { id: 'xinyi-n-source', url: 'mapbox://bossbossleu.d4fifkzu' },
        { id: 'xinyi-s-source', url: 'mapbox://bossbossleu.3l205qzo' }
    ];

    sources.forEach(source => {
        map.addSource(source.id, {
            type: 'vector',
            url: source.url
        });
    });

    // Logging to verify source addition
    sources.forEach(source => {
        console.log(`${source.id}:`, map.getSource(source.id));
    });

    const csvLookups = csvDataArray.map(csvData => {
        const lookup = {};
        csvData.forEach((row) => {
            const { NO, floor, LEQ } = row;
            if (!lookup[NO]) {
                lookup[NO] = {};
            }
            lookup[NO][floor] = parseFloat(LEQ);
        });
        return lookup;
    });

    const sourceLayerMappings = [
        { source: 'nangang-source', sourceLayer: 'nangang-1kxhr3', csvLookup: csvLookups[0] },
        { source: 'xinyi-n-source', sourceLayer: 'xinyi_n-allumn', csvLookup: csvLookups[1] },
        { source: 'xinyi-s-source', sourceLayer: 'xinyi_s-1uuhxb', csvLookup: csvLookups[1] }
    ];

    console.log(sourceLayerMappings)
    const loadedSources = new Set();

    // Ensure all sources are fully loaded before processing mappings
    function checkAllSourcesLoaded() {
        if (loadedSources.size === sources.length) {
            console.log('All sources are fully loaded. Processing mappings...');
            sourceLayerMappings.forEach((mapping, index) => {
                addLayerAndSetFeatureState(map, mapping.source, mapping.sourceLayer, mapping.csvLookup);
                console.log(`Finished processing mapping ${index + 1}.`);
            });
        }
    }

    function updatePaintOnMove() {
        console.log('Updating paint on map move...');
        sourceLayerMappings.forEach((mapping, index) => {
            addLayerAndSetFeatureState(map, mapping.source, mapping.sourceLayer, mapping.csvLookup);
            console.log(`Finished updating paint for mapping ${index + 1}.`);
        });
    }

    map.on('sourcedata', (e) => {
        if (e.isSourceLoaded) {
            const sourceId = e.sourceId;
            console.log(`Source ${sourceId} is fully loaded.`);
            loadedSources.add(sourceId);
            checkAllSourcesLoaded();
        }
    });

    map.on('moveend', () => {
        updatePaintOnMove();
    });

    // Additional check after a certain timeout to handle sources that don't trigger 'sourcedata' with isSourceLoaded = true
    setTimeout(() => {
        sources.forEach(source => {
            if (!loadedSources.has(source.id)) {
                console.log(`Timeout reached. Assuming source ${source.id} is loaded.`);
                loadedSources.add(source.id);
            }
        });
        checkAllSourcesLoaded();
    }, 1000); // Adjust the timeout value as needed
});


