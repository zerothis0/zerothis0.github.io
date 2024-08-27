// import * as THREE from 'three';


// 장면(Scene) 설정
const scene = new THREE.Scene();
const w = window.innerWidth;
const h = window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 5000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// scene.fog = new THREE.FogExp2(0x808080, 0.0005);


// 타일 크기 및 줌 레벨 설정
const tileSize = 128;
const zoomLevel = 7;  // 도시 수준의 줌 레벨

// 서울의 위도와 경도
const seoulLat = 37.5665;  // 서울의 위도
const seoulLon = 126.9780; // 서울의 경도

// 위도/경도를 타일 X/Y 좌표로 변환하는 함수
function latLonToTileXY(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lon + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
}

// 타일 X/Y 좌표를 위도/경도로 변환하는 함수
function tileXYToLatLon(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lon_deg = x / n * 360.0 - 180.0;
    const lat_rad = Math.atan(sinh(Math.PI * (1 - 2 * y / n)));
    const lat_deg = lat_rad * 180.0 / Math.PI;
    return { lat: lat_deg, lon: lon_deg };
}

// 하이퍼볼릭 사인 함수
function sinh(x) {
    return (Math.exp(x) - Math.exp(-x)) / 2;
}

// 타일 X/Y 좌표를 3D 위치로 변환하는 함수
function tileXYTo3DPosition(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const scale = tileSize * n;
    const xPos = (x * tileSize) - (scale / 2);
    const yPos = -(y * tileSize) + (scale / 2);
    return { x: xPos, y: yPos };
}

// 타일의 위도/경도와 3D 좌표를 매핑
function getTileCorners(lat, lon, zoom) {
    const { x, y } = latLonToTileXY(lat, lon, zoom);
    const corners = [
        tileXYTo3DPosition(x, y, zoom),
        tileXYTo3DPosition(x + 1, y, zoom),
        tileXYTo3DPosition(x, y + 1, zoom),
        tileXYTo3DPosition(x + 1, y + 1, zoom)
    ];
    return corners;
}

// 선형 보간법을 사용하여 3D 좌표를 계산하는 함수
function interpolate(lat, lon, zoom) {
    const { x, y } = latLonToTileXY(lat, lon, zoom);
    const corners = getTileCorners(lat, lon, zoom);

    const cornersLatLon = [
        tileXYToLatLon(x, y, zoom),
        tileXYToLatLon(x + 1, y, zoom),
        tileXYToLatLon(x, y + 1, zoom),
        tileXYToLatLon(x + 1, y + 1, zoom)
    ];

    const u = (lon - cornersLatLon[0].lon) / (cornersLatLon[1].lon - cornersLatLon[0].lon);
    const v = (lat - cornersLatLon[0].lat) / (cornersLatLon[2].lat - cornersLatLon[0].lat);

    const xPos = (1 - u) * ((1 - v) * corners[0].x + v * corners[2].x) + u * ((1 - v) * corners[1].x + v * corners[3].x);
    const yPos = (1 - u) * ((1 - v) * corners[0].y + v * corners[2].y) + u * ((1 - v) * corners[1].y + v * corners[3].y);

    return { x: xPos, y: yPos };
}

// 타일을 로드하고 3D 위치에 배치하는 함수
function loadTile(x, y, zoom) {
    const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = '';
    textureLoader.load(url, function(texture) {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const tile = new THREE.Mesh(geometry, material);

        // 타일의 3D 위치 설정
        const { x: xPos, y: yPos } = tileXYTo3DPosition(x, y, zoom);
        tile.position.set(xPos, yPos, 0);
        scene.add(tile);

        // console.log(`Loaded tile ${x}, ${y} at position (${xPos}, ${yPos})`);
    });
}

