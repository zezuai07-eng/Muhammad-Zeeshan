'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell, Building2, Layers, LocateFixed, Map as MapIcon, Menu,
  Plus, Route, Settings2, X, Search, ChevronDown, MapPin, Eye, EyeOff, Navigation
} from 'lucide-react'

import ldaPlotsData from './lda_city_master_data.json'

const blockCenters: Record<string, [number, number]> = {
    "A": [31.352132, 74.362814], "B": [31.353217, 74.358192],
    "C": [31.356620, 74.350085], "D": [31.352171, 74.352635],
    "E": [31.350739, 74.347030], "F": [31.346356, 74.347227],
    "G": [31.352894, 74.339169], "H": [31.348816, 74.340582],
    "J": [31.343847, 74.340622], "K": [31.351247, 74.331169],
    "L": [31.347331, 74.331611], "M": [31.356118, 74.320860],
    "N": [31.353739, 74.321622], "P": [31.354056, 74.316752],
    "Q": [31.346040, 74.321607], "CC": [31.366696, 74.334295],
    "BB": [31.379001, 74.338767], "AA": [31.382708, 74.329663],
    "Eastern CBD": [31.355868, 74.362690], "Main CBD": [31.353081, 74.326358],
};
const LAT_OFFSET = 0.015178;
const LNG_OFFSET = -0.073888;

// Bearing / Direction Calculate Karne ka Formula (Arrow ke liye)
function getBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const startLatRad = toRad(startLat); const startLngRad = toRad(startLng);
  const destLatRad = toRad(destLat); const destLngRad = toRad(destLng);
  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) - Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}

// --- SHARED NAVBAR ---
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="bg-[#bd8b2e] text-white p-1.5 rounded-lg"><Building2 size={20} /></span>
      <span>
        <strong className="block text-[15px] leading-none tracking-tight text-[#132b4f]">KASHpal</strong>
        <small className="mt-1 block text-[8px] font-semibold uppercase tracking-[.18em] text-[#b68a2c]">Enterprises & Builders</small>
      </span>
    </Link>
  )
}

