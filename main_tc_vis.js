const TILE_SIZE = 128;
const ZOOM = 4;
const LAT = 37.5665;
const LNG = 126.9780;

const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
document.getElementById('tcnumber').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') { // Check if Enter key is pressed
    event.preventDefault(); // Prevent default action
    document.getElementById('drawPathButton').click(); // Simulate button click
  }
});

function latLngToTile(lat, lng, zoom) {
  const scale = Math.pow(2, zoom);
  const worldCoordinateX = ((lng + 180) / 360) * scale * TILE_SIZE;
  const worldCoordinateY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale * TILE_SIZE;

  const tileX = Math.floor(worldCoordinateX / TILE_SIZE);
  const tileY = Math.floor(worldCoordinateY / TILE_SIZE);
  
  return { tileX, tileY};
}


function drawMap(lat, lng, zoom, callback) {
  const centerTile = latLngToTile(lat, lng, zoom);
  const canvasCenterX = canvas.width / 2 - TILE_SIZE/2;
  const canvasCenterY = canvas.height / 2 - TILE_SIZE/2;
  let tilesLoaded = 0;
  const totalTiles = 25;

  for (let dx=-2; dx <=2; dx++) {
    for (let dy=-2; dy<=2; dy++) {
      const tileX = centerTile.tileX + dx;
      const tileY = centerTile.tileY + dy;
      const offsetX = canvasCenterX + dx*TILE_SIZE;
      const offsetY = canvasCenterY + dy*TILE_SIZE;

      const img = new Image();
      const url = `https://c.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
    
      img.src = url;
      img.onload = () => {
        ctx.drawImage(img, offsetX, offsetY, TILE_SIZE, TILE_SIZE);
        tilesLoaded++;
        if (tilesLoaded === totalTiles) {
          callback();
        }
      };
    }
  }
}

function latLngToPixel(lat, lng, zoom) {
  const scale = Math.pow(2, zoom) * TILE_SIZE;
  const worldCoordinateX = ((lng + 180) / 360) * scale;
  const worldCoordinateY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale;
  const tileX = worldCoordinateX / TILE_SIZE ;
  const tileY = worldCoordinateY / TILE_SIZE ;
  const centerTile = latLngToTile(LAT, LNG, zoom);
  const canvasCenterX = canvas.width / 2 - TILE_SIZE/2;
  const canvasCenterY = canvas.height/ 2 - TILE_SIZE/2;
  const offsetX = (tileX - centerTile.tileX) * TILE_SIZE;
  const offsetY = (tileY - centerTile.tileY) * TILE_SIZE;
  
  return { x: canvasCenterX + offsetX, y: canvasCenterY+ offsetY };
}


function drawPoint(lat, lng, zoom) {
  const point = latLngToPixel(lat, lng, zoom);


  ctx.beginPath();
  ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);  // 반지름 5px의 원
  ctx.fillStyle = 'blue';  // 점의 색상
  ctx.fill();
}

function loadJson(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status< 300) {
      callback(JSON.parse(xhr.responseText));
    }
  };
  xhr.send();
}

function drawTyphoonPath(data) {

  // Draw lines
  ctx.beginPath()
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  data.forEach((point, index) => {
    const {lat, lon} = point;
    const {x, y} = latLngToPixel(lat, lon, ZOOM);
    
    if (index > 0 ) {
      const prevPoint = data[index-1];
      const { x: prevX, y: prevY} = latLngToPixel(prevPoint.lat, prevPoint.lon, ZOOM);
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw points  
  ctx.fillStyle = 'black';
  data.forEach((point) => {
    ctx.beginPath()
    const {lat, lon} = point;
    const {x, y} = latLngToPixel(lat, lon, ZOOM);
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
  })
  
}

function parseCSV(text) {
  const rows = text.trim().split('\n');
  const headers = rows[0].split(',');

  return rows.slice(1).map(row => {
    const values = row.split(',');
    return headers.reduce((acc, header, i) => {
      acc[header] = values[i];
      return acc;
    }, {});
  });
}

async function fetchCSVData() {
  const response = await fetch('best_RSMC_js.csv');
  const csvText = await response.text();
  return parseCSV(csvText);
}

async function updateCanvas() {
  const tcnumber = document.getElementById('tcnumber').value.trim();
  const data = await fetchCSVData();
  const filteredData = data.filter(row => row.tcnumber ===tcnumber)
  .map(row => ({
    lat: parseFloat(row.bestlat),
    lon: parseFloat(row.bestlon)
  }));
  drawTyphoonPath(filteredData);

}

drawMap(LAT, LNG, ZOOM, () => {
  // drawPoint(LAT, LNG, ZOOM);
  // drawPoint(35.1796, 129.0756, ZOOM);
  //loadJson('./typhoonPath_3h.json', drawTyphoonPath)
  fetchCSVData();
});
