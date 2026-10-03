const fs = require('fs');
const readline = require('readline');
const path = require('path');

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

const csvFile = path.resolve(__dirname, '../MISSION COMPLETED ALL DATA.csv');
const rl = readline.createInterface({ input: fs.createReadStream(csvFile) });

let lineNum = 0;
const blockStats = {};
const allPlots = [];

rl.on('line', (line) => {
  lineNum++;
  if (lineNum === 1) return; // header: plot_id,sector,block,plot_number,size_category,center_latitude,center_longitude,road_width_ft,road_name,is_corner,orientation_deg
  if (!line.trim()) return;

  const cols = parseCSVLine(line);
  if (cols.length >= 7) {
    const plotId = cols[0];
    const sectorRaw = cols[1].replace(/^["']|["']$/g, '').trim();
    const block = cols[2].replace(/^["']|["']$/g, '').trim();
    const plotNumber = cols[3].replace(/^["']|["']$/g, '').trim();
    const sizeCategory = cols[4].replace(/^["']|["']$/g, '').trim();
    const lat = parseFloat(cols[5]);
    const lng = parseFloat(cols[6]);
    const roadWidth = cols[7] ? parseFloat(cols[7]) : 40;
    const roadName = cols[8] ? cols[8].replace(/^["']|["']$/g, '').trim() : '';
    const isCorner = cols[9] === '1';
    const orientation = cols[10] ? parseFloat(cols[10]) : 0;

    if (!isNaN(lat) && !isNaN(lng)) {
      if (!blockStats[block]) {
        blockStats[block] = {
          minLat: lat,
          maxLat: lat,
          minLng: lng,
          maxLng: lng,
          sumLat: lat,
          sumLng: lng,
          count: 1,
        };
      } else {
        const s = blockStats[block];
        if (lat < s.minLat) s.minLat = lat;
        if (lat > s.maxLat) s.maxLat = lat;
        if (lng < s.minLng) s.minLng = lng;
        if (lng > s.maxLng) s.maxLng = lng;
        s.sumLat += lat;
        s.sumLng += lng;
        s.count++;
      }

      // Generate standard rectangular bounds around centroid based on size
      const isKanal = sizeCategory.includes('Kanal');
      const offset = isKanal ? 0.00015 : 0.00008;
      const boundaryGeo = [
        { lat: Number((lat + offset).toFixed(7)), lng: Number((lng - offset).toFixed(7)) },
        { lat: Number((lat + offset).toFixed(7)), lng: Number((lng + offset).toFixed(7)) },
        { lat: Number((lat - offset).toFixed(7)), lng: Number((lng + offset).toFixed(7)) },
        { lat: Number((lat - offset).toFixed(7)), lng: Number((lng - offset).toFixed(7)) },
      ];

      allPlots.push({
        id: plotId,
        society: 'LDA City',
        sector: sectorRaw,
        block: block,
        plot_number: plotNumber,
        area: sizeCategory,
        road: roadName,
        road_width_ft: roadWidth,
        is_corner: isCorner,
        orientation_deg: orientation,
        coordinates: [lng, lat],
        lat: lat,
        lng: lng,
        boundaryGeo: boundaryGeo,
        isPrecalibratedGps: true,
      });
    }
  }
});

rl.on('close', () => {
  console.log(`Parsed ${allPlots.length} valid plots from MISSION COMPLETED ALL DATA.csv`);

  const blockMetadata = {};
  for (const [b, s] of Object.entries(blockStats).sort()) {
    blockMetadata[b] = {
      center: [Number((s.sumLat / s.count).toFixed(6)), Number((s.sumLng / s.count).toFixed(6))],
      bounds: [
        [Number(s.minLat.toFixed(6)), Number(s.minLng.toFixed(6))],
        [Number(s.maxLat.toFixed(6)), Number(s.maxLng.toFixed(6))],
      ],
      count: s.count,
    };
  }

  console.log('Block Metadata computed:');
  console.log(JSON.stringify(blockMetadata, null, 2));

  // Write updated lda_city_master_data.json to both public/ and root and CLOUDFLARE_UPLOAD_FOLDER/
  const jsonContent = JSON.stringify(allPlots);

  const targets = [
    path.resolve(__dirname, '../public/lda_city_master_data.json'),
    path.resolve(__dirname, '../lda_city_master_data.json'),
  ];

  targets.forEach((dest) => {
    fs.writeFileSync(dest, jsonContent);
    const szMb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(`Saved ${dest} (${szMb} MB)`);
  });

  // Also save a copy of MISSION COMPLETED ALL DATA.csv to public/ so clients can access or download it
  const publicCsv = path.resolve(__dirname, '../public/MISSION COMPLETED ALL DATA.csv');
  fs.copyFileSync(csvFile, publicCsv);
  console.log(`Copied CSV to ${publicCsv}`);
});