function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const links = [
    { label: 'Buy', href: '/properties' }, { label: 'Sell', href: '/dashboard?role=seller' },
    { label: 'Projects', href: '/properties?type=projects' }, { label: 'Maps', href: '/map' },
    { label: 'Verification', href: '/verify' }, { label: 'Portals', href: '/dashboard' }
  ]

  return (
    <>
      <div className="bg-[#0b1b36] text-white/80 py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-[11px] font-medium tracking-wide">
          <span>Trusted property solutions across Lahore</span>
          <div className="flex items-center gap-6">
            <span>Contact us: +92 300 111 2222</span>
            <span className="hidden sm:block cursor-pointer hover:text-white transition-colors">Login / Register</span>
          </div>
        </div>
      </div>
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 flex h-[64px] items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 lg:flex">
            {links.map((link) => (
              <Link key={link.label} href={link.href} className={`text-[13px] font-bold transition-colors ${pathname === link.href ? 'text-[#bd8b2e]' : 'text-slate-600 hover:text-[#bd8b2e]'}`}>{link.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600 hidden sm:block"><Bell size={18}/></button>
            <button className="text-slate-600 lg:hidden" onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button>
          </div>
        </div>
      </header>
    </>
  )
}

export default function MapPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // UI States
  const [cleanView, setCleanView] = useState(false); // Eye Button State
  const [mapStyle, setMapStyle] = useState('satellite');
  const [mapOpacity, setMapOpacity] = useState(85);

  const [selectedBlock, setSelectedBlock] = useState("");
  const [searchPlot, setSearchPlot] = useState("");
  const [blockInput, setBlockInput] = useState("");
  const [isBlockDropdownOpen, setIsBlockDropdownOpen] = useState(false);
  const blockDropdownRef = useRef<HTMLDivElement>(null);
  
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [layerGroup, setLayerGroup] = useState<any>(null);
  
  // Location & Tracking
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [targetPlotLocation, setTargetPlotLocation] = useState<[number, number] | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false); // Live GPS State
  const routeLineRef = useRef<any>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    mode: string;
  } | null>(null);



  // Custom Search Location
  const [customLocationText, setCustomLocationText] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const blocks = useMemo(() => {
    const validBlocks = (ldaPlotsData as any[]).filter((p: any) => p.block && p.block !== "Unknown Block").map((p: any) => p.block);
    return Array.from(new Set(validBlocks)).sort();
  }, []);

  // Controlled search: only compute matching results when the user is actively typing
  const filteredBlocks = useMemo(() => {
    const query = blockInput.trim().toLowerCase().replace(/^block\s*/i, '');
    if (!query) return [];
    return blocks.filter((b) => {
      const cleanB = String(b).toLowerCase().replace(/^block\s*/i, '');
      return cleanB.includes(query) || String(b).toLowerCase().includes(query);
    });
  }, [blocks, blockInput]);

  const exactSelectedBlock = useMemo(() => {
    const query = blockInput.trim().toLowerCase().replace(/^block\s*/i, '');
    if (!query) return "";
    const found = blocks.find((b) => {
      const cleanB = String(b).toLowerCase().replace(/^block\s*/i, '');
      return cleanB === query || String(b).toLowerCase() === blockInput.trim().toLowerCase();
    });
    return (found as string) || "";
  }, [blocks, blockInput]);

  // Close block dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (blockDropdownRef.current && !blockDropdownRef.current.contains(e.target as Node)) {
        setIsBlockDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBlockDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => { setIsMounted(true); }, []);

  // Handle Clean View Resize
  useEffect(() => {
    if (mapInstance) { setTimeout(() => { mapInstance.invalidateSize(); }, 300); }
  }, [cleanView, mapInstance]);

  // Leaflet Initialization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link'); link.id = 'leaflet-css'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script'); script.id = 'leaflet-js'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = () => setMapLoaded(true); document.body.appendChild(script);
    } else { setMapLoaded(true); }
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapLoaded || !L) return;
    const container = L.DomUtil.get('kashpal-properties-map'); 
    if (container != null) { container._leaflet_id = null; container.innerHTML = ""; }

    const map = L.map('kashpal-properties-map', { zoomControl: false, maxZoom: 19 }).setView([31.3568, 74.3489], 14);
    
    // Zoom control top-right par
    L.control.zoom({ position: 'topright' }).addTo(map);

    map.createPane('topMarkerPane');
    map.getPane('topMarkerPane').style.zIndex = '1000';

    setMapInstance(map);
    const group = L.layerGroup().addTo(map);
    setLayerGroup(group);

    return () => { map.remove(); };
  }, [mapLoaded]);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapInstance || !L) return;
    mapInstance.eachLayer((layer: any) => { if (!layerGroup || !layerGroup.hasLayer(layer)) { mapInstance.removeLayer(layer); } });

    if (mapStyle === 'satellite') { L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 22, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(mapInstance); } 
    else { L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance); }

    // Transparent proxy URL to bypass browser CORS restrictions and SSL certificate validation
    const proxyTileUrl = '/emap-tiles/storage/tiles/lahore/lda_city/{z}/{x}/{y}.png';
    const directTileUrl = 'https://emap.pk/storage/tiles/lahore/lda_city/{z}/{x}/{y}.png';

    const emapLayer = L.tileLayer(proxyTileUrl, {
      opacity: mapOpacity / 100,
      minZoom: 10,
      maxZoom: 21,
      tms: false,
      zIndex: 10,
      crossOrigin: false, // Prevents CORS preflight block on raw tile imagery
    });

    // Automatic Fallback Handler for potential network, CORS, or SSL validation errors
    emapLayer.on('tileerror', (error: any) => {
      if (error && error.tile && error.tile.src) {
        const currentSrc = error.tile.src;
        if (currentSrc.includes('/emap-tiles/')) {
          // If local proxy route is unreachable in standalone environment, switch to direct emap.pk URL
          error.tile.src = currentSrc.replace(/.*\/emap-tiles\//, 'https://emap.pk/');
        } else if (currentSrc.includes('https://emap.pk/')) {
          // If direct URL was blocked by CORS or SSL, route through transparent proxy
          error.tile.src = currentSrc.replace('https://emap.pk/', '/emap-tiles/');
        }
      }
    });

    emapLayer.addTo(mapInstance);
  }, [mapStyle, mapOpacity, mapInstance, layerGroup]);

  // LIVE GPS TRACKING LOGIC
  useEffect(() => {
    let watchId: number;
    if (isLiveTracking && typeof navigator !== 'undefined') {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserLocation([lat, lon]);
        },
        (err) => { console.error(err); alert("Live location access denied or lost signal."); setIsLiveTracking(false); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isLiveTracking]);



  // Handle Road-Based Route Calculation & Drawing (OSRM Car with Bike Fallback)
  const handleDrawRoute = useCallback(
    async (startOverride?: [number, number], targetOverride?: [number, number]) => {
      const start = startOverride || userLocation;
      const target = targetOverride || targetPlotLocation;

      if (!start || !target || !mapInstance) {
        alert("Live Location on karein ya search karein aur Plot select karein.");
        return;
      }

      const L = (window as any).L;
      if (!L) return;

      setIsCalculatingRoute(true);

      const [startLat, startLng] = start;
      const [endLat, endLng] = target;

      let routeCoordinates: [number, number][] | null = null;
      let distanceKm = '';
      let durationMin = 0;
      let modeText = '';

      // 1. Primary Priority: OSRM Car Route (driving)
      try {
        const carUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        const res = await fetch(carUrl);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const bestRoute = data.routes.reduce((best: any, curr: any) =>
            (!best || curr.distance < best.distance) ? curr : best, null);

          routeCoordinates = bestRoute.geometry.coordinates.map(
            (pt: [number, number]) => [pt[1], pt[0]] as [number, number]
          );
          distanceKm = (bestRoute.distance / 1000).toFixed(1);
          durationMin = Math.max(1, Math.round(bestRoute.duration / 60));
          modeText = '🚗 Car Route (Driving)';
        }
      } catch (err) {
        console.warn('OSRM Car route fetch error:', err);
      }

      // 2. Fallback Priority: Bicycle Route if Car Path is Unavailable
      if (!routeCoordinates) {
        try {
          const bikeUrl = `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
          const res = await fetch(bikeUrl);
          const data = await res.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            routeCoordinates = route.geometry.coordinates.map(
              (pt: [number, number]) => [pt[1], pt[0]] as [number, number]
            );
            distanceKm = (route.distance / 1000).toFixed(1);
            durationMin = Math.max(1, Math.round(route.duration / 60));
            modeText = '🚲 Bicycle Route';
          }
        } catch (err) {
          console.warn('OSRM Bicycle fallback route fetch error:', err);
        }
      }

      // 3. Fallback: Straight-line fallback if offline or network fails
      if (!routeCoordinates) {
        routeCoordinates = [start, target];
        const rad = (x: number) => (x * Math.PI) / 180;
        const R = 6371; // km
        const dLat = rad(endLat - startLat);
        const dLon = rad(endLng - startLng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(rad(startLat)) * Math.cos(rad(endLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = (R * c).toFixed(1);
        distanceKm = dist;
        durationMin = Math.max(2, Math.round(Number(dist) * 2));
        modeText = 'Direct Path (Offline)';
      }

      setIsCalculatingRoute(false);

      // Remove any previous route layer
      if (routeLineRef.current) {
        if (layerGroup && layerGroup.hasLayer(routeLineRef.current)) {
          layerGroup.removeLayer(routeLineRef.current);
        } else if (mapInstance.hasLayer(routeLineRef.current)) {
          mapInstance.removeLayer(routeLineRef.current);
        }
        routeLineRef.current = null;
      }

      // Setup dynamic SVG gradient for the road route
      const setupRouteGradient = (startPt: [number, number], endPt: [number, number]) => {
        if (!mapInstance) return;
        const overlayPane = mapInstance.getPanes()?.overlayPane;
        if (!overlayPane) return;
        const svg = overlayPane.querySelector('svg');
        if (!svg) return;

        let defs = svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svg.insertBefore(defs, svg.firstChild);
        }

        let grad = svg.querySelector('#routeGradient') as SVGLinearGradientElement | null;
        if (!grad) {
          grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
          grad.setAttribute('id', 'routeGradient');
          defs.appendChild(grad);
        }

        const p1 = mapInstance.latLngToLayerPoint(startPt);
        const p2 = mapInstance.latLngToLayerPoint(endPt);
        grad.setAttribute('gradientUnits', 'userSpaceOnUse');
        grad.setAttribute('x1', String(p1.x));
        grad.setAttribute('y1', String(p1.y));
        grad.setAttribute('x2', String(p2.x));
        grad.setAttribute('y2', String(p2.y));

        grad.innerHTML = `
          <stop offset="0%" stop-color="#06b6d4" />
          <stop offset="35%" stop-color="#3b82f6" />
          <stop offset="70%" stop-color="#d946ef" />
          <stop offset="100%" stop-color="#ef4444" />
        `;
      };

      setupRouteGradient(routeCoordinates[0], routeCoordinates[routeCoordinates.length - 1]);

      // 1. Ambient soft gradient glow halo along actual roads
      const haloLine = L.polyline(routeCoordinates, {
        className: 'leaflet-polyline route-gradient-halo',
        color: '#0284c7',
        weight: 10,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // 2. High-visibility road line pulsing towards target
      const pulseLine = L.polyline(routeCoordinates, {
        className: 'leaflet-polyline route-gradient-pulse',
        color: 'url(#routeGradient)',
        weight: 5.5,
        dashArray: '10, 12',
        lineCap: 'round',
        lineJoin: 'round',
      });

      const routeGroup = L.featureGroup([haloLine, pulseLine]);
      if (layerGroup) {
        routeGroup.addTo(layerGroup);
      } else {
        routeGroup.addTo(mapInstance);
      }
      routeLineRef.current = routeGroup;

      // Fit map bounds to encompass the complete road route
      mapInstance.fitBounds(routeGroup.getBounds(), { padding: [60, 60] });

      setRouteInfo({
        distance: `${distanceKm} km`,
        duration: `${durationMin} mins`,
        mode: modeText,
      });
    },
    [userLocation, targetPlotLocation, mapInstance, layerGroup]
  );

  // Handle Plot Drawing & Markers
  useEffect(() => {
    const L = (window as any).L;
    if (!mapInstance || !layerGroup || !L) return;
    
    layerGroup.clearLayers();
    if (routeLineRef.current) routeLineRef.current = null;
    setRouteInfo(null);

    let targetCenter: [number, number] | null = null;
    let plotsToDisplay = ldaPlotsData as any[];
    if (exactSelectedBlock) { plotsToDisplay = plotsToDisplay.filter(p => p.block === exactSelectedBlock); }

    plotsToDisplay.forEach(plot => {
      if(!plot.coordinates || plot.coordinates.length < 2) return;
      const lat = plot.coordinates[1] + LAT_OFFSET; const lng = plot.coordinates[0] + LNG_OFFSET;
      const offset = plot.area && plot.area.includes('Kanal') ? 0.00015 : 0.00008; 
      const plotBounds = [ [lat + offset, lng - offset], [lat + offset, lng + offset], [lat - offset, lng + offset], [lat - offset, lng - offset] ];
      const isSearchedPlot = searchPlot && String(plot.plot_number).trim() === String(searchPlot).trim();

      if (isSearchedPlot) { targetCenter = [lat, lng]; setTargetPlotLocation(targetCenter); }

      const polygon = L.polygon(plotBounds, { color: '#132b4f', fillColor: isSearchedPlot ? '#ef4444' : '#bd8b2e', fillOpacity: isSearchedPlot ? 0.6 : 0.4, weight: isSearchedPlot ? 2 : 1 }).addTo(layerGroup);
      polygon.bindPopup(`<div style="text-align:center; font-family:sans-serif;"><h4 style="margin:0; color:#132b4f; font-weight:bold; font-size:13px;">${plot.society}</h4><p style="margin:2px 0; font-size:11px; color:#555;">Block ${plot.block}</p><div style="background:#f5f7fa; padding:4px; border-radius:4px; margin-top:4px; border:1px solid #ddd;"><span style="color:#bd8b2e; font-weight:bold; font-size:12px;">Plot: ${plot.plot_number}</span><br/><span style="font-size:10px; font-weight:bold;">${plot.area}</span></div></div>`);
      polygon.on('mouseover', (e: any) => { e.target.setStyle({ fillOpacity: 0.9, color: '#132b4f' }); });
      polygon.on('mouseout', (e: any) => { e.target.setStyle({ fillOpacity: isSearchedPlot ? 0.6 : 0.4, color: '#132b4f' }); });
    });

    // Draw Plot Custom Marker
    if (targetCenter) {
        mapInstance.flyTo(targetCenter, 18, { animate: true, duration: 1.5 });
        const blinkIcon = L.divIcon({
            className: 'custom-png-marker',
            html: `<div style="animation: bounce-blink 1.2s infinite; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 2000;">
                    <div style="background: rgba(11, 27, 54, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: white; padding: 5px 12px; border-radius: 8px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 8px 20px rgba(0,0,0,0.6); margin-bottom: 12px; z-index: 2000; border: 1.5px solid #bd8b2e;">
                      <span style="color: #93c5fd; font-size: 10px; font-weight: 800;">BLOCK ${exactSelectedBlock}</span> • <span style="color: #fde047; font-size: 11px; font-weight: 900;">PLOT #${searchPlot}</span>
                    </div>
                    <img src="/locationmark.png" style="width: 35px; height: 35px; object-fit: contain; filter: drop-shadow(0px 6px 4px rgba(0,0,0,0.5)); z-index: 2000;" alt="Pin" onerror="this.style.display='none'"/>
                  </div>
                  <style>@keyframes bounce-blink { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(-8px); opacity: 0.95; } }</style>`,
            iconSize: [160, 85], iconAnchor: [80, 85]
        });
        L.marker(targetCenter, { icon: blinkIcon, pane: 'topMarkerPane' }).addTo(layerGroup);
    } else if (exactSelectedBlock && !searchPlot) {
        setTargetPlotLocation(null);
        const center = blockCenters[exactSelectedBlock.toUpperCase()];
        if (center) { mapInstance.flyTo(center, 16, { animate: true, duration: 1.5 }); }
    }

    // Draw User Location Marker (With Directional Arrow if target is set)
    if (userLocation) {
        let arrowHtml = "";
        if (targetCenter) {
            const bearing = getBearing(userLocation[0], userLocation[1], targetCenter[0], targetCenter[1]);
            arrowHtml = `<div style="position: absolute; width: 50px; height: 50px; transform: rotate(${bearing}deg); display: flex; justify-content: center; top: -10px;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="1.5" style="width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                                <path d="M12 2L22 22L12 18L2 22L12 2Z"></path>
                            </svg>
                         </div>`;
        }

        const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `<div style="position: relative; display: flex; justify-content: center; align-items: center; z-index: 1000;">
                      <div style="position: absolute; background-color: rgba(59, 130, 246, 0.3); width: 40px; height: 40px; border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                      ${arrowHtml}
                      <div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.6); z-index: 10;"></div>
                   </div>
                   <style>@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }</style>`,
            iconSize: [50, 50], iconAnchor: [25, 25]
        });
        L.marker(userLocation, { icon: userIcon, pane: 'topMarkerPane' }).addTo(layerGroup).bindPopup("<b>Your Location</b>");
    }

    // Draw Road-Based Route Polyline (Car Route via OSRM with Bike Fallback)
    if (userLocation && targetCenter && routeLineRef.current === null) {
      handleDrawRoute(userLocation, targetCenter);
    }

  }, [exactSelectedBlock, searchPlot, mapInstance, layerGroup, userLocation, handleDrawRoute]);

  // LIVE LOCATION AUTOCOMPLETE API
  const fetchLocations = async (query: string) => {
    if (!query.trim() || query.length < 3) { setLocationSuggestions([]); return; }
    setIsSearchingLocation(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=pk&q=${encodeURIComponent(query + ', Lahore')}`);
      const data = await response.json();
      setLocationSuggestions(data.slice(0, 4));
    } catch (error) { console.error(error); } finally { setIsSearchingLocation(false); }
  };

  const handleLocationInputChange = (e: any) => {
    const val = e.target.value;
    setCustomLocationText(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { fetchLocations(val); }, 500);
  };

  const selectLocationSuggestion = (place: any) => {
    const lat = parseFloat(place.lat); const lon = parseFloat(place.lon);
    setCustomLocationText(place.display_name.split(',')[0]);
    setUserLocation([lat, lon]);
    setLocationSuggestions([]);
    if (mapInstance) { mapInstance.flyTo([lat, lon], 14, { animate: true, duration: 1.5 }); }
  };

  const toggleLiveLocation = () => {
    if (isLiveTracking) {
        setIsLiveTracking(false);
    } else {
        if (!mapInstance) return;
        setIsLiveTracking(true);
        mapInstance.locate({ setView: true, maxZoom: 17, enableHighAccuracy: true });
        mapInstance.on('locationerror', () => { alert("Live GPS Access Denied. Check laptop/browser settings."); setIsLiveTracking(false); });
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#bd8b2e] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#132b4f] font-bold animate-pulse text-sm">Loading Engineering Map...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen bg-slate-50 font-sans ${cleanView ? 'h-screen overflow-hidden' : ''}`}>
      {!cleanView && <Navbar />}
      
      <main className={`flex-1 flex flex-col ${cleanView ? 'absolute inset-0 z-50 bg-slate-200' : 'h-[calc(100vh-100px)]'}`}>
        
        {/* COMPACT UI SECTION (Hides on Clean View) */}
        {!cleanView && (
            <div className="bg-white shadow-sm border-b border-slate-200 z-10 relative">
                <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl font-extrabold text-[#132b4f] leading-none">Master Map</h1>
                      <p className="text-[#bd8b2e] text-[10px] font-bold tracking-widest uppercase mt-0.5">Geo Intelligence Portal</p>
                    </div>
                    
                    {/* Compact Location Search Header mein move kar diya */}
                    <div className="flex-1 w-full md:max-w-md relative">
                        <div className="flex bg-slate-50 border border-slate-200 rounded-md overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
                            <Search className="w-4 h-4 text-slate-400 ml-3 mt-2.5" />
                            <input type="text" placeholder="Search Start Location..." value={customLocationText} onChange={handleLocationInputChange} className="w-full p-2 bg-transparent text-[#132b4f] text-xs font-semibold outline-none"/>
                        </div>
                        {locationSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-[1000] overflow-hidden">
                                {locationSuggestions.map((place, idx) => (
                                    <div key={idx} onClick={() => selectLocationSuggestion(place)} className="p-2 text-xs text-slate-600 hover:bg-blue-50 cursor-pointer border-b border-slate-100 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-blue-500 shrink-0"/> <span className="truncate">{place.display_name.split(',')[0]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* SINGLE ROW PLOT SEARCH */}
                <div className="max-w-screen-2xl mx-auto px-4 pb-3 pt-1">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <input disabled value="LDA City" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-md text-slate-400 text-xs font-semibold cursor-not-allowed"/>
                        </div>
                        
                        <div ref={blockDropdownRef} className="flex-1 relative">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type Block e.g. C, J, A1"
                                    value={blockInput}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setBlockInput(val);
                                        setSearchPlot("");
                                        // Controlled search: only show dropdown if user has typed something
                                        setIsBlockDropdownOpen(val.trim().length > 0);
                                    }}
                                    onFocus={() => {
                                        // Only show dropdown if text has already been typed
                                        if (blockInput.trim().length > 0) {
                                            setIsBlockDropdownOpen(true);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Ensures dropdown closes properly when focus is lost
                                        if (blockDropdownRef.current && blockDropdownRef.current.contains(e.relatedTarget as Node)) {
                                            return;
                                        }
                                        setIsBlockDropdownOpen(false);
                                    }}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-md text-[#132b4f] text-xs font-semibold focus:border-[#bd8b2e] outline-none pr-8"
                                />
                                {blockInput.trim().length > 0 ? (
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setBlockInput("");
                                            setSelectedBlock("");
                                            setIsBlockDropdownOpen(false);
                                            setSearchPlot("");
                                        }}
                                        className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        title="Clear block search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <span className="absolute right-2.5 top-2.5 text-slate-300 pointer-events-none">
                                        <ChevronDown className="w-4 h-4" />
                                    </span>
                                )}
                            </div>

                            {/* Dropdown only shows results upon typing */}
                            {isBlockDropdownOpen && blockInput.trim().length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-[1000] max-h-48 overflow-y-auto">
                                    {filteredBlocks.length > 0 ? (
                                        filteredBlocks.map((b) => (
                                            <div
                                                key={b as string}
                                                onMouseDown={(e) => {
                                                    // Prevents premature blur, ensures selection executes cleanly
                                                    e.preventDefault();
                                                    setBlockInput(b as string);
                                                    setSelectedBlock(b as string);
                                                    setIsBlockDropdownOpen(false);
                                                    setSearchPlot("");
                                                }}
                                                onClick={() => {
                                                    setBlockInput(b as string);
                                                    setSelectedBlock(b as string);
                                                    setIsBlockDropdownOpen(false);
                                                    setSearchPlot("");
                                                }}
                                                className="p-2 text-xs text-slate-700 hover:bg-[#f9f5ec] cursor-pointer font-semibold border-b border-slate-50 flex items-center justify-between transition-colors"
                                            >
                                                <span>Block {b as string}</span>
                                                <span className="text-[10px] text-amber-600 font-medium">Select</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2.5 text-xs text-slate-400 italic text-center">
                                            No blocks matching "{blockInput}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <input type="text" placeholder="Plot No." value={searchPlot} onChange={(e) => setSearchPlot(e.target.value)} disabled={!exactSelectedBlock} className="w-full p-2 bg-white border border-slate-200 rounded-md text-[#132b4f] text-xs font-semibold focus:border-[#bd8b2e] outline-none disabled:bg-slate-50"/>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MAP & FLOATING CONTROLS */}
        <div className="flex-1 relative bg-slate-200 w-full h-full flex flex-col">
            
            {/* 📍 LEFT FLOATING CONTROLS (Map ke upar) */}
            <div className="absolute top-4 left-4 z-[500] flex flex-col gap-3">
                
                {/* Main Action Buttons Row */}
                <div className="flex items-center gap-2">
                    {/* BARA LIVE NAVIGATION BUTTON */}
                    <button onClick={toggleLiveLocation} className={`${isLiveTracking ? 'bg-blue-600 text-white animate-pulse' : 'bg-white text-slate-700'} p-3 rounded-xl shadow-lg border border-slate-200 hover:bg-blue-500 hover:text-white transition-all`} title="Live GPS Tracking">
                        <Navigation className="w-6 h-6" />
                    </button>
                    
                    {/* DRAW ROUTE BUTTON */}
                    <button onClick={() => handleDrawRoute()} disabled={isCalculatingRoute} className="bg-[#bd8b2e] text-white p-3.5 rounded-xl font-bold hover:bg-[#a67926] disabled:opacity-70 transition-all shadow-lg flex items-center gap-2 text-sm" title="Draw Road Route to Plot">
                        <Route className={`w-5 h-5 ${isCalculatingRoute ? 'animate-spin' : ''}`} /> 
                    </button>

                    {/* PLUS BUTTON */}
                    <button className="bg-[#132b4f] text-white p-3.5 rounded-xl font-bold hover:bg-[#0c1c36] transition shadow-lg" title="Upload Pin">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Map Style & Layers Row */}
                <div className="flex items-center gap-2">
                    {/* Street / Satellite Toggle */}
                    <div className="bg-white/90 backdrop-blur rounded-lg shadow-md p-1.5 flex w-fit border border-slate-200">
                        <button onClick={() => setMapStyle('street')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${mapStyle === 'street' ? 'bg-[#132b4f] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Street</button>
                        <button onClick={() => setMapStyle('satellite')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${mapStyle === 'satellite' ? 'bg-[#132b4f] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Satellite</button>
                    </div>


                </div>
            </div>

            {/* 📍 RIGHT FLOATING CONTROLS (Under Zoom) */}
            <div className="absolute top-[90px] right-3 z-[500] flex flex-col gap-3 items-center">
                
                {/* 👁️ EYE BUTTON (SCREENSHOT MODE) */}
                <button onClick={() => setCleanView(!cleanView)} className={`p-2.5 rounded-lg shadow-md border border-slate-200 transition-all ${cleanView ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-700 hover:bg-slate-100'}`} title="Toggle Clean View">
                    {cleanView ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>

                {/* 🎚️ VERTICAL OPACITY SLIDER */}
                <div className="bg-white/90 backdrop-blur rounded-lg shadow-md py-4 px-2 flex flex-col items-center gap-3 border border-slate-200 h-[140px]">
                    <span className="text-[10px] font-bold text-[#bd8b2e]">{mapOpacity}%</span>
                    {/* Vertical CSS hack */}
                    <input type="range" min="0" max="100" value={mapOpacity} onChange={(e) => setMapOpacity(parseInt(e.target.value))} className="w-1.5 h-20 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#bd8b2e]" style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' }} title="Map Opacity"/>
                </div>
            </div>

            {/* FLOATING ROUTE INFORMATION BADGE */}
            {routeInfo && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-[#132b4f]/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-[#bd8b2e] backdrop-blur-md flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2.5">
                        <span className="text-base">{routeInfo.mode.includes('🚗') ? '🚗' : '🚲'}</span>
                        <div>
                            <div className="font-bold text-[#bd8b2e]">{routeInfo.mode}</div>
                            <div className="text-[11px] text-slate-200 font-medium">{routeInfo.distance} • {routeInfo.duration}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (routeLineRef.current) {
                                if (layerGroup && layerGroup.hasLayer(routeLineRef.current)) {
                                    layerGroup.removeLayer(routeLineRef.current);
                                } else if (mapInstance && mapInstance.hasLayer(routeLineRef.current)) {
                                    mapInstance.removeLayer(routeLineRef.current);
                                }
                                routeLineRef.current = null;
                            }
                            setRouteInfo(null);
                        }}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                        title="Clear Route"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div id="kashpal-properties-map" className="flex-1 w-full h-full z-0"></div>
        </div>
      </main>
    </div>
  );
}