// 지도 타일 로드 함수
function loadMapTiles() {
    const centerTile = latLonToTileXY(seoulLat, seoulLon, zoomLevel);
    const range = 10; // 중심에서 로드할 타일 범위 (5x5 그리드)

    for (let i = -range; i <= range; i++) {
        for (let j = -range; j <= range; j++) {
            loadTile(centerTile.x + i, centerTile.y + j, zoomLevel);
        }
    }
}



function createMarkerForLocation(lat, lon, height, color) {
    const position = interpolate(lat, lon, zoomLevel);
    if (position) {
        const radiusTop = 3; // Top radius of the hexagonal pillar
        const radiusBottom = 3; // Bottom radius of the hexagonal pillar
        const radialSegments = 6; // Number of segments around the circumference (6 for hexagon)
        
        const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
        const material = new THREE.MeshBasicMaterial({ color: color }); // Red color
        const marker = new THREE.Mesh(geometry, material);
        
        // Adjust the marker position
        marker.position.set(position.x - 64, position.y + 64, height / 2); // Place it correctly on the tile
        
        // Rotate the marker so that it stands upright (optional, depends on scene orientation)
        marker.rotation.x = Math.PI / 2;
        
        scene.add(marker);
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }); // Black color, thin line
        const outline = new THREE.LineSegments(edgesGeometry, edgesMaterial);

        // Align the outline with the marker
        outline.position.copy(marker.position);
        outline.rotation.copy(marker.rotation);

        // Add the outline to the scene
        scene.add(outline);
        // console.log(`Marker created at lat: ${lat}, lon: ${lon} with interpolated 3D position (${position.x}, ${position.y})`);
    } else {
        console.log(`No 3D position found for lat: ${lat}, lon: ${lon}`);
    }
}

// 서울의 3D 좌표 생성
createMarkerForLocation(37.5665, 126.9780, 1, 0xFF0000); // 서울
createMarkerForLocation(35.1796, 129.0756, 1, 0x00FF00); // 부산
createMarkerForLocation(37.4563, 126.7052, 1, 0x0000FF); // 인천
createMarkerForLocation(35.1595, 126.8526, 1, 0xFFFF00); // 광주
createMarkerForLocation(37.7519, 128.8761, 1, 0x00FFFF); // 강릉

// 카메라 위치 및 방향 조정
camera.position.set(7000, 1920-400, 1200);
camera.lookAt(new THREE.Vector3(8000, 1920-200, 0)); // 타일들의 중점을 바라보도록 설정

// 타일과 마커 로드
loadMapTiles();


const typhoonPath = [
    { lat: 26.9, lon: 148.5 },
    { lat: 27.2, lon: 147.0 },
    { lat: 27.3, lon: 145.2 },
    { lat: 27.4, lon: 143.3 },
    { lat: 27.3, lon: 141.2 },
    { lat: 27.1, lon: 139.3 },
    { lat: 26.8, lon: 137.3 },
    { lat: 26.8, lon: 135.4 },
    { lat: 26.5, lon: 133.6 },
    { lat: 26.3, lon: 131.9 },
    { lat: 25.9, lon: 130.3 },
    { lat: 25.4, lon: 129.0 },
    { lat: 24.7, lon: 127.7 },
    { lat: 23.7, lon: 126.4 },
    { lat: 22.5, lon: 125.7 },
    { lat: 21.8, lon: 125.5 },
    { lat: 21.3, lon: 125.5 },
    { lat: 21.3, lon: 125.5 },
    { lat: 21.5, lon: 125.4 },
    { lat: 21.9, lon: 125.1 },
    { lat: 22.2, lon: 124.8 },
    { lat: 22.5, lon: 124.7 },
    { lat: 23.0, lon: 124.6 },
    { lat: 23.6, lon: 124.6 },
    { lat: 24.3, lon: 124.8 },
    { lat: 25.1, lon: 124.6 },
    { lat: 26.0, lon: 124.5 },
    { lat: 27.0, lon: 124.8 },
    { lat: 27.7, lon: 124.6 },
    { lat: 28.6, lon: 124.7 },
    { lat: 29.2, lon: 124.8 },
    { lat: 29.8, lon: 124.9 },
    { lat: 30.2, lon: 125.1 },
    { lat: 31.0, lon: 125.6 },
    { lat: 31.7, lon: 126.1 },
    { lat: 32.4, lon: 126.6 },
    { lat: 33.3, lon: 127.3 },
    { lat: 34.2, lon: 128.0 },
    { lat: 35.2, lon: 129.2 },
    { lat: 36.5, lon: 130.5 },
    { lat: 37.8, lon: 131.6 },
    { lat: 39.3, lon: 133.0 },
    { lat: 42.0, lon: 135.7 },
    { lat: 44.4, lon: 136.7 }
];
const cameraOffset = new THREE.Vector3(0, -200, 400); // Offset from the typhoon marker for the camera position

