class App {
  constructor(LAT, LNG, TILE_SIZE, ZOOM) {
    this.canvas = document.getElementById('mapCanvas');
    this.lat = LAT;
    this.lng = LNG;
    this.zoom = ZOOM
    this.tile_size = TILE_SIZE
    this.tcnumber = []
    this.ctx = this.canvas.getContext('2d');
    this.items = {}

    this.init()
  }

  latLngToTile(zoom){
    const scale = Math.pow(2, zoom);
    const worldCoordinateX = ((this.lng + 180) / 360) * scale * TILE_SIZE;
    const worldCoordinateY = (1 - Math.log(Math.tan(this.lat * Math.PI / 180) + 1 / Math.cos(this.lat * Math.PI / 180)) / Math.PI) / 2 * scale * this.tile_size;
    const tileX = Math.floor(worldCoordinateX / this.tile_size);
    const tileY = Math.floor(worldCoordinateY / this.tile_size);
    
    return { tileX, tileY };
  }

  drawMap(zoom, callback) {
    const centerTile = this.latLngToTile(zoom);
    const canvasCenterX = this.canvas.width / 2 - this.tile_size / 2;
    const canvasCenterY = this.canvas.height / 2 - this.tile_size / 2;
    
    let tilesLoaded = 0;
    const totalTiles = 25;

    for (let dx=-2; dx <=2; dx++) {
      for (let dy=-2; dy<=2; dy++) {
        const tileX = centerTile.tileX + dx;
        const tileY = centerTile.tileY + dy;
        const offsetX = canvasCenterX + dx * this.tile_size;
        const offsetY = canvasCenterY + dy * this.tile_size;

        const img = new Image();
        const url = `https://c.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

        img.src = url;
        img.onload = () => {
          this.ctx.drawImage(img, offsetX, offsetY, this.tile_size, this.tile_size);
          tilesLoaded++;
          if (tilesLoaded === totalTiles) {
            callback();
          }
        };
      }
    }
  }

  init() {
    this.loadData()
    this.drawMap(this.zoom, () => {

    })
  }

  reset() {
    this.drawMap(this.zoom, () => {
      const infoDiv = document.getElementById('TC_info');
      const checkboxes = infoDiv.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
    })
  }

  async loadData() {
    this.data = await fetchCSVData();
  }

  drawbtn(){
    const tcnumber = document.getElementById('tcnumber').value.trim();
    this.get_TCData(tcnumber);
    this.logCheckedTCnumbers();

  }

  get_TCData(tcnumber) {
    const filteredData = this.data.filter(row => row.tcnumber ===tcnumber)
    .map(row => ({
      lat: parseFloat(row.bestlat),
      lon: parseFloat(row.bestlon)
    }));
    if (filteredData.length > 0 ) {
      if (!this.items[tcnumber]) {
      this.items[tcnumber] = filteredData;
      this.add_TCcheckbox(tcnumber);
      }

    }
  }

  add_TCcheckbox(tcnumber) {
    const infoDiv = document.getElementById('TC_info');
    const checkboxes = infoDiv.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `checkbox-${tcnumber}`;
    checkbox.value = tcnumber;
    checkbox.checked = true;
    checkbox.addEventListener('change', () => {
      this.logCheckedTCnumbers(); // 체크박스 상태 변경 시 체크된 항목 출력
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = tcnumber;

    const newRow = document.createElement('div');
    newRow.appendChild(checkbox);
    newRow.appendChild(label);
    
    infoDiv.appendChild(newRow);
  }

  logCheckedTCnumbers() {
    const checkboxes = document.querySelectorAll('#TC_info input[type="checkbox"]');
    this.checkedTCnumbers = [];
    checkboxes.forEach(checkbox => {
      if(checkbox.checked) {
        this.checkedTCnumbers.push(checkbox.value);
      }
    });
    this.draw_TCpath()
  }

  draw_TCpath() {
    this.drawMap(this.zoom, () => {
    
    this.checkedTCnumbers.forEach(tcnumber => {
      const data = this.items[tcnumber];
      if (data) {
        this.draw_TCline(data)
        this.draw_TCpoint(data)
      }
    })
  })

  }

  draw_TCline(data) {
    this.ctx.beginPath()
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 2;
    data.forEach((point, index) => {
      const {lat, lon} = point;
      const {x, y} = this.latLngToPixel(lat, lon, this.zoom);
      
      if (index > 0 ) {
        const prevPoint = data[index-1];
        const { x: prevX, y: prevY} = this.latLngToPixel(prevPoint.lat, prevPoint.lon, this.zoom);
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();
  }
  draw_TCpoint(data) {
    this.ctx.fillStyle = 'black';
    data.forEach((point) => {
      this.ctx.beginPath()
      const {lat, lon} = point;
      const {x, y} = this.latLngToPixel(lat, lon, this.zoom);
      this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
      this.ctx.fill();
    })

  }
  latLngToPixel(lat, lng, zoom) {
    const scale = Math.pow(2, zoom) * TILE_SIZE;
    const worldCoordinateX = ((lng + 180) / 360) * scale;
    const worldCoordinateY = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * scale;
    const tileX = worldCoordinateX / TILE_SIZE ;
    const tileY = worldCoordinateY / TILE_SIZE ;
    const centerTile = this.latLngToTile(zoom);
    const canvasCenterX = this.canvas.width / 2 - TILE_SIZE/2;
    const canvasCenterY = this.canvas.height/ 2 - TILE_SIZE/2;
    const offsetX = (tileX - centerTile.tileX) * TILE_SIZE;
    const offsetY = (tileY - centerTile.tileY) * TILE_SIZE;
    
    return { x: canvasCenterX + offsetX, y: canvasCenterY+ offsetY };
  }


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
document.getElementById('tcnumber').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') { // Check if Enter key is pressed
    event.preventDefault(); // Prevent default action
    document.getElementById('drawPathButton').click(); // Simulate button click
  }
});
const TILE_SIZE = 128;
const ZOOM = 4;
const LAT = 37.5665;
const LNG = 126.9780;

const app = new App(LAT, LNG, TILE_SIZE, ZOOM)