let typhoonIndex = 0; // Start at the first position
let typhoonMarker; // The typhoon marker to move
const moveDuration = 1.0; // Duration to move from one point to the next (in seconds)
const clock = new THREE.Clock(); // Clock to track time

let currentLatLon = typhoonPath[typhoonIndex];
let targetLatLon = typhoonPath[typhoonIndex + 1];
let elapsedTime = 0; // Elapsed time for the current movement

// Function to create the typhoon marker
function createTyphoonMarker(lat, lon) {
    const radius = 10; // Radius of the typhoon sphere
    const position = interpolate(lat, lon, zoomLevel);

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.9, transparent: true }); // Purple color for the typhoon
    const typhoon = new THREE.Mesh(geometry, material);

    typhoon.position.set(position.x - 64, position.y + 64, radius); // Adjust position to align with tiles
    scene.add(typhoon);

    return typhoon;
}

// Function to update the typhoon marker's position smoothly
function updateTyphoonPosition(delta) {
    // Increment the elapsed time
    elapsedTime += delta;

    // Calculate the interpolation factor (0.0 to 1.0)
    const t = Math.min(elapsedTime / moveDuration, 1.0);

    // Calculate the new position based on linear interpolation
    const nextLat = THREE.MathUtils.lerp(currentLatLon.lat, targetLatLon.lat, t);
    const nextLon = THREE.MathUtils.lerp(currentLatLon.lon, targetLatLon.lon, t);

    const position = interpolate(nextLat, nextLon, zoomLevel);
    
    if (position) {
        typhoonMarker.position.set(position.x - 64, position.y + 64, 1);
        updateCameraPosition(typhoonMarker.position); // Update camera position to track typhoon

    }

    // Check if the typhoon has reached the target position
    if (t >= 1.0) {
        // Move to the next point in the path
        typhoonIndex++;
        if (typhoonIndex >= typhoonPath.length - 1) {
            typhoonIndex = 0; // Loop the path
        }
        currentLatLon = typhoonPath[typhoonIndex];
        targetLatLon = typhoonPath[typhoonIndex + 1];
        elapsedTime = 0; // Reset elapsed time for the next segment
    }
}

function updateCameraPosition(targetPosition) {
    // Set the camera's position relative to the typhoon
    const newCameraPosition = targetPosition.clone().add(cameraOffset);
    camera.position.lerp(newCameraPosition, 0.1); // Smooth camera movement

    // Make the camera look at the typhoon marker
    camera.lookAt(targetPosition);
}

// Initialize the typhoon marker
typhoonMarker = createTyphoonMarker(typhoonPath[0].lat, typhoonPath[0].lon);


// camera.position.set((typhoonMarker.position.x + cameraOffset.x, typhoonMarker.position.y + cameraOffset.y, 0 + cameraOffset.z))

// Animation loop with smooth typhoon movement
let etime = 0
function animate() {
    const delta = clock.getDelta(); // Time elapsed since last frame
    etime += delta
    updateTyphoonPosition(delta); // Update typhoon position smoothly
        renderer.render(scene, camera);
}



// Start the animation loop
renderer.setAnimationLoop(animate);

// 화면 크기 변경 대응
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
