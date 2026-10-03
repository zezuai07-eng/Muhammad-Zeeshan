import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Navigation, 
  Search, 
  RotateCcw, 
  Sliders, 
  Layers, 
  PhoneCall, 
  Eye,
  EyeOff,
  Building2,
  PanelLeft,
  PanelLeftClose,
  X,
  Route,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers3,
  MapPin,
  Crosshair,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Bot,
  Wand2,
  Camera,
  Lock,
  Shield,
  FileText,
  Download,
  Maximize2,
  Minimize2,
  Move,
  GripVertical,
  Pencil,
  Square,
  Type,
  Undo2,
  Trash2
} from 'lucide-react';
import { PlotRecord } from '../types';
import { 
  formatPKR, 
  generateWhatsAppLink,
  isValidLatLng
} from '../utils/formatters';
import { calculateRouteBetweenCoordinates } from '../utils/routing';
import { DragonOverlay } from '../DragonOverlay';
import { playDragonRoar } from '../utils/audioSynthesis';
import { 
  loadMasterCadastralData, 
  findCadastralPlot, 
  getMasterBlocks, 
  getBearing,
  getDistanceMeters,
  OFFICE_COORDS,
  LDA_CITY_CENTER,
  BLOCK_METADATA,
  BLOCK_CENTERS,
  ResolvedCadastralPlot,
  JINNAH_SECTOR_BLOCKS,
  IQBAL_SECTOR_BLOCKS,
  OTHER_BLOCKS,
  getSectorForBlock,
  getCalibratedOffsets,
  setCalibratedOffsets,
  nudgeOffset,
  resetOffsetsToDefault,
  calculateGpsOffsetDifference,
  findNearestCadastralPlot,
  calibratePlotLocation,
  resetBlockCalibration,
  USER_CUSTOM_PLOTS,
  USER_BLOCK_OVERRIDES
} from '../utils/masterDataService';

interface MapPortalProps {
  plots: PlotRecord[];
  selectedPlot: PlotRecord | null;
  onSelectPlot: (plot: PlotRecord) => void;
  onOpenDetails: (plot: PlotRecord) => void;
  isDedicatedView?: boolean;
  onBackToInventory?: () => void;
}

type BaseLayerType = 'satellite' | 'street' | 'esri-dark';

export const MapPortal: React.FC<MapPortalProps> = ({
  plots,
  selectedPlot,
  onSelectPlot,
  onOpenDetails,
  isDedicatedView = false,
  onBackToInventory,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersRef = useRef<{ [key: string]: L.Polygon }>({});
  const emapTileLayerRef = useRef<L.TileLayer | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const routePolylineRef = useRef<L.Polyline | L.FeatureGroup | null>(null);
  const routeStartMarkerRef = useRef<L.Marker | null>(null);
  const routeEndMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const cadastralMarkerRef = useRef<L.Marker | null>(null);
  const cadastralPolygonRef = useRef<L.Polygon | null>(null);
  const cadastralCircleRef = useRef<L.Circle | null>(null);
  const cadastralRadarMarkerRef = useRef<L.Marker | null>(null);
  const cadastralLineRef = useRef<L.Polyline | null>(null);
  const cadastralCenterDotRef = useRef<L.Marker | null>(null);
  const dragonLandingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragonEnabledRef = useRef<boolean>(true);
  const blockHighlightPolygonRef = useRef<L.Polygon | null>(null);

  // Interactive Cursor Distance Tool Refs
  const measureLineRef = useRef<L.Polyline | null>(null);
  const measureCursorMarkerRef = useRef<L.Marker | null>(null);
  const measureLockedMarkerRef = useRef<L.Marker | null>(null);
  const measureRoadPolylineRef = useRef<L.Polyline | null>(null);
  const blockSelectRef = useRef<HTMLDivElement>(null);

  // SSR & Hydration Protection
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMounted(true);
    }
  }, []);

  // UI States
  const [cleanView, setCleanView] = useState(false);
  const [tileOpacity, setTileOpacity] = useState(0.85); // 0 to 1
  const [baseLayer, setBaseLayer] = useState<BaseLayerType>(isDedicatedView ? 'satellite' : 'street');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isTileLoading, setIsTileLoading] = useState(false);

  // Live Location & Tracking
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);

  // Interactive Cursor Route & Distance Tool State
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [measureState, setMeasureState] = useState<{
    lat: number;
    lng: number;
    distMeters: number;
    bearing: number;
    locked: boolean;
  } | null>(null);

  // Zameen Calibration & Nudge State
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibratedOffsets, setCalibratedOffsetsState] = useState(getCalibratedOffsets());
  const [calibrationTab, setCalibrationTab] = useState<'formula' | 'nudge'>('formula');
  const [isPinDropMode, setIsPinDropMode] = useState(false);
  const [gpsPointA, setGpsPointA] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsPointB, setGpsPointB] = useState<{ lat: number; lng: number } | null>(null);
  const calibrationMarkerRef = useRef<L.Marker | null>(null);

  // Search Bar States (Top of Map for Mobile & Desktop)
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [blockInput, setBlockInput] = useState('');
  const [isBlockDropdownOpen, setIsBlockDropdownOpen] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [searchPlot, setSearchPlot] = useState('');
  const [searchNotification, setSearchNotification] = useState<string | null>(null);
  const lastExecutedSearchRef = useRef<string>('');

  // Active Cadastral Plot
  const [activeCadastralPlot, setActiveCadastralPlot] = useState<ResolvedCadastralPlot | null>(null);
  const [targetPlotLocation, setTargetPlotLocation] = useState<[number, number] | null>(null);
  const [targetPlotInfo, setTargetPlotInfo] = useState<{
    plotNumber: string;
    block: string;
    area?: string;
    road?: string;
    society?: string;
  } | null>(null);

  // 3D Dragon Mascot & Guide Toggle State (Default ON: true on first open; toggleable from right toolbar)
  // User: "just jo ma eagle liiye chahta tha mana wo dragon ma convert krwa dia... just eagle ko badal kr dragon ma convert kr do"
  const [isDragonEnabled, setIsDragonEnabled] = useState<boolean>(true);
  const [isDragonMuted, setIsDragonMuted] = useState<boolean>(false);
  const [activePlotBadgeRect, setActivePlotBadgeRect] = useState<DOMRect | { left: number; top: number; right: number; width?: number; height?: number } | null>(null);

  useEffect(() => {
    isDragonEnabledRef.current = isDragonEnabled;
  }, [isDragonEnabled]);

  // Dragon Persistent Static Stance State
  const [isDragonPersistentStatic, setIsDragonPersistentStatic] = useState<boolean>(false);
  const isDragonPersistentStaticRef = useRef<boolean>(false);

  useEffect(() => {
    isDragonPersistentStaticRef.current = isDragonPersistentStatic;
  }, [isDragonPersistentStatic]);

  // Exact Plot Pinpoint Self-Calibration Mode (learning offset calculation)
  const [isPlotCalibrationMode, setIsPlotCalibrationMode] = useState(false);

  // User Map Markup / Annotation Editor States (Arrows, Boxes, Text Labels, Freehand)
  type EditorToolType = 'arrow' | 'box' | 'text' | 'draw' | null;
  interface UserAnnotation {
    id: string;
    type: 'arrow' | 'box' | 'text' | 'draw';
    color: string;
    coordinates: [number, number][];
    text?: string;
  }
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEditorTool, setActiveEditorTool] = useState<EditorToolType>('arrow');
  const [editorColor, setEditorColor] = useState<string>('#EF4444');
  const [annotations, setAnnotations] = useState<UserAnnotation[]>([]);
  const [textInputModal, setTextInputModal] = useState<{
    coords: [number, number];
    text: string;
  } | null>(null);
  const annotationsLayerGroupRef = useRef<L.FeatureGroup | null>(null);

  // Admin Access Protection for Exact Plot GPS Calibration & Pin Adjustment
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingCalibrationAction, setPendingCalibrationAction] = useState<'pin' | 'modal'>('modal');

  const handleRequestAdjustPin = useCallback(() => {
    if (isAdminUnlocked) {
      setIsPlotCalibrationMode((prev) => !prev);
    } else {
      setPendingCalibrationAction('pin');
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordModal(true);
    }
  }, [isAdminUnlocked]);

  const handleRequestCalibrationModal = useCallback(() => {
    if (isAdminUnlocked) {
      setShowCalibrationModal((prev) => !prev);
    } else {
      setPendingCalibrationAction('modal');
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordModal(true);
    }
  }, [isAdminUnlocked]);

  const handleVerifyAdminPassword = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'Zero786786@2@') {
      setIsAdminUnlocked(true);
      setShowPasswordModal(false);
      setPasswordError('');
      if (pendingCalibrationAction === 'pin') {
        setIsPlotCalibrationMode(true);
        setSearchNotification('🔓 Admin Verified: Plot Pin Adjustment Mode Active');
      } else {
        setShowCalibrationModal(true);
        setSearchNotification('🔓 Admin Verified: Exact Plot GPS Calibration Unlocked');
      }
    } else {
      setPasswordError('Ghalat Password! Sirf authorized admin ko access hai.');
    }
  }, [passwordInput, pendingCalibrationAction]);

  // Dynamic Free-Moving Screen Arrow State (Perimeter floating pointer)
  const [screenArrowPos, setScreenArrowPos] = useState<{
    x: number;
    y: number;
    angleDeg: number;
    distMeters: number;
    plotNumber: string;
    block: string;
    isOffScreen: boolean;
  } | null>(null);

  // Dynamic Off-Screen & Distance Direction Arrow HUD State
  const [offScreenInfo, setOffScreenInfo] = useState<{
    isOffScreenOrDistant: boolean;
    distanceMeters: number;
    bearing: number;
    plotNumber: string;
    block: string;
  } | null>(null);

  // Close block dropdown & autocomplete on outside click, touch, or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (blockSelectRef.current && !blockSelectRef.current.contains(e.target as Node)) {
        setIsBlockDropdownOpen(false);
        setIsAutocompleteOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBlockDropdownOpen(false);
        setIsAutocompleteOpen(false);
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

  // Active Route Details
  const [activeRouteInfo, setActiveRouteInfo] = useState<{
    originLabel: string;
    destLabel: string;
    distanceKm: number;
    durationMinutes: number;
    bearing: number;
  } | null>(null);

  // Plot Directory Sidebar Drawer State
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarBlock, setSidebarBlock] = useState('All');
  const [sidebarStatus, setSidebarStatus] = useState<'All' | 'Available' | 'Reserved' | 'Sold'>('All');

  // Master Blocks
  const [masterBlocks, setMasterBlocks] = useState<string[]>([]);

  // Map Container Sizing: Default to 100% full screen ONLY in dedicated view
  const [isFullScreenMap, setIsFullScreenMap] = useState(isDedicatedView);

  useEffect(() => {
    setIsFullScreenMap(isDedicatedView);
  }, [isDedicatedView]);

  // Recalibrate Leaflet map viewport dimensions smoothly whenever fullscreen mode toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullScreenMap]);

  // Free-Form Draggable Plot Info Dialog State
  // User: "or jis per block or oplot number likha hua uska adjustment button hoana chiaye usko utha kr uper niche kia jaa skta ho haaam use rka thourbh bhi. taake koi aagy aagy piche kr ka bhi number kocce krwana chaha to krwa ska. usma aik free form action button usi dialoge ka uper nhona chiey taake koi bhi isko freeli move kr ska smooth animateion ka sath."
  const [plotCardPosition, setPlotCardPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [plotCardPlacement, setPlotCardPlacement] = useState<'bottom' | 'top'>('bottom');
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const plotCardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // References for global Leaflet marker DivIcon interaction
  const handleStepPlotRef = useRef<((dir: 'next' | 'prev') => void) | null>(null);
  const handleDismissPlotBadgeRef = useRef<(() => void) | null>(null);
  const handleBadgeNudgeRef = useRef<((dLat: number, dLng: number) => void) | null>(null);

  // Mount global handlers so button clicks inside Leaflet DivIcon HTML execute seamlessly
  useEffect(() => {
    (window as any).__leafletStepPlot = (dir: 'next' | 'prev') => {
      handleStepPlotRef.current?.(dir);
    };
    (window as any).__leafletClosePlotBadge = () => {
      handleDismissPlotBadgeRef.current?.();
    };
    (window as any).__leafletNudge = (dLat: number, dLng: number) => {
      handleBadgeNudgeRef.current?.(dLat, dLng);
    };
    return () => {
      delete (window as any).__leafletStepPlot;
      delete (window as any).__leafletClosePlotBadge;
      delete (window as any).__leafletNudge;
    };
  }, []);

  // Load Master Cadastral Data on Mount
  useEffect(() => {
    if (!isMounted) return;
    loadMasterCadastralData().then(() => {
      const blocksFromData = getMasterBlocks();
      if (blocksFromData && blocksFromData.length > 0) {
        setMasterBlocks(blocksFromData);
      }
    });
  }, [isMounted]);

  // Combined Blocks
  const allBlocks = useMemo(() => {
    const set = new Set<string>();
    masterBlocks.forEach((b) => set.add(b));
    plots.forEach((p) => set.add(p.block));
    Object.keys(BLOCK_METADATA).forEach((b) => set.add(b));
    const list = Array.from(set).sort((a, b) => {
      if (a.length === 1 && b.length === 1) return a.localeCompare(b);
      if (a.length === 1) return -1;
      if (b.length === 1) return 1;
      return a.localeCompare(b);
    });
    return ['All', ...list];
  }, [masterBlocks, plots]);

  // Jinnah Sector Blocks
  const jinnahBlocks = useMemo(() => {
    return allBlocks.filter((b) => b !== 'All' && getSectorForBlock(b) === 'Jinnah Sector');
  }, [allBlocks]);

  // Iqbal Sector Blocks
  const iqbalBlocks = useMemo(() => {
    return allBlocks.filter((b) => b !== 'All' && getSectorForBlock(b) === 'Iqbal Sector');
  }, [allBlocks]);


  // Autocomplete matching blocks (only active when user is typing)
  const autocompleteBlocks = useMemo(() => {
    const q = blockInput.trim().toLowerCase();
    if (!q) return [];
    return allBlocks.filter((b) => {
      if (b === 'All') return false;
      const sec = getSectorForBlock(b).toLowerCase();
      return b.toLowerCase().includes(q) || `block ${b}`.toLowerCase().includes(q) || sec.includes(q);
    });
  }, [allBlocks, blockInput]);

  // Filtered plots for Sidebar
  const filteredSidebarPlots = useMemo(() => {
    return plots.filter((p) => {
      const matchesBlock = sidebarBlock === 'All' || p.block === sidebarBlock;
      const matchesStatus = sidebarStatus === 'All' || p.status === sidebarStatus;
      const q = sidebarSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.plotNumber.toLowerCase().includes(q) ||
        p.block.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q);
      return matchesBlock && matchesStatus && matchesSearch;
    });
  }, [plots, sidebarBlock, sidebarStatus, sidebarSearch]);

  // Safe map transition
  const safeFlyTo = useCallback(
    (target: [number, number], zoom = 18) => {
      const map = mapInstanceRef.current;
      if (!map || !isValidLatLng(target)) return;
      map.invalidateSize();
      try {
        map.flyTo(target, zoom, {
          animate: true,
          duration: 1.2,
          easeLinearity: 0.25,
        });
      } catch {
        map.setView(target, zoom);
      }
    },
    []
  );

  // Safe fly to Block Bounds
  const flyToBlock = useCallback(
    (blockName: string) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const norm = blockName.replace(/^BLOCK\s+/i, '').trim().toUpperCase();
      const meta = BLOCK_METADATA[norm] || BLOCK_METADATA[blockName];

      if (meta) {
        if (blockHighlightPolygonRef.current) {
          map.removeLayer(blockHighlightPolygonRef.current);
        }

        // Draw temporary highlight boundary for the block
        const poly = L.polygon(
          [
            [meta.bounds[0][0], meta.bounds[0][1]],
            [meta.bounds[0][0], meta.bounds[1][1]],
            [meta.bounds[1][0], meta.bounds[1][1]],
            [meta.bounds[1][0], meta.bounds[0][1]],
          ],
          {
            color: '#D4AF37',
            fillColor: '#D4AF37',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6, 6',
          }
        ).addTo(map);

        blockHighlightPolygonRef.current = poly;

        // Auto remove highlight after 8 seconds
        setTimeout(() => {
          if (blockHighlightPolygonRef.current && map) {
            map.removeLayer(blockHighlightPolygonRef.current);
            blockHighlightPolygonRef.current = null;
          }
        }, 8000);

        map.fitBounds(meta.bounds, { padding: [50, 50], maxZoom: 16 });
        setSearchNotification(`Viewing Block ${norm} (${meta.count} cadastral plots)`);
      } else if (BLOCK_CENTERS[norm]) {
        safeFlyTo(BLOCK_CENTERS[norm], 16);
        setSearchNotification(`Centered on Block ${norm}`);
      } else {
        safeFlyTo(LDA_CITY_CENTER, 14);
      }
    },
    [safeFlyTo]
  );

  // Clear In-Map Route
  const handleClearRoute = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map) {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (routeStartMarkerRef.current) {
        map.removeLayer(routeStartMarkerRef.current);
        routeStartMarkerRef.current = null;
      }
      if (routeEndMarkerRef.current) {
        map.removeLayer(routeEndMarkerRef.current);
        routeEndMarkerRef.current = null;
      }
      if (measureLockedMarkerRef.current) {
        map.removeLayer(measureLockedMarkerRef.current);
        measureLockedMarkerRef.current = null;
      }
      if (measureRoadPolylineRef.current) {
        map.removeLayer(measureRoadPolylineRef.current);
        measureRoadPolylineRef.current = null;
      }
      if (measureLineRef.current) {
        map.removeLayer(measureLineRef.current);
        measureLineRef.current = null;
      }
      if (measureCursorMarkerRef.current) {
        map.removeLayer(measureCursorMarkerRef.current);
        measureCursorMarkerRef.current = null;
      }
      map.getContainer().style.cursor = '';
    }
    setActiveRouteInfo(null);
    setMeasureState(null);
    setIsMeasureMode(false);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

    // Default center at LDA City Center [31.3568, 74.3489] with Zoom 14
    const map = L.map(mapContainerRef.current, {
      center: LDA_CITY_CENTER,
      zoom: 14,
      minZoom: 10,
      maxZoom: 21,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Base Layer: Google Satellite Hybrid (if dedicated map view) or OpenStreetMap Street (if embedded on main page)
    const initialUrl = isDedicatedView
      ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const initialSubdomains = isDedicatedView ? ['mt0', 'mt1', 'mt2', 'mt3'] : ['a', 'b', 'c'];
    const initialMaxZoom = isDedicatedView ? 22 : 19;

    const initialBaseLayer = L.tileLayer(initialUrl, {
      subdomains: initialSubdomains,
      maxZoom: initialMaxZoom,
      zIndex: 1,
    }).addTo(map);
    initialBaseLayer.bringToBack();
    baseTileLayerRef.current = initialBaseLayer;

    // LDA City Master Cadastral Tile Layer:
    // Uses the proxy endpoint to bypass any browser CORS or referrer restrictions,
    // with NO crossOrigin attribute so normal img tags render seamlessly!
    const tileUrl = '/emap-tiles/storage/tiles/lahore/lda_city/{z}/{x}/{y}.png';
    const emapLayer = L.tileLayer(tileUrl, {
      minZoom: 10,
      maxZoom: 21,
      opacity: tileOpacity,
      tms: false,
      zIndex: 10,
      crossOrigin: false,
    });

    // Fallback if proxy or direct URL encounters network, CORS, or SSL validation issue
    emapLayer.on('tileerror', (error: any) => {
      if (error && error.tile && error.tile.src) {
        if (error.tile.src.includes('/emap-tiles/')) {
          error.tile.src = error.tile.src.replace(
            /.*\/emap-tiles\//,
            'https://emap.pk/'
          );
        } else if (error.tile.src.includes('https://emap.pk/')) {
          error.tile.src = error.tile.src.replace(
            'https://emap.pk/',
            '/emap-tiles/'
          );
        }
      }
    });

    emapLayer.on('loading', () => setIsTileLoading(true));
    emapLayer.on('load', () => setIsTileLoading(false));
    emapLayer.addTo(map);
    emapTileLayerRef.current = emapLayer;

    // FeatureGroup for user markup annotations (arrows, boxes, text labels, freehand drawings)
    const annotationsGroup = L.featureGroup().addTo(map);
    annotationsLayerGroupRef.current = annotationsGroup;

    // Kashpal Head Office Marker at Lat 31.38150, Lng 74.35199
    const officeIcon = L.divIcon({
      className: 'custom-office-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-[#D4AF37]/40 animate-ping"></div>
          <div class="w-8 h-8 rounded-full bg-[#132b4f] text-[#D4AF37] font-bold text-xs flex items-center justify-center border-2 border-[#D4AF37] shadow-xl">
            🏢
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const officeMarker = L.marker(OFFICE_COORDS, { icon: officeIcon, zIndexOffset: 2500 }).addTo(map);
    officeMarker.bindPopup(`
      <div class="p-2 text-slate-900 font-sans text-xs">
        <strong class="text-[#132b4f] text-sm block">Kashpal Enterprises & Builders</strong>
        <p class="text-slate-600 text-[11px] mt-0.5">Head Office • 180 Ft Main Boulevard, LDA City</p>
        <p class="text-[10px] text-[#D4AF37] font-bold mt-1">Lat: 31.38150, Lng: 74.35199</p>
      </div>
    `);

    // Handle container resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isMounted]);

  // Update Opacity in Real-Time
  useEffect(() => {
    if (emapTileLayerRef.current) {
      emapTileLayerRef.current.setOpacity(tileOpacity);
    }
  }, [tileOpacity]);

  // Switch Base Layer (Satellite / Street / Dark)
  const handleSwitchBaseLayer = (layerType: BaseLayerType) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setBaseLayer(layerType);

    // 1. Safely remove previous base layer
    if (baseTileLayerRef.current) {
      try {
        if (map.hasLayer(baseTileLayerRef.current)) {
          map.removeLayer(baseTileLayerRef.current);
        }
      } catch (err) {
        console.warn('Error removing old base layer:', err);
      }
      baseTileLayerRef.current = null;
    }

    let newUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    let subdomains: string | string[] = ['mt0', 'mt1', 'mt2', 'mt3'];
    let maxZoom = 22;

    if (layerType === 'satellite') {
      newUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
      maxZoom = 22;
    } else if (layerType === 'street') {
      newUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      subdomains = ['a', 'b', 'c'];
      maxZoom = 19;
    } else if (layerType === 'esri-dark') {
      newUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      subdomains = ['a', 'b', 'c', 'd'];
      maxZoom = 20;
    }

    // 2. Add new base layer at bottom zIndex
    const newLayer = L.tileLayer(newUrl, {
      maxZoom,
      subdomains,
      zIndex: 1,
    }).addTo(map);

    // CRITICAL: Bring base layer to back so it does NOT obscure cadastral emap tiles
    newLayer.bringToBack();
    baseTileLayerRef.current = newLayer;

    // 3. Keep cadastral overlay on top with proper opacity
    if (emapTileLayerRef.current && map.hasLayer(emapTileLayerRef.current)) {
      emapTileLayerRef.current.setZIndex(10);
      emapTileLayerRef.current.bringToFront();
      emapTileLayerRef.current.setOpacity(tileOpacity);
    }

    setShowLayerMenu(false);
    setSearchNotification(`Map View: Switched to ${layerType === 'satellite' ? 'Satellite View' : layerType === 'street' ? 'Street View' : 'Dark Mode'}`);
  };

  // Dedicated handler to exit map view and turn OFF satellite mode
  const handleExitMap = () => {
    try {
      if (baseLayer === 'satellite') {
        handleSwitchBaseLayer('street');
      }
    } catch {
      // ignore
    }
    if (isFullScreenMap && !isDedicatedView) {
      setIsFullScreenMap(false);
    }
    if (onBackToInventory) {
      onBackToInventory();
    }
  };

  // Register global window trigger for Dragon Roar sound on user interaction
  useEffect(() => {
    (window as unknown as { triggerDragonCall?: () => void }).triggerDragonCall = () => {
      playDragonRoar(0.8);
    };
    return () => {
      delete (window as unknown as { triggerDragonCall?: () => void }).triggerDragonCall;
    };
  }, []);

  // Dedicated helper to render the requested Transparent 3-Plot Circle, Long Line to Outer Badge, Majestic Flying Eagle, and Details Badge
  const displaySearchedPlotHighlight = useCallback(
    (
      coords: [number, number],
      plotNumber: string,
      block: string,
      area?: string,
      road?: string,
      bounds?: [number, number][],
      society = 'LDA City Lahore',
      shouldFly = true,
      forceDirectPerch = false
    ) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const isStaticStance = isDragonPersistentStaticRef.current || forceDirectPerch;

      // 1. Audio trigger when Dragon lands on the plot rectangle
      if (dragonLandingTimerRef.current) {
        clearTimeout(dragonLandingTimerRef.current);
        dragonLandingTimerRef.current = null;
      }
      if (isDragonEnabledRef.current) {
        if (!isStaticStance) {
          dragonLandingTimerRef.current = setTimeout(() => {
            try {
              playDragonRoar(0.85);
            } catch (err) {
              console.warn('Dragon touchdown sound warning:', err);
            }
            isDragonPersistentStaticRef.current = true;
            setIsDragonPersistentStatic(true);
          }, 2400);
        } else {
          try {
            playDragonRoar(0.4);
          } catch {
            // ignore
          }
        }
      }

      // 2. Remove previous circle, radar wave, marker, polygon, line, center pin
      if (cadastralCircleRef.current) {
        map.removeLayer(cadastralCircleRef.current);
        cadastralCircleRef.current = null;
      }
      if (cadastralRadarMarkerRef.current) {
        map.removeLayer(cadastralRadarMarkerRef.current);
        cadastralRadarMarkerRef.current = null;
      }
      if (cadastralMarkerRef.current) {
        map.removeLayer(cadastralMarkerRef.current);
        cadastralMarkerRef.current = null;
      }
      if (cadastralPolygonRef.current) {
        map.removeLayer(cadastralPolygonRef.current);
        cadastralPolygonRef.current = null;
      }
      if (cadastralLineRef.current) {
        map.removeLayer(cadastralLineRef.current);
        cadastralLineRef.current = null;
      }
      if (cadastralCenterDotRef.current) {
        map.removeLayer(cadastralCenterDotRef.current);
        cadastralCenterDotRef.current = null;
      }

      // 3. User: "or circle ki opecity thorda low kro. taake plots niche or wazeh nazar aayn."
      // Radius: ~38 meters (~3 plots radius).
      // Reduced opacity (0.28) & thin weight (1.5px) so all cadastral plot boundaries, plot numbers, and street lines underneath are 100% crisp and visible!
      const radiusMeters = 38;
      const circle = L.circle(coords, {
        radius: radiusMeters,
        color: '#F59E0B',
        weight: 1.5,
        opacity: 0.28,
        dashArray: '5, 5',
        fill: false,
        fillOpacity: 0,
        className: 'dhansu-animated-leaflet-circle',
      }).addTo(map);
      cadastralCircleRef.current = circle;

      // Exact Plot Center Target Point (Subtle, transparent, minimal)
      const centerDotHtml = `
        <div style="position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div style="width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid rgba(245, 158, 11, 0.6); background: rgba(245, 158, 11, 0.15); box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);"></div>
          <div style="position: absolute; width: 3.5px; height: 3.5px; border-radius: 50%; background: #FDE047;"></div>
        </div>
      `;
      const centerDotIcon = L.divIcon({
        className: 'cadastral-exact-center-target',
        html: centerDotHtml,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const centerMarker = L.marker(coords, { icon: centerDotIcon, interactive: false, zIndexOffset: 2400 }).addTo(map);
      cadastralCenterDotRef.current = centerMarker;

      // Ultra-light transparent concentric sonar wave rings
      const radarHtml = `
        <div style="position: relative; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0.22;">
          <div class="dhansu-sonar-ring-1" style="position: absolute; width: 72px; height: 72px; border-radius: 50%; border: 1px solid #F59E0B; box-shadow: 0 0 8px rgba(245, 158, 11, 0.25); background: transparent;"></div>
          <div class="dhansu-sonar-ring-2" style="position: absolute; width: 72px; height: 72px; border-radius: 50%; border: 1px solid #FDE047; box-shadow: 0 0 10px rgba(253, 224, 71, 0.25); background: transparent;"></div>
        </div>
      `;
      const radarIcon = L.divIcon({
        className: 'dhansu-sonar-radar-icon',
        html: radarHtml,
        iconSize: [72, 72],
        iconAnchor: [36, 36],
      });
      const radarMarker = L.marker(coords, { icon: radarIcon, interactive: false, zIndexOffset: 2300 }).addTo(map);
      cadastralRadarMarkerRef.current = radarMarker;

      // 4. Subtle pointer line from plot coordinate center to circle's top boundary
      const outerDistance = radiusMeters;
      const deltaLat = outerDistance / 111139;
      const outerCoords: [number, number] = [coords[0] + deltaLat, coords[1]];

      const pointerLine = L.polyline([coords, outerCoords], {
        color: '#F59E0B',
        weight: 1.5,
        opacity: 0.4,
        dashArray: '4, 4',
        lineCap: 'round',
      }).addTo(map);
      cadastralLineRef.current = pointerLine;

      const cleanBlock = (block || '').trim().toUpperCase();
      const cleanPlotNum = (plotNumber || '').trim();
      const cleanSize = (area || '').trim();

      // 5. User: "or jo info dialogue ha usy simple bnaou itna heavy na rakho."
      // Clean, elegant, lightweight Plot Details Dialog attached at the circle's top edge
      const hasDragon = isDragonEnabledRef.current;
      const badgeHtml = `
        <div style="position: relative; width: 220px; height: 72px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; pointer-events: auto; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; user-select: none;">
          ${hasDragon ? `
            <!-- 3D Dragon Perch Landing Bar & Trigger -->
            <div style="width: 100%; height: 20px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; margin-bottom: 2px;">
              <span style="font-size: 13px; filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.9)); cursor: pointer;" onclick="window.__triggerDragonFireRoar && window.__triggerDragonFireRoar()" title="Dragon Perch - Click to unleash roar & fire!">🐉</span>
              <span style="font-size: 8.5px; font-weight: 800; color: #F59E0B; letter-spacing: 0.6px; text-transform: uppercase;">3D Dragon Guide</span>
              <span style="font-size: 12px; cursor: pointer; filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.8));" onclick="window.__triggerDragonFireRoar && window.__triggerDragonFireRoar()" title="Click to breathe fire!">🔥</span>
            </div>
          ` : ''}

          <!-- Simple, Lightweight & Sleek Details Card (Not heavy, minimal & elegant) -->
          <div style="background: rgba(11, 23, 44, 0.92); border: 1px solid rgba(245, 158, 11, 0.6); border-radius: 6px; padding: 3px 8px; color: white; box-shadow: 0 4px 14px rgba(0,0,0,0.7), 0 0 10px rgba(245, 158, 11, 0.25); backdrop-filter: blur(8px); text-align: center; white-space: nowrap; position: relative; z-index: 10; display: flex; align-items: center; gap: 5px; cursor: move;" title="Click & Drag with mouse or touch to move dialog anywhere">
            <!-- Block & Plot Number (Crisp & Simple) -->
            <span style="color: #F59E0B; font-size: 11px; font-weight: 800; letter-spacing: 0.3px;">${cleanBlock} BLOCK</span>
            <span style="color: #94A3B8; font-size: 9px;">•</span>
            <span style="color: #FDE047; font-family: monospace; font-size: 12.5px; font-weight: 900;">#${cleanPlotNum}</span>
            ${cleanSize ? `<span style="color: #38BDF8; font-weight: 700; font-size: 10px;">(${cleanSize})</span>` : ''}

            <!-- Close 'X' Button on Right to Dismiss -->
            <button
              type="button"
              onclick="window.__leafletClosePlotBadge && window.__leafletClosePlotBadge(); event.stopPropagation();"
              title="Close details & view raw map clearly without filters"
              style="cursor: pointer; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(248, 113, 113, 0.4); color: #FCA5A5; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; line-height: 1; transition: all 0.15s ease; margin-left: 2px; flex-shrink: 0;"
            >
              ✕
            </button>
          </div>

          <!-- Downward pointer tip directly fixed and touching the circle's top boundary -->
          <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 4px solid #F59E0B; margin: 0 auto; z-index: 10;"></div>
        </div>
      `;

      const badgeIcon = L.divIcon({
        className: 'cadastral-plot-floating-badge',
        html: badgeHtml,
        iconSize: [220, 72],
        iconAnchor: [110, 72],
      });

      // Draggable marker so user can move it anywhere with mouse or touch!
      const badgeMarker = L.marker(outerCoords, {
        icon: badgeIcon,
        draggable: true,
        autoPan: false,
        zIndexOffset: 3000,
      }).addTo(map);
      cadastralMarkerRef.current = badgeMarker;

      // Update badge rect for 3D Dragon overlay
      const updateBadgeRect = () => {
        if (!mapInstanceRef.current || !mapContainerRef.current) return;
        const curLatLng = badgeMarker.getLatLng();
        const pt = mapInstanceRef.current.latLngToContainerPoint(curLatLng);
        const mapRect = mapContainerRef.current.getBoundingClientRect();
        const screenX = mapRect.left + pt.x;
        const screenY = mapRect.top + pt.y;
        setActivePlotBadgeRect({
          left: screenX - 110,
          top: screenY - 72,
          right: screenX + 110,
          width: 220,
          height: 72,
        });
      };
      updateBadgeRect();

      // When dragged, dynamically update pointer line and 3D dragon target!
      badgeMarker.on('drag', () => {
        isDragonPersistentStaticRef.current = true;
        updateBadgeRect();
        const curPos = badgeMarker.getLatLng();
        if (cadastralLineRef.current) {
          cadastralLineRef.current.setLatLngs([coords, [curPos.lat, curPos.lng]]);
        }
      });

      setScreenArrowPos(null);

      // 6. Update State
      setTargetPlotLocation(coords);
      setTargetPlotInfo({
        plotNumber: cleanPlotNum,
        block: cleanBlock,
        area: cleanSize,
        road: '', // User: abhi wo roads ka data na dikhay
        society,
      });

      // 7. Smooth animated fly-to at Zoom 18 only when explicitly requested (e.g. search)
      if (shouldFly) {
        safeFlyTo(coords, 18);
      }
    },
    [safeFlyTo]
  );

  // Interactive Live Cursor Route & Distance Measurement Handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isMeasureMode) {
      if (measureCursorMarkerRef.current) {
        map.removeLayer(measureCursorMarkerRef.current);
        measureCursorMarkerRef.current = null;
      }
      if (measureLineRef.current) {
        map.removeLayer(measureLineRef.current);
        measureLineRef.current = null;
      }
      map.getContainer().style.cursor = '';
      return;
    }

    // Entering measure mode: clear previous lock
    if (measureLockedMarkerRef.current) {
      map.removeLayer(measureLockedMarkerRef.current);
      measureLockedMarkerRef.current = null;
    }
    if (measureRoadPolylineRef.current) {
      map.removeLayer(measureRoadPolylineRef.current);
      measureRoadPolylineRef.current = null;
    }

    map.getContainer().style.cursor = 'crosshair';
    const origin = userLocation || OFFICE_COORDS;

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const destLat = e.latlng.lat;
      const destLng = e.latlng.lng;
      const dist = getDistanceMeters(origin[0], origin[1], destLat, destLng);
      const brng = getBearing(origin[0], origin[1], destLat, destLng);
      const distText = dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`;

      // 1. Dynamic polyline from origin to cursor
      if (!measureLineRef.current) {
        measureLineRef.current = L.polyline([origin, [destLat, destLng]], {
          color: '#06b6d4',
          weight: 3.5,
          dashArray: '6, 6',
          opacity: 0.95,
        }).addTo(map);
      } else {
        measureLineRef.current.setLatLngs([origin, [destLat, destLng]]);
      }

      // 2. Cursor tooltip marker attached to mouse
      const cursorHtml = `
        <div style="pointer-events: none; transform: translate(16px, -50%);">
          <div style="background: rgba(11, 27, 54, 0.96); border: 1.5px solid #06b6d4; border-radius: 10px; padding: 6px 11px; color: white; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.75); backdrop-filter: blur(8px); white-space: nowrap;">
            <div style="color: #67e8f9; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 5px;">
              <span>📏 Live Pointer:</span>
              <span style="color: #fde047; font-size: 14px; font-weight: 900;">${distText}</span>
            </div>
            <div style="color: #10b981; font-size: 10px; font-weight: 700; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
              <span>🔒</span>
              <span>Cadastral Site Vector Verified</span>
            </div>
            <div style="color: #38bdf8; font-size: 9px; font-weight: 700; margin-top: 2px;">
              Bearing: ${Math.round(brng)}° • Click to mark plot &amp; shortest route
            </div>
          </div>
        </div>
      `;

      const cursorIcon = L.divIcon({
        className: 'measure-cursor-tooltip',
        html: cursorHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (!measureCursorMarkerRef.current) {
        measureCursorMarkerRef.current = L.marker([destLat, destLng], {
          icon: cursorIcon,
          zIndexOffset: 4500,
        }).addTo(map);
      } else {
        measureCursorMarkerRef.current.setLatLng([destLat, destLng]);
        measureCursorMarkerRef.current.setIcon(cursorIcon);
      }

      setMeasureState({
        lat: destLat,
        lng: destLng,
        distMeters: dist,
        bearing: brng,
        locked: false,
      });
    };

    const handleClick = async (e: L.LeafletMouseEvent) => {
      const destLat = e.latlng.lat;
      const destLng = e.latlng.lng;
      const originPoint = userLocation || OFFICE_COORDS;

      // Stop tracking immediately and restore cursor
      setIsMeasureMode(false);
      map.getContainer().style.cursor = '';
      if (measureCursorMarkerRef.current) {
        map.removeLayer(measureCursorMarkerRef.current);
        measureCursorMarkerRef.current = null;
      }
      if (measureLineRef.current) {
        map.removeLayer(measureLineRef.current);
        measureLineRef.current = null;
      }

      // Compute shortest road route (Google Maps / OSRM on-ground)
      let roadCoords: [number, number][] = [originPoint, [destLat, destLng]];
      let distText = '';
      let driveTimeText = '';

      try {
        const routeRes = await calculateRouteBetweenCoordinates(
          originPoint,
          [destLat, destLng],
          'Current Location',
          `Plot Location (${destLat.toFixed(4)}, ${destLng.toFixed(4)})`
        );
        if (routeRes && routeRes.coordinates.length > 0) {
          roadCoords = routeRes.coordinates;
          distText = `${routeRes.distanceKm} km`;
          driveTimeText = `~${routeRes.durationMinutes} mins drive`;
        }
      } catch (err) {
        console.debug('Routing fallback:', err);
      }

      if (!distText) {
        const geodesicDist = getDistanceMeters(originPoint[0], originPoint[1], destLat, destLng);
        distText = geodesicDist >= 1000 ? `${(geodesicDist / 1000).toFixed(2)} km` : `${Math.round(geodesicDist)} m`;
      }

      // Draw road-conforming polyline
      if (measureRoadPolylineRef.current) {
        map.removeLayer(measureRoadPolylineRef.current);
      }
      measureRoadPolylineRef.current = L.polyline(roadCoords, {
        color: '#10b981',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(map);

      // Google Maps Direct Turn-by-Turn Navigation URL
      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originPoint[0]},${originPoint[1]}&destination=${destLat},${destLng}&travelmode=driving`;

      const lockHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; pointer-events: auto; font-family: sans-serif;">
          <div style="background: #0b1b36; border: 2px solid #10b981; border-radius: 12px; padding: 6px 12px; color: white; white-space: nowrap; box-shadow: 0 8px 25px rgba(0,0,0,0.65);">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px;">🏁</span>
              <span style="color: #6ee7b7; font-weight: 800; font-size: 12px;">Shortest Road: ${distText}</span>
              ${driveTimeText ? `<span style="background: rgba(16,185,129,0.25); color: #a7f3d0; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;">${driveTimeText}</span>` : ''}
            </div>
            <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px; justify-content: space-between;">
              <span style="color: #38bdf8; font-size: 9px; font-weight: 700;">📍 Verified Geo-Destination</span>
              <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" style="background: #10b981; color: #022c22; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 5px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;">
                Google Maps ↗
              </a>
            </div>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #10b981;"></div>
          <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; border: 2px solid #10b981; margin-top: -2px;"></div>
        </div>
      `;

      if (measureLockedMarkerRef.current) {
        map.removeLayer(measureLockedMarkerRef.current);
      }

      measureLockedMarkerRef.current = L.marker([destLat, destLng], {
        icon: L.divIcon({
          className: 'measure-locked-pin',
          html: lockHtml,
          iconSize: [210, 52],
          iconAnchor: [105, 52],
        }),
        zIndexOffset: 4600,
      }).addTo(map);

      setMeasureState({
        lat: destLat,
        lng: destLng,
        distMeters: parseFloat(distText) * 1000 || 0,
        bearing: getBearing(originPoint[0], originPoint[1], destLat, destLng),
        locked: true,
      });

      setSearchNotification(`Shortest Road Route: ${distText} ${driveTimeText ? `(${driveTimeText})` : ''} to Plot`);
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      map.getContainer().style.cursor = '';
    };
  }, [isMeasureMode, userLocation]);

  // Pin Drop Listener for Exact Calibration (Map Par Plot Ka Pin Drop)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!isPinDropMode) return;

    map.getContainer().style.cursor = 'crosshair';

    const handlePinDropClick = (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(7));
      const lng = Number(e.latlng.lng.toFixed(7));
      setGpsPointB({ lat, lng });
      setIsPinDropMode(false);
      map.getContainer().style.cursor = '';

      // Draw or update pin drop marker on map
      if (calibrationMarkerRef.current) {
        map.removeLayer(calibrationMarkerRef.current);
      }
      const pinIcon = L.divIcon({
        className: 'calibration-pin-marker',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
            <div style="background:#8b5cf6;border:2px solid #ffffff;color:#ffffff;font-size:10px;font-weight:900;padding:3px 8px;border-radius:9999px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.6);letter-spacing:0.5px;">
              🎯 MAP PIN B (Plot)
            </div>
            <div style="width:14px;height:14px;background:#8b5cf6;border:3px solid #ffffff;border-radius:50%;margin-top:-2px;box-shadow:0 0 12px #8b5cf6;"></div>
          </div>
        `,
        iconSize: [0, 0],
      });
      calibrationMarkerRef.current = L.marker([lat, lng], { icon: pinIcon, zIndexOffset: 4700 }).addTo(map);
      setSearchNotification('📍 Pin B recorded successfully on map');
    };

    map.on('click', handlePinDropClick);
    return () => {
      map.off('click', handlePinDropClick);
      map.getContainer().style.cursor = '';
    };
  }, [isPinDropMode]);

  // Interactive Cadastral Map Click Detection (Click-to-Highlight Plot with Circle & Badge)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isMeasureMode || isPinDropMode || isPlotCalibrationMode || (isEditorOpen && activeEditorTool)) {
      return;
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // Find nearest cadastral plot within 35 meters
      const nearest = findNearestCadastralPlot(e.latlng.lat, e.latlng.lng, 35);
      if (nearest) {
        displaySearchedPlotHighlight(
          nearest.latLng,
          nearest.plotNumber,
          nearest.block,
          nearest.area,
          '',
          nearest.bounds,
          nearest.society,
          false
        );
        setActiveCadastralPlot(nearest);
        setSearchPlot(nearest.plotNumber);
        setSelectedBlock(nearest.block);
        setBlockInput(nearest.block);
        setSearchNotification(`📍 Block ${nearest.block} • Plot #${nearest.plotNumber} (${nearest.area || 'Cadastral Plot'})`);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isMeasureMode, isPinDropMode, isPlotCalibrationMode, isEditorOpen, activeEditorTool, displaySearchedPlotHighlight]);

  // Clear Current Target Plot
  const handleClearTargetPlot = useCallback(() => {
    if (dragonLandingTimerRef.current) {
      clearTimeout(dragonLandingTimerRef.current);
      dragonLandingTimerRef.current = null;
    }
    const map = mapInstanceRef.current;
    if (map) {
      if (cadastralCircleRef.current) {
        map.removeLayer(cadastralCircleRef.current);
        cadastralCircleRef.current = null;
      }
      if (cadastralRadarMarkerRef.current) {
        map.removeLayer(cadastralRadarMarkerRef.current);
        cadastralRadarMarkerRef.current = null;
      }
      if (cadastralMarkerRef.current) {
        map.removeLayer(cadastralMarkerRef.current);
        cadastralMarkerRef.current = null;
      }
      if (cadastralPolygonRef.current) {
        map.removeLayer(cadastralPolygonRef.current);
        cadastralPolygonRef.current = null;
      }
      if (cadastralLineRef.current) {
        map.removeLayer(cadastralLineRef.current);
        cadastralLineRef.current = null;
      }
      if (cadastralCenterDotRef.current) {
        map.removeLayer(cadastralCenterDotRef.current);
        cadastralCenterDotRef.current = null;
      }
    }
    setActivePlotBadgeRect(null);
    setTargetPlotLocation(null);
    setTargetPlotInfo(null);
    setActiveCadastralPlot(null);
    setScreenArrowPos(null);
    handleClearRoute();
  }, [handleClearRoute]);

  // Dismiss/Hide the plot callout badge for a clean screenshot
  // CRITICAL: Does NOT move or reset the map! Map stays in exact same position and zoom level until new search or reset
  const handleDismissPlotBadge = useCallback(() => {
    if (dragonLandingTimerRef.current) {
      clearTimeout(dragonLandingTimerRef.current);
      dragonLandingTimerRef.current = null;
    }
    const map = mapInstanceRef.current;
    if (map) {
      if (cadastralMarkerRef.current) {
        map.removeLayer(cadastralMarkerRef.current);
        cadastralMarkerRef.current = null;
      }
      if (cadastralCircleRef.current) {
        map.removeLayer(cadastralCircleRef.current);
        cadastralCircleRef.current = null;
      }
      if (cadastralRadarMarkerRef.current) {
        map.removeLayer(cadastralRadarMarkerRef.current);
        cadastralRadarMarkerRef.current = null;
      }
      if (cadastralPolygonRef.current) {
        map.removeLayer(cadastralPolygonRef.current);
        cadastralPolygonRef.current = null;
      }
      if (cadastralLineRef.current) {
        map.removeLayer(cadastralLineRef.current);
        cadastralLineRef.current = null;
      }
      if (cadastralCenterDotRef.current) {
        map.removeLayer(cadastralCenterDotRef.current);
        cadastralCenterDotRef.current = null;
      }
    }
    setActivePlotBadgeRect(null);
    setTargetPlotLocation(null);
    setTargetPlotInfo(null);
    setActiveCadastralPlot(null);
    setScreenArrowPos(null);
    setSearchNotification('🗺️ Plot details closed. Clean map view without overlays!');
  }, []);

  // Micro Nudge Handler directly from the badge arrows to move plot marker forward/backward/left/right
  const handleBadgeNudge = useCallback((dLat: number, dLng: number) => {
    if (!targetPlotLocation || !targetPlotInfo) return;
    const newCoords: [number, number] = [targetPlotLocation[0] + dLat, targetPlotLocation[1] + dLng];
    displaySearchedPlotHighlight(
      newCoords,
      targetPlotInfo.plotNumber,
      targetPlotInfo.block,
      targetPlotInfo.area,
      '',
      undefined,
      targetPlotInfo.society,
      false
    );
  }, [targetPlotLocation, targetPlotInfo, displaySearchedPlotHighlight]);

  // 3D Dragon Mascot & Guide Toggle Handler (Default ON: true on first open; toggleable from right toolbar)
  // User: "just jo ma eagle liiye chahta tha mana wo dragon ma convert krwa dia... just eagle ko badal kr dragon ma convert kr do"
  const handleToggleDragonMascot = useCallback(() => {
    const nextState = !isDragonEnabled;
    setIsDragonEnabled(nextState);
    isDragonEnabledRef.current = nextState;

    if (!nextState) {
      if (dragonLandingTimerRef.current) {
        clearTimeout(dragonLandingTimerRef.current);
        dragonLandingTimerRef.current = null;
      }
      setSearchNotification('🐉 3D Dragon Guide: Disabled (Clean details badge)');
      if (targetPlotLocation && targetPlotInfo) {
        displaySearchedPlotHighlight(
          targetPlotLocation,
          targetPlotInfo.plotNumber,
          targetPlotInfo.block,
          targetPlotInfo.area,
          targetPlotInfo.road,
          undefined,
          targetPlotInfo.society,
          false
        );
      }
    } else {
      setSearchNotification('🐉 3D Dragon Guide: Enabled (Swooping Flight & Fire Breath)');
      if (targetPlotLocation && targetPlotInfo) {
        displaySearchedPlotHighlight(
          targetPlotLocation,
          targetPlotInfo.plotNumber,
          targetPlotInfo.block,
          targetPlotInfo.area,
          targetPlotInfo.road,
          undefined,
          targetPlotInfo.society,
          false
        );
      }
    }
  }, [isDragonEnabled, targetPlotLocation, targetPlotInfo, displaySearchedPlotHighlight]);

  // Dragon Stance Toggle: Persist static perched stance vs replaying flight sequence
  const handleToggleStaticDragon = useCallback(() => {
    const nextStatic = !isDragonPersistentStatic;
    setIsDragonPersistentStatic(nextStatic);
    isDragonPersistentStaticRef.current = nextStatic;
    setSearchNotification(nextStatic ? '🐉 Dragon Perched Stance: Move across map freely' : '🐉 Dragon Flight Animation: Active');
    if (targetPlotLocation && targetPlotInfo) {
      displaySearchedPlotHighlight(
        targetPlotLocation,
        targetPlotInfo.plotNumber,
        targetPlotInfo.block,
        targetPlotInfo.area,
        targetPlotInfo.road,
        undefined,
        targetPlotInfo.society,
        false,
        nextStatic
      );
    }
  }, [isDragonPersistentStatic, targetPlotLocation, targetPlotInfo, displaySearchedPlotHighlight]);

  // Replay Dragon Flight
  const replayDragonFlight = useCallback(() => {
    if (!targetPlotLocation || !targetPlotInfo) {
      setSearchNotification('Search or select a plot to see the 3D Dragon flight!');
      return;
    }
    isDragonPersistentStaticRef.current = false;
    setIsDragonPersistentStatic(false);
    displaySearchedPlotHighlight(
      targetPlotLocation,
      targetPlotInfo.plotNumber,
      targetPlotInfo.block,
      targetPlotInfo.area,
      targetPlotInfo.road,
      undefined,
      targetPlotInfo.society,
      false,
      false
    );
    setSearchNotification('🐉 Replaying 3D Dragon Flight Descent & Touchdown!');
  }, [targetPlotLocation, targetPlotInfo, displaySearchedPlotHighlight]);

  // Trigger Fire Roar manually
  const handleTriggerDragonRoar = useCallback(() => {
    const win = window as unknown as { __triggerDragonFireRoar?: () => void };
    if (win.__triggerDragonFireRoar) {
      win.__triggerDragonFireRoar();
    } else {
      playDragonRoar(0.9);
    }
    setSearchNotification('🔥 Dragon Roar & Flame Breath Unleashed!');
  }, []);

  // Keep refs synchronized for the global window listeners
  useEffect(() => {
    handleDismissPlotBadgeRef.current = handleDismissPlotBadge;
  }, [handleDismissPlotBadge]);

  useEffect(() => {
    handleBadgeNudgeRef.current = handleBadgeNudge;
  }, [handleBadgeNudge]);

  // Keep global window listeners updated for Dragon actions
  useEffect(() => {
    const win = window as unknown as {
      triggerDragonCall?: () => void;
      handleToggleDragonMascot?: () => void;
      replayDragonFlight?: () => void;
    };
    win.triggerDragonCall = () => {
      handleTriggerDragonRoar();
    };
    win.handleToggleDragonMascot = () => {
      handleToggleDragonMascot();
    };
    win.replayDragonFlight = () => {
      replayDragonFlight();
    };
    return () => {
      delete win.triggerDragonCall;
      delete win.handleToggleDragonMascot;
      delete win.replayDragonFlight;
    };
  }, [handleTriggerDragonRoar, handleToggleDragonMascot, replayDragonFlight]);

  // Map Markup & Annotation Editor Handlers
  const handleSaveTextAnnotation = useCallback(() => {
    if (!textInputModal || !textInputModal.text.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'text',
        color: editorColor,
        coordinates: [textInputModal.coords],
        text: textInputModal.text.trim(),
      },
    ]);
    setTextInputModal(null);
    setSearchNotification('✏️ Text note pinned to map!');
  }, [textInputModal, editorColor]);

  // Leaflet map drawing and interaction effect for active editor tools (Optimized for Mobile Touch & PC)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isEditorOpen || !activeEditorTool) return;

    const container = map.getContainer();
    container.style.cursor = 'crosshair';
    container.style.touchAction = 'none';

    // Temporarily disable map panning & touch zoom while an editor tool is active
    map.dragging.disable();
    map.touchZoom.disable();

    let isDrawing = false;
    let currentPoints: [number, number][] = [];
    let tempLayer: L.Layer | null = null;
    let startPoint: [number, number] | null = null;
    let startPixelPoint: L.Point | null = null;
    let startMarker: L.CircleMarker | null = null;
    let dimensionTooltip: L.Tooltip | null = null;

    const clearTempElements = () => {
      if (tempLayer) {
        map.removeLayer(tempLayer);
        tempLayer = null;
      }
      if (startMarker) {
        map.removeLayer(startMarker);
        startMarker = null;
      }
      if (dimensionTooltip) {
        map.removeLayer(dimensionTooltip);
        dimensionTooltip = null;
      }
    };

    const getLatLngFromTouch = (touch: Touch): L.LatLng => {
      const rect = container.getBoundingClientRect();
      const pt = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
      return map.containerPointToLatLng(pt);
    };

    const handleStart = (lat: number, lng: number, clientX?: number, clientY?: number) => {
      if (clientX !== undefined && clientY !== undefined) {
        const rect = container.getBoundingClientRect();
        startPixelPoint = L.point(clientX - rect.left, clientY - rect.top);
      } else {
        startPixelPoint = map.latLngToContainerPoint([lat, lng]);
      }

      if (activeEditorTool === 'draw') {
        isDrawing = true;
        currentPoints = [[lat, lng]];
        tempLayer = L.polyline(currentPoints, {
          color: editorColor,
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      } else if (activeEditorTool === 'arrow' || activeEditorTool === 'box') {
        if (!startPoint) {
          startPoint = [lat, lng];
          // Pulsing precision start anchor marker on mobile
          startMarker = L.circleMarker([lat, lng], {
            radius: 7,
            color: '#ffffff',
            weight: 2.5,
            fillColor: editorColor,
            fillOpacity: 1,
          }).addTo(map);
          setSearchNotification(
            activeEditorTool === 'arrow'
              ? '🎯 Point 1 set. Drag or tap target to draw arrow.'
              : '📐 Corner 1 set. Drag or tap opposite corner to draw boundary box.'
          );
        }
      }
    };

    const handleMove = (lat: number, lng: number) => {
      if (activeEditorTool === 'draw' && isDrawing && tempLayer) {
        const last = currentPoints[currentPoints.length - 1];
        if (last) {
          const p1 = map.latLngToContainerPoint([last[0], last[1]]);
          const p2 = map.latLngToContainerPoint([lat, lng]);
          // High-precision smoothing: add point only when moved at least 3px
          if (p1.distanceTo(p2) >= 3) {
            currentPoints.push([lat, lng]);
            (tempLayer as L.Polyline).setLatLngs(currentPoints);
          }
        }
      } else if (activeEditorTool === 'arrow' && startPoint) {
        if (tempLayer) map.removeLayer(tempLayer);
        tempLayer = L.polyline([startPoint, [lat, lng]], {
          color: editorColor,
          weight: 3.5,
          dashArray: '6, 6',
          opacity: 0.9,
        }).addTo(map);

        const distM = getDistanceMeters(startPoint[0], startPoint[1], lat, lng);
        const distFt = Math.round(distM * 3.28084);
        if (!dimensionTooltip) {
          dimensionTooltip = L.tooltip({
            permanent: true,
            direction: 'top',
            className: 'bg-[#0B132B] text-amber-300 font-mono text-[11px] font-bold px-2 py-1 rounded-md border border-[#D4AF37] shadow-xl',
          }).setLatLng([lat, lng]).setContent(`➔ ${distFt} ft`).addTo(map);
        } else {
          dimensionTooltip.setLatLng([lat, lng]).setContent(`➔ ${distFt} ft`);
        }
      } else if (activeEditorTool === 'box' && startPoint) {
        if (tempLayer) map.removeLayer(tempLayer);
        const bounds = L.latLngBounds(startPoint, [lat, lng]);
        tempLayer = L.rectangle(bounds, {
          color: editorColor,
          weight: 2.5,
          fillColor: editorColor,
          fillOpacity: 0.25,
          dashArray: '5, 5',
        }).addTo(map);

        const distW = getDistanceMeters(startPoint[0], startPoint[1], startPoint[0], lng);
        const distL = getDistanceMeters(startPoint[0], startPoint[1], lat, startPoint[1]);
        const widthFt = Math.round(distW * 3.28084);
        const lengthFt = Math.round(distL * 3.28084);
        const marla = ((widthFt * lengthFt) / 225).toFixed(1);

        if (!dimensionTooltip) {
          dimensionTooltip = L.tooltip({
            permanent: true,
            direction: 'top',
            className: 'bg-[#0B132B] text-white font-mono text-[11px] font-bold px-2 py-1 rounded-md border border-slate-300 shadow-xl',
          }).setLatLng([lat, lng]).setContent(`📐 ${widthFt}ft × ${lengthFt}ft (~${marla} Marla)`).addTo(map);
        } else {
          dimensionTooltip.setLatLng([lat, lng]).setContent(`📐 ${widthFt}ft × ${lengthFt}ft (~${marla} Marla)`);
        }
      }
    };

    const handleEnd = (lat?: number, lng?: number, clientX?: number, clientY?: number) => {
      if (activeEditorTool === 'draw' && isDrawing) {
        isDrawing = false;
        if (tempLayer) {
          map.removeLayer(tempLayer);
          tempLayer = null;
        }
        if (currentPoints.length > 2) {
          setAnnotations((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: 'draw',
              color: editorColor,
              coordinates: currentPoints,
            },
          ]);
          setSearchNotification('✏️ High-precision sketch saved!');
        }
        currentPoints = [];
      } else if ((activeEditorTool === 'arrow' || activeEditorTool === 'box') && startPoint && lat !== undefined && lng !== undefined) {
        // Check if user did a drag-and-release (moved at least 15 pixels)
        let didDrag = false;
        if (startPixelPoint && clientX !== undefined && clientY !== undefined) {
          const rect = container.getBoundingClientRect();
          const currentPixel = L.point(clientX - rect.left, clientY - rect.top);
          if (startPixelPoint.distanceTo(currentPixel) > 15) {
            didDrag = true;
          }
        }

        if (didDrag) {
          clearTempElements();
          const endPoint: [number, number] = [lat, lng];
          setAnnotations((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: activeEditorTool as 'arrow' | 'box',
              color: editorColor,
              coordinates: [startPoint!, endPoint],
            },
          ]);
          startPoint = null;
          startPixelPoint = null;
          setSearchNotification(
            activeEditorTool === 'arrow'
              ? '➔ Arrow placed successfully!'
              : '▢ High-precision plot boundary box placed!'
          );
        }
      }
    };

    // Mouse Event Handlers (PC / Laptop)
    const onMouseDown = (e: L.LeafletMouseEvent) => {
      handleStart(e.latlng.lat, e.latlng.lng, e.originalEvent.clientX, e.originalEvent.clientY);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      handleMove(e.latlng.lat, e.latlng.lng);
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      handleEnd(e.latlng.lat, e.latlng.lng, e.originalEvent.clientX, e.originalEvent.clientY);
    };

    const onClick = (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      if (activeEditorTool === 'text') {
        setTextInputModal({ coords: [lat, lng], text: '' });
      } else if (activeEditorTool === 'arrow') {
        if (!startPoint) {
          handleStart(lat, lng);
        } else {
          clearTempElements();
          const endPoint: [number, number] = [lat, lng];
          setAnnotations((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: 'arrow',
              color: editorColor,
              coordinates: [startPoint!, endPoint],
            },
          ]);
          startPoint = null;
          setSearchNotification('➔ Arrow placed successfully!');
        }
      } else if (activeEditorTool === 'box') {
        if (!startPoint) {
          handleStart(lat, lng);
        } else {
          clearTempElements();
          const endPoint: [number, number] = [lat, lng];
          setAnnotations((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: 'box',
              color: editorColor,
              coordinates: [startPoint!, endPoint],
            },
          ]);
          startPoint = null;
          setSearchNotification('▢ High-precision plot boundary box placed!');
        }
      }
    };

    // Native Touch Event Handlers (Mobile Phone & Tablet Precision)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const latlng = getLatLngFromTouch(touch);
        handleStart(latlng.lat, latlng.lng, touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const latlng = getLatLngFromTouch(touch);
        handleMove(latlng.lat, latlng.lng);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) {
        const latlng = getLatLngFromTouch(touch);
        handleEnd(latlng.lat, latlng.lng, touch.clientX, touch.clientY);
      } else {
        handleEnd();
      }
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('click', onClick);

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      container.style.cursor = '';
      container.style.touchAction = '';
      clearTempElements();

      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('click', onClick);

      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);

      map.dragging.enable();
      map.touchZoom.enable();
    };
  }, [isEditorOpen, activeEditorTool, editorColor]);

  // Synchronize user annotations onto the Leaflet map layer group
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!annotationsLayerGroupRef.current) {
      annotationsLayerGroupRef.current = L.featureGroup().addTo(map);
    }
    const group = annotationsLayerGroupRef.current;
    group.clearLayers();

    annotations.forEach((item) => {
      if (item.type === 'draw' && item.coordinates.length > 1) {
        const polyline = L.polyline(item.coordinates, {
          color: item.color,
          weight: 3.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });
        group.addLayer(polyline);
      } else if (item.type === 'box' && item.coordinates.length === 2) {
        const bounds = L.latLngBounds(item.coordinates[0], item.coordinates[1]);
        const rect = L.rectangle(bounds, {
          color: item.color,
          weight: 2.5,
          fillColor: item.color,
          fillOpacity: 0.22,
          dashArray: '5, 5',
        });
        group.addLayer(rect);
      } else if (item.type === 'arrow' && item.coordinates.length === 2) {
        const [start, end] = item.coordinates;
        // Main arrow line
        const line = L.polyline([start, end], {
          color: item.color,
          weight: 3.5,
          opacity: 0.95,
        });
        group.addLayer(line);

        // Arrowhead at destination coordinate
        const bearing = getBearing(start[0], start[1], end[0], end[1]);
        const arrowHeadIcon = L.divIcon({
          className: 'custom-arrow-head',
          html: `
            <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transform: rotate(${bearing}deg); pointer-events: none;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,22 12,17 2,22" fill="${item.color}" stroke="#0b132b" stroke-width="1.5" />
              </svg>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const arrowMarker = L.marker(end, { icon: arrowHeadIcon, interactive: false });
        group.addLayer(arrowMarker);
      } else if (item.type === 'text' && item.coordinates.length === 1 && item.text) {
        const pos = item.coordinates[0];
        const textIcon = L.divIcon({
          className: 'custom-text-annotation-badge',
          html: `
            <div style="transform: translate(-50%, -100%); display: inline-flex; flex-direction: column; align-items: center; pointer-events: auto;">
              <div style="background: #0B132B; border: 1.5px solid ${item.color}; color: #ffffff; padding: 3px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; font-family: sans-serif; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.65); display: flex; align-items: center; gap: 4px;">
                <span style="color: ${item.color}; font-size: 10px;">✎</span>
                <span>${item.text}</span>
              </div>
              <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid ${item.color}; margin-top: -1px;"></div>
            </div>
          `,
          iconSize: [1, 1],
          iconAnchor: [0, 0],
        });
        const marker = L.marker(pos, { icon: textIcon });
        group.addLayer(marker);
      }
    });
  }, [annotations]);

  // Full Reset & Fresh Plot Search
  const handleResetAllSearch = useCallback(() => {
    setSearchPlot('');
    setSelectedBlock('All');
    setBlockInput('');
    lastExecutedSearchRef.current = '';
    setIsAutocompleteOpen(false);
    setIsBlockDropdownOpen(false);
    setIsPlotCalibrationMode(false);
    handleClearTargetPlot();
    handleClearRoute();
    safeFlyTo(LDA_CITY_CENTER, 14);
    setSearchNotification('✨ Map reset successfully! Ready for fresh search.');
  }, [handleClearTargetPlot, handleClearRoute, safeFlyTo]);

  // Capture high-resolution screenshot and plot dossier
  const handleTakeScreenshot = useCallback(async () => {
    try {
      setSearchNotification('📸 Generating high-resolution screenshot...');
      const mapWrapper = document.getElementById('geo-map-canvas-wrapper');
      if (!mapWrapper) return;

      const canvas = await html2canvas(mapWrapper, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#0B132B',
        scale: 2, // 2x Retina resolution
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const plotNum = targetPlotInfo?.plotNumber || selectedPlot?.plotNumber || 'LDA City';
        const blockName = targetPlotInfo?.block || selectedPlot?.block || selectedBlock || 'LDA City';
        const areaSize = targetPlotInfo?.area || selectedPlot?.size || 'Plot';
        const road = targetPlotInfo?.road || selectedPlot?.roadWidth || 'Main Road';

        // Draw sleek dark header banner
        ctx.fillStyle = 'rgba(11, 19, 43, 0.92)';
        ctx.fillRect(0, 0, canvas.width, 90);

        // Gold border line
        ctx.fillStyle = '#D4AF37';
        ctx.fillRect(0, 90, canvas.width, 3);

        // Header Title
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('KASHPAL ENTERPRISES & BUILDERS', 25, 42);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`LDA CITY LAHORE • PLOT #${plotNum} (BLOCK ${blockName})`, 25, 72);

        // Right side badge
        const badgeText = `${areaSize} • ${road}`;
        ctx.font = 'bold 16px sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        ctx.fillStyle = '#10b981';
        ctx.fillText(badgeText, canvas.width - textWidth - 25, 55);

        // Draw bottom watermark footer
        ctx.fillStyle = 'rgba(11, 19, 43, 0.88)';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('Official Cadastral Survey & Geo-Intelligence Portal | Verified Kashpal Listing', 25, canvas.height - 20);

        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        ctx.fillText(dateStr, canvas.width - 140, canvas.height - 20);
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const plotNum = targetPlotInfo?.plotNumber || selectedPlot?.plotNumber || 'LDA-City';
        const blockName = targetPlotInfo?.block || selectedPlot?.block || 'MasterPlan';
        a.href = url;
        a.download = `KASHPAL-Plot-${plotNum}-Block-${blockName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSearchNotification(`📸 Screenshot saved: Plot #${plotNum} (Block ${blockName})`);
      }, 'image/png');
    } catch (err) {
      console.error('Screenshot capture error:', err);
      setSearchNotification('❌ Screenshot failed, please try again.');
    }
  }, [targetPlotInfo, selectedPlot, selectedBlock]);

  // Interactive Pin Drop Calibration Mode:
  // When active, clicking on the map calibrates the current active plot and learns the block offset!
  // Regular map clicks do NOT trigger plot popups, ensuring clean navigation.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!isPlotCalibrationMode) return;

    map.getContainer().style.cursor = 'crosshair';

    const handleCalibrationClick = (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      if (targetPlotInfo) {
        const result = calibratePlotLocation(
          targetPlotInfo.plotNumber,
          targetPlotInfo.block,
          clickLat,
          clickLng
        );

        // Update the circle and badge at new location
        displaySearchedPlotHighlight(
          [clickLat, clickLng],
          targetPlotInfo.plotNumber,
          targetPlotInfo.block,
          targetPlotInfo.area,
          targetPlotInfo.road,
          undefined,
          targetPlotInfo.society,
          false
        );

        setSearchNotification(
          `🎯 Plot #${targetPlotInfo.plotNumber} calibrated! Shifted ${result.shiftMeters.toFixed(1)}m (~${result.approxPlotsShift.toFixed(1)} plots). Block ${result.block} accuracy updated!`
        );
      }
      setIsPlotCalibrationMode(false);
    };

    map.on('click', handleCalibrationClick);
    return () => {
      map.off('click', handleCalibrationClick);
      if (map.getContainer()) {
        map.getContainer().style.cursor = '';
      }
    };
  }, [isPlotCalibrationMode, targetPlotInfo, displaySearchedPlotHighlight]);

  const handleGetDeviceGps = () => {
    if (userLocation) {
      setGpsPointA({ lat: Number(userLocation[0].toFixed(7)), lng: Number(userLocation[1].toFixed(7)) });
      setSearchNotification('🛰️ Captured Live Device GPS point');
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(7));
          const lng = Number(pos.coords.longitude.toFixed(7));
          setGpsPointA({ lat, lng });
          setSearchNotification('🛰️ Device GPS calibrated successfully');
        },
        (err) => {
          setSearchNotification(`GPS access error: ${err.message}.`);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setSearchNotification('Geolocation is not supported on this browser.');
    }
  };

  const handleUseSearchedPlotForB = () => {
    if (targetPlotLocation) {
      const lat = Number(targetPlotLocation[0].toFixed(7));
      const lng = Number(targetPlotLocation[1].toFixed(7));
      setGpsPointB({ lat, lng });
      setSearchNotification('📍 Set Pin B from active plot on Cadastral Map');
    } else if (activeCadastralPlot) {
      const lat = Number(activeCadastralPlot.lat.toFixed(7));
      const lng = Number(activeCadastralPlot.lng.toFixed(7));
      setGpsPointB({ lat, lng });
      setSearchNotification('📍 Set Pin B from active plot on Cadastral Map');
    } else {
      setSearchNotification('Search a plot first, or click on the map to drop Pin B.');
    }
  };

  const handleApplyGpsCalibration = () => {
    if (!gpsPointA || !gpsPointB) {
      setSearchNotification('Enter or capture both Point A (GPS) and Point B (Map Pin Drop) first.');
      return;
    }

    const latOffsetDiff = gpsPointB.lat - gpsPointA.lat;
    const lngOffsetDiff = gpsPointB.lng - gpsPointA.lng;

    let newLatOffset = calibratedOffsets.latOffset;
    let newLngOffset = calibratedOffsets.lngOffset;

    if (activeCadastralPlot) {
      const rawLat = activeCadastralPlot.lat - calibratedOffsets.latOffset;
      const rawLng = activeCadastralPlot.lng - calibratedOffsets.lngOffset;
      newLatOffset = gpsPointB.lat - rawLat;
      newLngOffset = gpsPointB.lng - rawLng;
    } else if (targetPlotLocation) {
      const deltaLat = gpsPointB.lat - targetPlotLocation[0];
      const deltaLng = gpsPointB.lng - targetPlotLocation[1];
      newLatOffset = calibratedOffsets.latOffset + deltaLat;
      newLngOffset = calibratedOffsets.lngOffset + deltaLng;
    } else {
      newLatOffset = calibratedOffsets.latOffset + latOffsetDiff;
      newLngOffset = calibratedOffsets.lngOffset + lngOffsetDiff;
    }

    setCalibratedOffsets(newLatOffset, newLngOffset);
    setCalibratedOffsetsState({ latOffset: newLatOffset, lngOffset: newLngOffset });

    if (activeCadastralPlot) {
      const refreshed = findCadastralPlot(activeCadastralPlot.plotNumber, activeCadastralPlot.block);
      if (refreshed) {
        setActiveCadastralPlot(refreshed);
        displaySearchedPlotHighlight(
          refreshed.latLng,
          refreshed.plotNumber,
          refreshed.block,
          refreshed.area,
          refreshed.road,
          undefined,
          refreshed.society
        );
      }
    }

    const diff = calculateGpsOffsetDifference(gpsPointA.lat, gpsPointA.lng, gpsPointB.lat, gpsPointB.lng);
    setSearchNotification(`Exact GPS Calibration Applied! Shift: ${diff.totalFeet.toFixed(1)}ft (${diff.totalMeters.toFixed(1)}m)`);
  };

  // Nudge calibration logic for exact Zameen alignment
  const handleNudge = (deltaLat: number, deltaLng: number) => {
    const updated = nudgeOffset(deltaLat, deltaLng);
    setCalibratedOffsetsState(updated);
    if (activeCadastralPlot) {
      const refreshed = findCadastralPlot(activeCadastralPlot.plotNumber, activeCadastralPlot.block);
      if (refreshed) {
        setActiveCadastralPlot(refreshed);
        displaySearchedPlotHighlight(
          refreshed.latLng,
          refreshed.plotNumber,
          refreshed.block,
          refreshed.area,
          refreshed.road,
          undefined,
          refreshed.society
        );
      }
    } else if (targetPlotLocation && targetPlotInfo) {
      const newCoords: [number, number] = [targetPlotLocation[0] + deltaLat, targetPlotLocation[1] + deltaLng];
      displaySearchedPlotHighlight(
        newCoords,
        targetPlotInfo.plotNumber,
        targetPlotInfo.block,
        targetPlotInfo.area,
        targetPlotInfo.road,
        undefined,
        targetPlotInfo.society
      );
    }
  };

  const handleResetCalibration = () => {
    const def = resetOffsetsToDefault();
    setCalibratedOffsetsState(def);
    setGpsPointA(null);
    setGpsPointB(null);
    if (calibrationMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(calibrationMarkerRef.current);
      calibrationMarkerRef.current = null;
    }
    if (activeCadastralPlot) {
      const refreshed = findCadastralPlot(activeCadastralPlot.plotNumber, activeCadastralPlot.block);
      if (refreshed) {
        setActiveCadastralPlot(refreshed);
        displaySearchedPlotHighlight(
          refreshed.latLng,
          refreshed.plotNumber,
          refreshed.block,
          refreshed.area,
          refreshed.road,
          undefined,
          refreshed.society
        );
      }
    }
    setSearchNotification('Calibration reset to standard baseline (0.015178, -0.073888)');
  };

  // Helper to color-code plots visually by size (5 Marla, 10 Marla, 1 Kanal, 2 Kanal, Commercial)
  const getPlotSizeStyle = (size?: string) => {
    const s = (size || '').toLowerCase();
    if (s.includes('commercial')) {
      return {
        fillColor: '#F43F5E', // Rose / Red
        borderColor: '#FDA4AF',
        label: 'Commercial',
      };
    }
    if (s.includes('2 kanal')) {
      return {
        fillColor: '#D97706', // Warm Amber / Deep Gold
        borderColor: '#FDE68A',
        label: '2 Kanal',
      };
    }
    if (s.includes('1 kanal') || s.includes('kanal')) {
      return {
        fillColor: '#8B5CF6', // Royal Purple / Violet
        borderColor: '#DDD6FE',
        label: '1 Kanal',
      };
    }
    if (s.includes('10 marla')) {
      return {
        fillColor: '#0284C7', // Sky Blue / Cyan
        borderColor: '#BAE6FD',
        label: '10 Marla',
      };
    }
    if (s.includes('5 marla')) {
      return {
        fillColor: '#10B981', // Emerald Green
        borderColor: '#A7F3D0',
        label: '5 Marla',
      };
    }
    return {
      fillColor: '#0D9488', // Teal
      borderColor: '#99F6E4',
      label: size || 'Plot',
    };
  };

  // Render & Update Active Inventory Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(polygonLayersRef.current).forEach((layer) => {
      map.removeLayer(layer);
    });
    polygonLayersRef.current = {};

    plots.forEach((plot) => {
      const isSelected = selectedPlot?.id === plot.id;
      const validCoords = Array.isArray(plot.coordinates)
        ? (plot.coordinates.filter(isValidLatLng) as [number, number][])
        : [];
      if (validCoords.length < 3) return;

      // Visually categorize and color-code plots based on size
      const sizeStyle = getPlotSizeStyle(plot.size);
      let fillColor = sizeStyle.fillColor;
      let borderColor = isSelected ? '#FFFFFF' : sizeStyle.borderColor;
      let fillOpacity = isSelected ? 0.78 : 0.45;
      let weight = isSelected ? 3.5 : 2;

      if (plot.status === 'Sold') {
        fillOpacity = 0.2;
        borderColor = '#64748B';
      } else if (plot.status === 'Reserved') {
        borderColor = '#FDE047'; // Gold alert accent
      }

      const polygon = L.polygon(validCoords, {
        color: borderColor,
        weight: weight,
        opacity: isSelected ? 1 : 0.9,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
      }).addTo(map);

      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectPlot(plot);
        displaySearchedPlotHighlight(
          plot.center,
          plot.plotNumber,
          plot.block,
          plot.size,
          'Active Inventory',
          undefined, // Do NOT draw center rectangle per user instruction
          plot.sector || 'LDA City'
        );
        if (userLocation) {
          updateUserMarker(userLocation);
        }
      });

      polygon.bindTooltip(
        `<div class="text-xs font-sans p-1">
          <div class="flex items-center gap-1.5 font-bold text-[#132b4f]">
            <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${sizeStyle.fillColor}"></span>
            <span>Plot #${plot.plotNumber} • ${plot.size}</span>
          </div>
          <div class="text-[10px] text-slate-600 mt-0.5">${plot.sector} (${plot.block})</div>
          <div class="text-[10px] font-bold text-emerald-700 mt-0.5">${formatPKR(plot.price)}</div>
        </div>`,
        { direction: 'top', sticky: true }
      );

      polygonLayersRef.current[plot.id] = polygon;
    });
  }, [plots, selectedPlot, onSelectPlot, safeFlyTo, displaySearchedPlotHighlight, userLocation]);

  // Auto-locate and fly to plot on map when a listing is clicked (Geo-Map / View on Map)
  // User: "or jo plot number or block listing time lagaya jaya wo listing per map option click krne se direct us plot per pohcnha dae."
  const lastLocatedPlotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedPlot || !mapInstanceRef.current) return;

    const plotKey = `${selectedPlot.plotNumber}-${selectedPlot.block}-${selectedPlot.id}`;
    if (lastLocatedPlotRef.current === plotKey) return;
    lastLocatedPlotRef.current = plotKey;

    const plotNum = (selectedPlot.plotNumber || '').trim();
    const blockName = (selectedPlot.block || '').trim();

    // 1. Try finding in Master Cadastral Data by plot number & block
    let foundCadastral: ResolvedCadastralPlot | null = null;
    if (plotNum && blockName) {
      foundCadastral = findCadastralPlot(plotNum, blockName);
    }

    if (foundCadastral) {
      setActiveCadastralPlot(foundCadastral);
      safeFlyTo(foundCadastral.latLng, 19);
      displaySearchedPlotHighlight(
        foundCadastral.latLng,
        foundCadastral.plotNumber,
        foundCadastral.block,
        foundCadastral.area,
        foundCadastral.road,
        undefined,
        foundCadastral.society,
        true
      );
      setSelectedBlock(foundCadastral.block);
      setBlockInput(foundCadastral.block);
      setSearchPlot(foundCadastral.plotNumber);
      setSearchNotification(`🎯 Located Plot #${foundCadastral.plotNumber} in Block ${foundCadastral.block} on Cadastral Map!`);
    } else if (isValidLatLng(selectedPlot.center)) {
      // 2. Direct plot coordinate match
      safeFlyTo(selectedPlot.center, 19);
      displaySearchedPlotHighlight(
        selectedPlot.center,
        selectedPlot.plotNumber,
        selectedPlot.block,
        selectedPlot.size,
        selectedPlot.type || 'Active Listing',
        selectedPlot.coordinates as [number, number][],
        selectedPlot.sector || 'LDA City',
        true
      );
      if (selectedPlot.block) {
        setSelectedBlock(selectedPlot.block);
        setBlockInput(selectedPlot.block);
      }
      if (selectedPlot.plotNumber) {
        setSearchPlot(selectedPlot.plotNumber);
      }
      setSearchNotification(`🎯 Located Plot #${selectedPlot.plotNumber} in Block ${selectedPlot.block} on Geo-Map!`);
    }
  }, [selectedPlot, safeFlyTo, displaySearchedPlotHighlight]);

  // Check if target plot is off-screen or distant, and calculate exact free-floating perimeter arrow coordinates
  const checkOffScreen = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !targetPlotLocation || !targetPlotInfo) {
      setOffScreenInfo(null);
      setScreenArrowPos(null);
      return;
    }

    const targetLatLng = L.latLng(targetPlotLocation[0], targetPlotLocation[1]);
    const bounds = map.getBounds();
    const isInside = bounds.contains(targetLatLng);

    // Source coordinates: user's live GPS if available, otherwise map viewport center
    const sourceCoords: [number, number] = userLocation || [map.getCenter().lat, map.getCenter().lng];
    const dist = getDistanceMeters(sourceCoords[0], sourceCoords[1], targetPlotLocation[0], targetPlotLocation[1]);
    const bearing = getBearing(sourceCoords[0], sourceCoords[1], targetPlotLocation[0], targetPlotLocation[1]);

    const isDistant = dist > 180;
    if (!isInside || isDistant) {
      setOffScreenInfo({
        isOffScreenOrDistant: true,
        distanceMeters: Math.round(dist),
        bearing: Math.round(bearing),
        plotNumber: targetPlotInfo.plotNumber,
        block: targetPlotInfo.block,
      });

      // Compute 2D position on map container so arrow freely moves along the perimeter
      const container = map.getContainer();
      if (container) {
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const pt = map.latLngToContainerPoint(targetLatLng);

        const centerX = width / 2;
        const centerY = height / 2;
        const dx = pt.x - centerX;
        const dy = pt.y - centerY;
        // Arrow pointing up by default => +90 deg
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

        const padX = 40;
        const padTop = 75; // below top search bar
        const padBottom = 40;

        let clampX = pt.x;
        let clampY = pt.y;

        if (!isInside) {
          const minX = padX;
          const maxX = width - padX;
          const minY = padTop;
          const maxY = height - padBottom;

          let scale = 1;
          if (dx !== 0) {
            const targetX = dx > 0 ? maxX : minX;
            scale = (targetX - centerX) / dx;
          }
          const testY = centerY + dy * scale;
          if (testY < minY || testY > maxY) {
            if (dy !== 0) {
              const targetY = dy > 0 ? maxY : minY;
              scale = (targetY - centerY) / dy;
            }
          }
          clampX = Math.max(minX, Math.min(maxX, centerX + dx * scale));
          clampY = Math.max(minY, Math.min(maxY, centerY + dy * scale));
        }

        setScreenArrowPos({
          x: Math.round(clampX),
          y: Math.round(clampY),
          angleDeg: Math.round(angleDeg),
          distMeters: Math.round(dist),
          plotNumber: targetPlotInfo.plotNumber,
          block: targetPlotInfo.block,
          isOffScreen: !isInside,
        });
      }
    } else {
      setOffScreenInfo(null);
      setScreenArrowPos(null);
    }
  }, [targetPlotLocation, targetPlotInfo, userLocation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const updateActiveBadgeScreenRect = () => {
      if (!cadastralMarkerRef.current || !map || !mapContainerRef.current) {
        return;
      }
      const curLatLng = cadastralMarkerRef.current.getLatLng();
      const pt = map.latLngToContainerPoint(curLatLng);
      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const screenX = mapRect.left + pt.x;
      const screenY = mapRect.top + pt.y;
      setActivePlotBadgeRect({
        left: screenX - 110,
        top: screenY - 72,
        right: screenX + 110,
        width: 220,
        height: 72,
      });
    };

    map.on('move', checkOffScreen);
    map.on('zoom', checkOffScreen);
    map.on('move', updateActiveBadgeScreenRect);
    map.on('zoom', updateActiveBadgeScreenRect);
    checkOffScreen();
    updateActiveBadgeScreenRect();

    return () => {
      map.off('move', checkOffScreen);
      map.off('zoom', checkOffScreen);
      map.off('move', updateActiveBadgeScreenRect);
      map.off('zoom', updateActiveBadgeScreenRect);
    };
  }, [checkOffScreen]);

  // LIVE GPS TRACKING
  useEffect(() => {
    let watchId: number;
    if (isLiveTracking && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const coords: [number, number] = [lat, lng];
          setUserLocation(coords);
          updateUserMarker(coords);
        },
        (err) => {
          console.warn('Live location error, using office coordinates:', err);
          setUserLocation(OFFICE_COORDS);
          updateUserMarker(OFFICE_COORDS);
          setIsLiveTracking(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
    return () => {
      if (watchId && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isLiveTracking, targetPlotLocation]);

  // User Marker with High-Precision Google-Style Blue Dot & Directional Arrow to Target Plot
  const updateUserMarker = useCallback((coords: [number, number]) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    let arrowHtml = '';
    if (targetPlotLocation) {
      const bearing = getBearing(coords[0], coords[1], targetPlotLocation[0], targetPlotLocation[1]);
      arrowHtml = `
        <div style="position: absolute; width: 50px; height: 50px; transform: rotate(${bearing}deg); display: flex; justify-content: center; top: -17px; pointer-events: none; z-index: 5;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="2" style="width: 28px; height: 28px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));">
            <path d="M12 2L22 22L12 18L2 22L12 2Z"></path>
          </svg>
        </div>
      `;
    }

    const userIcon = L.divIcon({
      className: 'custom-live-blue-dot-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <!-- Animated Radar Wave -->
          <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: blue-dot-pulse 2s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;"></div>
          ${arrowHtml}
          <!-- High-Precision Solid Blue Dot Core -->
          <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: #1d4ed8; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(29, 78, 216, 0.9), 0 2px 6px rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center;">
            <div style="width: 4px; height: 4px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
        <style>
          @keyframes blue-dot-pulse {
            0% { transform: scale(0.5); opacity: 0.9; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        </style>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const marker = L.marker(coords, { icon: userIcon, zIndexOffset: 4000 }).addTo(map);
    marker.bindPopup(`
      <div style="padding: 6px 10px; font-family: sans-serif; font-size: 12px; color: #1e293b; text-align: center;">
        <strong style="color: #1d4ed8; font-size: 13px; display: block; margin-bottom: 2px;">📍 Your Live Location</strong>
        <span style="color: #10b981; font-size: 11px; font-weight: 700;">📡 Live GPS Signal Active • On Site</span>
      </div>
    `);
    userMarkerRef.current = marker;
  }, [targetPlotLocation]);

  const toggleLiveLocation = () => {
    if (isLiveTracking) {
      setIsLiveTracking(false);
    } else {
      setIsLiveTracking(true);
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(coords);
            updateUserMarker(coords);
            safeFlyTo(coords, 16);
          },
          () => {
            setUserLocation(OFFICE_COORDS);
            updateUserMarker(OFFICE_COORDS);
            safeFlyTo(OFFICE_COORDS, 16);
          }
        );
      } else {
        setUserLocation(OFFICE_COORDS);
        updateUserMarker(OFFICE_COORDS);
        safeFlyTo(OFFICE_COORDS, 16);
      }
    }
  };

  // DIRECT 1-CLICK ROUTE LINE DRAWING (From Current Location to Target Plot)
  const handleDrawDirectRoute = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Start point: User's location or Office
    const startPoint: [number, number] = userLocation || OFFICE_COORDS;
    const startLabel = userLocation ? 'My Current Location' : 'Kashpal Head Office';

    // End point: Target plot from search or selectedPlot
    let endPoint: [number, number] | null = targetPlotLocation;
    let destLabel = 'Target Plot';

    if (!endPoint && selectedPlot) {
      endPoint = selectedPlot.center;
      destLabel = `Plot #${selectedPlot.plotNumber} (${selectedPlot.block})`;
    } else if (!endPoint && activeCadastralPlot) {
      endPoint = activeCadastralPlot.latLng;
      destLabel = `Plot #${activeCadastralPlot.plotNumber} (Block ${activeCadastralPlot.block})`;
    }

    if (!endPoint) {
      setSearchNotification('Please search or select a plot first to draw the direct route.');
      return;
    }

    handleClearRoute();

    try {
      const result = await calculateRouteBetweenCoordinates(
        startPoint,
        endPoint,
        startLabel,
        destLabel
      );

      // Start Marker (A)
      const startIcon = L.divIcon({
        className: 'route-start-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-lg">
              A
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const startMarker = L.marker(startPoint, { icon: startIcon, zIndexOffset: 2800 }).addTo(map);
      routeStartMarkerRef.current = startMarker;

      // End Marker (B)
      const endIcon = L.divIcon({
        className: 'route-end-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-[#ef4444] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
              B
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const endMarker = L.marker(endPoint, { icon: endIcon, zIndexOffset: 2800 }).addTo(map);
      routeEndMarkerRef.current = endMarker;

      // Ensure SVG linearGradient defs exist in map's overlay SVG
      const setupRouteGradient = () => {
        const overlayPane = map.getPanes()?.overlayPane;
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

        const p1 = map.latLngToLayerPoint(startPoint);
        const p2 = map.latLngToLayerPoint(endPoint);
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
      setupRouteGradient();

      // Ambient soft gradient glow halo
      const haloLine = L.polyline(result.coordinates, {
        className: 'leaflet-polyline route-gradient-halo',
        color: 'url(#routeGradient)',
        weight: 10,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Gradient-stroked polyline pulsing towards target plot destination
      const pulseLine = L.polyline(result.coordinates, {
        className: 'leaflet-polyline route-gradient-pulse',
        color: 'url(#routeGradient)',
        weight: 5,
        dashArray: '12, 14',
        lineCap: 'round',
        lineJoin: 'round',
      });

      const routeGroup = L.featureGroup([haloLine, pulseLine]).addTo(map);
      routePolylineRef.current = routeGroup;

      const updateGradient = () => setupRouteGradient();
      map.on('move zoom', updateGradient);

      // Fit bounds to display the whole route
      const bounds = L.latLngBounds([startPoint, endPoint, ...result.coordinates]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60] });
      }

      const bearingVal = getBearing(startPoint[0], startPoint[1], endPoint[0], endPoint[1]);
      setActiveRouteInfo({
        originLabel: startLabel,
        destLabel: destLabel,
        distanceKm: result.distanceKm,
        durationMinutes: result.durationMinutes,
        bearing: Math.round(bearingVal),
      });

      setSearchNotification(
        `Direct Route Drawn: ${result.distanceKm} km (~${result.durationMinutes} mins)`
      );
    } catch (err) {
      console.error('Error drawing route line:', err);
    }
  }, [userLocation, targetPlotLocation, selectedPlot, activeCadastralPlot, handleClearRoute]);

  // Execute Search for Plot (Auto or Manual)
  const handleExecuteSearch = useCallback(
    (e?: React.FormEvent, plotOverride?: string, blockOverride?: string) => {
      if (e) {
        e.preventDefault();
        // Force manual execution if user explicitly clicked Locate or hit Enter
        lastExecutedSearchRef.current = '';
      }
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear any previously active route so it doesn't get stuck on new plot interaction
      handleClearRoute();

      const cleanPlotQuery = (plotOverride !== undefined ? plotOverride : searchPlot).trim();
      const currentBlock = blockOverride !== undefined ? blockOverride : selectedBlock;

      // If block is selected but no plot number, fly to block bounds
      if (!cleanPlotQuery) {
        if (currentBlock && currentBlock !== 'All') {
          flyToBlock(currentBlock);
        }
        return;
      }

      // Mark this query as executed so movement/drag doesn't re-trigger
      lastExecutedSearchRef.current = `${currentBlock}:::${cleanPlotQuery.toLowerCase()}`;

      // 1. Check active inventory
      const matchedInventory = plots.find((p) => {
        const matchPlot = p.plotNumber.toLowerCase() === cleanPlotQuery.toLowerCase();
        const matchBlock = currentBlock === 'All' || p.block.toLowerCase() === currentBlock.toLowerCase();
        return matchPlot && matchBlock;
      });

      if (matchedInventory) {
        setActiveCadastralPlot(null);
        onSelectPlot(matchedInventory);
        displaySearchedPlotHighlight(
          matchedInventory.center,
          matchedInventory.plotNumber,
          matchedInventory.block,
          matchedInventory.size,
          'LDA City Inventory',
          matchedInventory.coordinates as [number, number][],
          matchedInventory.sector || 'LDA City',
          true
        );
        if (userLocation) {
          updateUserMarker(userLocation);
        }
        setSearchNotification(`Located Plot #${matchedInventory.plotNumber} (${matchedInventory.block})`);
        return;
      }

      // 2. Check 12,602 Cadastral Master Database
      const cadastralMatch = findCadastralPlot(cleanPlotQuery, currentBlock);
      if (cadastralMatch) {
        setActiveCadastralPlot(cadastralMatch);
        displaySearchedPlotHighlight(
          cadastralMatch.latLng,
          cadastralMatch.plotNumber,
          cadastralMatch.block,
          cadastralMatch.area,
          cadastralMatch.road,
          cadastralMatch.bounds,
          cadastralMatch.society,
          true
        );
        if (userLocation) {
          updateUserMarker(userLocation);
        }
        setSearchNotification(
          `Located Plot #${cadastralMatch.plotNumber} (Block ${cadastralMatch.block})`
        );
      } else {
        // Clear previous highlight so map doesn't show misleading old plot
        if (cadastralCircleRef.current && map) {
          map.removeLayer(cadastralCircleRef.current);
          cadastralCircleRef.current = null;
        }
        if (cadastralMarkerRef.current && map) {
          map.removeLayer(cadastralMarkerRef.current);
          cadastralMarkerRef.current = null;
        }
        if (cadastralPolygonRef.current && map) {
          map.removeLayer(cadastralPolygonRef.current);
          cadastralPolygonRef.current = null;
        }
        if (cadastralLineRef.current && map) {
          map.removeLayer(cadastralLineRef.current);
          cadastralLineRef.current = null;
        }
        if (cadastralCenterDotRef.current && map) {
          map.removeLayer(cadastralCenterDotRef.current);
          cadastralCenterDotRef.current = null;
        }
        setActiveCadastralPlot(null);
        setTargetPlotLocation(null);
        setTargetPlotInfo(null);
        setSearchNotification(
          `❌ Error: Plot #${cleanPlotQuery} record not found in Block ${currentBlock}! Please verify plot number.`
        );
      }
    },
    [searchPlot, selectedBlock, plots, flyToBlock, onSelectPlot, displaySearchedPlotHighlight, userLocation, updateUserMarker]
  );

  // Auto-fly to plot as soon as plot number is typed (without locking map after)
  useEffect(() => {
    const trimmed = searchPlot.trim();
    if (!trimmed) {
      lastExecutedSearchRef.current = '';
      return;
    }

    const searchKey = `${selectedBlock}:::${trimmed.toLowerCase()}`;
    if (lastExecutedSearchRef.current === searchKey) {
      return; // Already executed once, don't re-trigger or pull camera back
    }

    const timer = setTimeout(() => {
      handleExecuteSearch(undefined, trimmed, selectedBlock);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchPlot, selectedBlock, handleExecuteSearch]);

  // Auto-dismiss floating search notifications after 3.5 seconds
  useEffect(() => {
    if (searchNotification) {
      const timer = setTimeout(() => {
        setSearchNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [searchNotification]);

  // Invalidate map size on fullscreen or cleanView toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullScreenMap, cleanView]);

  // Step Plot Number forward or backward directly from Plot dialog
  // User: "taake koi aagy aagy piche kr ka bhi number kocce krwana chaha to krwa ska"
  const handleStepPlot = useCallback((direction: 'next' | 'prev') => {
    const currentNum = targetPlotInfo?.plotNumber || searchPlot || '1';
    const match = currentNum.match(/\d+/);
    if (!match) return;
    const num = parseInt(match[0], 10);
    const nextNum = direction === 'next' ? num + 1 : Math.max(1, num - 1);
    const newPlotStr = currentNum.replace(match[0], nextNum.toString());

    setSearchPlot(newPlotStr);
    const blockToUse = targetPlotInfo?.block || (selectedBlock !== 'All' ? selectedBlock : 'C');
    if (selectedBlock === 'All') {
      setSelectedBlock(blockToUse);
      setBlockInput(blockToUse);
    }
    handleExecuteSearch(undefined, newPlotStr, blockToUse);
  }, [targetPlotInfo, searchPlot, selectedBlock, handleExecuteSearch]);

  useEffect(() => {
    handleStepPlotRef.current = handleStepPlot;
  }, [handleStepPlot]);

  // Free-form Drag Handlers for Plot Info Dialog (Mouse & Touch supported smoothly)
  const handleCardPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a, select')) return;

    const card = plotCardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const wrapper = document.getElementById('geo-map-canvas-wrapper');
    const parentRect = wrapper?.getBoundingClientRect() || { left: 0, top: 0 };

    const currentX = plotCardPosition.x !== null ? plotCardPosition.x : (rect.left - parentRect.left);
    const currentY = plotCardPosition.y !== null ? plotCardPosition.y : (rect.top - parentRect.top);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: currentX,
      origY: currentY,
    };
    setIsDraggingCard(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [plotCardPosition]);

  const handleCardPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingCard || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const wrapper = document.getElementById('geo-map-canvas-wrapper');
    const card = plotCardRef.current;
    const maxW = (wrapper?.clientWidth || window.innerWidth) - (card?.clientWidth || 300) - 8;
    const maxH = (wrapper?.clientHeight || window.innerHeight) - (card?.clientHeight || 120) - 8;

    const newX = Math.max(8, Math.min(maxW, dragStartRef.current.origX + dx));
    const newY = Math.max(8, Math.min(maxH, dragStartRef.current.origY + dy));

    setPlotCardPosition({ x: newX, y: newY });
  }, [isDraggingCard]);

  const handleCardPointerUp = useCallback((e: React.PointerEvent) => {
    setIsDraggingCard(false);
    dragStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }
  }, []);

  // Download High-Resolution Branded PDF Dossier for Offline Reference
  // User: "Implement a 'Download as PDF' feature within the clean-view mode that captures the current map area and exports a high-resolution, branded report including current plot details, block information, and a timestamp. hanji jis se yaeh map ko offlien bhi use kia jaa ska samve features kaa saath."
  const handleDownloadBrandedPdf = useCallback(async () => {
    try {
      setIsGeneratingPdf(true);
      setSearchNotification('📄 Compiling High-Resolution Branded PDF Dossier for Offline Use...');

      const mapWrapper = document.getElementById('geo-map-canvas-wrapper');
      if (!mapWrapper) {
        setIsGeneratingPdf(false);
        return;
      }

      // Capture high-resolution canvas snapshot of the map
      const canvas = await html2canvas(mapWrapper, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#0B132B',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const plotNum = targetPlotInfo?.plotNumber || selectedPlot?.plotNumber || searchPlot || 'LDA-City';
      const blockName = targetPlotInfo?.block || selectedPlot?.block || (selectedBlock !== 'All' ? selectedBlock : 'MasterPlan');
      const areaSize = targetPlotInfo?.area || selectedPlot?.size || 'Standard Plot';
      const road = targetPlotInfo?.road || selectedPlot?.roadWidth || 'Sector Road';
      const sector = selectedPlot?.sector || (['A','B','C','D','E','F','G','H','J','AA','BB','CC','DD'].includes(blockName) ? 'Jinnah Sector' : 'Iqbal Sector');
      const coordsStr = 'LDA City Certified Cadastral Verification';
      const timestampStr = new Date().toLocaleString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      const verificationCode = `KP-${Date.now().toString(36).toUpperCase()}-${plotNum}`;

      // Initialize landscape A4 PDF (297mm x 210mm)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // 1. Top Branded Navy Header (0 to 22mm)
      doc.setFillColor(11, 19, 43);
      doc.rect(0, 0, 297, 22, 'F');

      // Gold Accent Strip
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 22, 297, 2, 'F');

      // Brand Title
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(15);
      doc.text('KASHPAL ENTERPRISES & BUILDERS', 12, 10);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240);
      doc.setFontSize(8.5);
      doc.text('Official Cadastral Survey & Offline Geo-Intelligence Dossier • LDA City Lahore', 12, 16);

      // Contact Info right side
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.text('UAN: 0300 1535898  |  0326 4509700', 285, 10, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7.5);
      doc.text('HQ: 180 Ft Main Boulevard, Gajjumata, Lahore', 285, 16, { align: 'right' });

      // 2. Summary Info Strip (26mm to 43mm)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(12, 26, 273, 16, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(12, 26, 273, 16, 2, 2, 'S');

      // Column 1: Plot & Block
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(19, 43, 79);
      doc.setFontSize(11);
      doc.text(`PLOT #${plotNum}`, 16, 33);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Block ${blockName} • ${sector}`, 16, 38.5);

      // Column 2: Dimensions & Category
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(19, 43, 79);
      doc.setFontSize(10);
      doc.text(areaSize, 78, 33);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Frontage: ${road}`, 78, 38.5);

      // Column 3: Cadastral Security
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(19, 43, 79);
      doc.setFontSize(9);
      doc.text('Cadastral Security:', 140, 33);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(8.5);
      doc.text(coordsStr, 140, 38.5);

      // Column 4: Verification Code & Timestamp
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(19, 43, 79);
      doc.setFontSize(8.5);
      doc.text(`Doc Ref: ${verificationCode}`, 215, 33);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Issued: ${timestampStr}`, 215, 38.5);

      // 3. High-Resolution Map Area (44mm to 193mm)
      doc.addImage(imgData, 'JPEG', 12, 44, 273, 149, undefined, 'FAST');
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.8);
      doc.rect(12, 44, 273, 149, 'S');

      // 4. Branded Footer (196mm to 210mm)
      doc.setFillColor(11, 19, 43);
      doc.rect(0, 196, 297, 14, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(7.5);
      doc.text('VERIFIED SURVEY DOSSIER • FULLY FUNCTIONAL OFFLINE REFERENCE • KASHPAL ENTERPRISES', 12, 203);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text(`Generated on ${timestampStr} | Lahore Development Authority (LDA) City Master Plan System`, 285, 203, { align: 'right' });

      doc.save(`KASHPAL-Plot-${plotNum}-Block-${blockName}-Dossier.pdf`);
      setSearchNotification(`✅ PDF Dossier downloaded successfully: Plot #${plotNum} (Block ${blockName})`);
    } catch (err) {
      console.error('PDF generation error:', err);
      setSearchNotification('❌ Failed to generate PDF dossier, please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [targetPlotInfo, selectedPlot, selectedBlock, targetPlotLocation, searchPlot]);

  // Reset Zoom Control
  const handleResetZoom = () => safeFlyTo(LDA_CITY_CENTER, 14);

  // Cycle Opacity Preset
  const handleCycleOpacity = () => {
    if (tileOpacity >= 0.85) setTileOpacity(0);
    else if (tileOpacity === 0) setTileOpacity(0.5);
    else if (tileOpacity === 0.5) setTileOpacity(0.85);
    else setTileOpacity(1.0);
  };

  if (!isMounted) {
    return (
      <div className="w-full bg-[#0B132B] rounded-2xl h-[650px] flex items-center justify-center border border-[#D4AF37]/30">
        <div className="flex flex-col items-center gap-3 text-[#D4AF37]">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Initializing LDA City Map Portal...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full font-sans items-center justify-center ${
      isFullScreenMap || cleanView ? 'fixed inset-0 z-[4000] bg-slate-950 w-screen h-screen' : 'w-full py-1 sm:py-2'
    }`}>
      {/* 
        ========================================================================
        MAP CANVAS CONTAINER (80% default vs 100% fullscreen toggle)
        With Fixed Top Search Bar & Right Vertical Floating Dock
        ========================================================================
      */}
      <div
        id="geo-map-canvas-wrapper"
        className={`relative overflow-hidden transition-all duration-300 bg-[#0B132B] ${
          isFullScreenMap || cleanView
            ? 'w-full h-full flex-1 rounded-none border-none shadow-none'
            : 'w-[96%] sm:w-[88%] lg:w-[82%] h-[78vh] sm:h-[82vh] max-w-7xl rounded-2xl border-2 border-slate-700/80 shadow-2xl'
        }`}
      >
        {/* 3D Dragon Interactive Canvas Overlay */}
        {isDragonEnabled && (
          <DragonOverlay
            targetPopupRect={activePlotBadgeRect}
            modelPath="/models/dragon.glb"
            muted={isDragonMuted}
            zIndex={1400}
            allowPatrolWhenIdle={true}
          />
        )}
        {/* Loading Indicator */}
        {isTileLoading && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-[#132b4f]/90 backdrop-blur-md text-[#D4AF37] px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-2 shadow-lg border border-[#D4AF37]/30">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping"></span>
              <span>Streaming LDA City Master Tiles...</span>
            </div>
          </div>
        )}

        {/* 
          ========================================================================
          FIXED TOP SEARCH BAR ON MAP (Mobile & PC Responsive, No Collapsing)
          Fixed directly over the map canvas as a persistent window
          ========================================================================
        */}
        <div 
          id="map-top-search-strip"
          className="absolute top-2 sm:top-3 left-2 sm:left-3 right-12 sm:right-16 z-[1200] max-w-xl sm:max-w-3xl lg:max-w-5xl pointer-events-auto bg-white/95 backdrop-blur-md shadow-md border border-slate-200/90 rounded-xl p-1 sm:p-1.5 text-slate-800 transition-all"
        >
          <form onSubmit={handleExecuteSearch} className="flex items-center gap-1.5 w-full py-0.5">
          {/* Prominent Exit Button (Mobile & Desktop) */}
          {(onBackToInventory || isFullScreenMap) && (
            <button
              type="button"
              onClick={handleExitMap}
              className="flex items-center gap-1 px-2 sm:px-2.5 h-8 bg-[#0B132B] hover:bg-[#132b4f] text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-[#D4AF37]/50 shadow-sm shrink-0 active:scale-95"
              title="Return to Website Main Page (Turns off satellite mode)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden xs:inline sm:inline">Main Page</span>
            </button>
          )}

          {/* Box 1: Society (LDA City Lahore) - Direct button to website main page */}
          <button
            type="button"
            onClick={handleExitMap}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 hover:border-amber-400 rounded-lg text-slate-800 text-[11px] font-black shrink-0 transition-colors cursor-pointer"
            title="Open Website Main Page (LDA City Lahore)"
          >
            <span>LDA City Lahore</span>
          </button>

              {/* Box 2: Block Select / Dropdown - Generous Open Width */}
              <div ref={blockSelectRef} className="relative w-28 sm:w-44 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Block (A, B, Q)"
                    value={blockInput !== '' ? blockInput : (selectedBlock === 'All' ? '' : selectedBlock)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBlockInput(val);
                      setIsAutocompleteOpen(val.trim().length > 0);
                      setIsBlockDropdownOpen(false);
                      // If exact match with a block
                      const upper = val.trim().toUpperCase().replace(/^BLOCK\s*/i, '');
                      if (upper && allBlocks.includes(upper)) {
                        setSelectedBlock(upper);
                      }
                    }}
                    onFocus={() => {
                      if (blockInput.trim().length > 0) {
                        setIsAutocompleteOpen(true);
                      }
                    }}
                    className="w-full h-8 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#132b4f] focus:outline-none focus:border-[#D4AF37] pr-6"
                  />
                  {blockInput.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBlockInput('');
                        setSelectedBlock('All');
                        setIsBlockDropdownOpen(false);
                        setIsAutocompleteOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear block search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBlockDropdownOpen((prev) => !prev);
                        setIsAutocompleteOpen(false);
                      }}
                      className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md cursor-pointer transition-colors ${
                        isBlockDropdownOpen ? 'text-[#bd8b2e] bg-amber-100/60' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Browse Blocks by Sector (Jinnah / Iqbal)"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBlockDropdownOpen ? 'rotate-180 text-amber-700' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestions when user is typing */}
                {isAutocompleteOpen && !isBlockDropdownOpen && blockInput.trim().length > 0 && autocompleteBlocks.length > 0 && (
                  <div className="absolute top-full left-0 w-[calc(100vw-36px)] sm:w-80 max-w-sm mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[2500] max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Matching Blocks ({autocompleteBlocks.length})</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsAutocompleteOpen(false);
                        }}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                        title="Close suggestions"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {autocompleteBlocks.map((blk) => {
                      const meta = BLOCK_METADATA[blk.toUpperCase()] || BLOCK_METADATA[blk];
                      const sector = getSectorForBlock(blk);
                      return (
                        <div
                          key={blk}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedBlock(blk);
                            setBlockInput(blk);
                            setIsAutocompleteOpen(false);
                            setIsBlockDropdownOpen(false);
                            flyToBlock(blk);
                          }}
                          onClick={() => {
                            setSelectedBlock(blk);
                            setBlockInput(blk);
                            setIsAutocompleteOpen(false);
                            setIsBlockDropdownOpen(false);
                            flyToBlock(blk);
                          }}
                          className="px-3 py-2 text-xs font-semibold cursor-pointer border-b border-slate-100 hover:bg-amber-50 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#bd8b2e]" />
                            <span className="text-[#132b4f] font-bold sm:hidden">{blk}</span>
                            <span className="text-[#132b4f] font-bold hidden sm:inline">Block {blk}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              sector === 'Jinnah Sector'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300/60'
                            }`}>
                              {sector}
                            </span>
                          </div>
                          {meta && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {meta.count} plots
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full Categorized Dropdown Menu (Opened ONLY when clicking arrow) */}
                {isBlockDropdownOpen && (
                  <div className="absolute top-full left-0 w-[calc(100vw-36px)] sm:w-80 max-w-sm mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[2500] max-h-80 overflow-y-auto p-2">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#132b4f]">
                        SELECT BLOCK (SECTORS)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsBlockDropdownOpen(false)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                        title="Close block selector"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Section 1: Jinnah Sector */}
                    <div className="mb-2.5">
                      <div className="px-2 py-1 bg-amber-50 rounded-lg text-[10px] font-black uppercase text-amber-900 flex items-center justify-between mb-1 border border-amber-200/60">
                        <span>🌟 Jinnah Sector</span>
                        <span className="text-[9px] text-amber-700 font-normal">Blocks A–Q, A1, B1, G1, CBD</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 px-1">
                        {jinnahBlocks.map((blk) => {
                          const meta = BLOCK_METADATA[blk.toUpperCase()] || BLOCK_METADATA[blk];
                          const isSel = selectedBlock === blk;
                          return (
                            <button
                              key={blk}
                              type="button"
                              onClick={() => {
                                setSelectedBlock(blk);
                                setBlockInput(blk);
                                setIsBlockDropdownOpen(false);
                                setIsAutocompleteOpen(false);
                                flyToBlock(blk);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between border cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-[#132b4f] text-white border-[#132b4f] shadow-sm'
                                  : 'bg-slate-50 hover:bg-amber-100/60 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span className="font-bold sm:hidden">{blk}</span>
                              <span className="font-bold hidden sm:inline">Block {blk}</span>
                              {meta && (
                                <span className={`text-[9px] font-mono ${isSel ? 'text-amber-300' : 'text-slate-400'}`}>
                                  {meta.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Iqbal Sector */}
                    <div className="mb-2">
                      <div className="px-2 py-1 bg-emerald-50 rounded-lg text-[10px] font-black uppercase text-emerald-900 flex items-center justify-between mb-1 border border-emerald-200/60">
                        <span>🏛️ Iqbal Sector</span>
                        <span className="text-[9px] text-emerald-700 font-normal">Blocks AA, BB, CC (3 Blocks)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 px-1">
                        {iqbalBlocks.map((blk) => {
                          const meta = BLOCK_METADATA[blk.toUpperCase()] || BLOCK_METADATA[blk];
                          const isSel = selectedBlock === blk;
                          return (
                            <button
                              key={blk}
                              type="button"
                              onClick={() => {
                                setSelectedBlock(blk);
                                setBlockInput(blk);
                                setIsBlockDropdownOpen(false);
                                setIsAutocompleteOpen(false);
                                flyToBlock(blk);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between border cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-[#132b4f] text-white border-[#132b4f] shadow-sm'
                                  : 'bg-slate-50 hover:bg-emerald-100/60 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span className="font-bold sm:hidden">{blk}</span>
                              <span className="font-bold hidden sm:inline">Block {blk}</span>
                              {meta && (
                                <span className={`text-[9px] font-mono ${isSel ? 'text-emerald-300' : 'text-slate-400'}`}>
                                  {meta.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: All Blocks Option */}
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBlock('All');
                          setBlockInput('');
                          setIsBlockDropdownOpen(false);
                          setIsAutocompleteOpen(false);
                          safeFlyTo(LDA_CITY_CENTER, 14);
                          setSearchNotification('Showing All Blocks of LDA City');
                        }}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold text-center border cursor-pointer transition-all ${
                          selectedBlock === 'All'
                            ? 'bg-[#132b4f] text-white border-[#132b4f]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        Show All Blocks
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 3: Plot # Input - Generous Open Width */}
              <div className="relative w-24 sm:w-32 shrink-0">
                <input
                  type="text"
                  placeholder="Plot #"
                  value={searchPlot}
                  onChange={(e) => setSearchPlot(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#132b4f] placeholder:text-slate-400 focus:outline-none focus:border-[#D4AF37] focus:bg-white transition-all pr-5"
                />
                {searchPlot && (
                  <button
                    type="button"
                    onClick={() => setSearchPlot('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear plot search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Search Submit Button */}
              <button
                type="submit"
                className="h-8 px-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 font-black rounded-lg text-xs transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 flex items-center gap-1"
                title="Search Plot in Block"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Search</span>
              </button>

              {/* Action Buttons: Directory & Fullscreen Toggle (No Duplicates) */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Directory Button */}
                <button
                  type="button"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="h-8 w-8 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200 shrink-0"
                  title="Plot Directory"
                >
                  {showSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* PC View: Horizontal Master Transparency Bar (Placed alongside top bar controls) */}
              <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-200 shrink-0">
                <div className="flex items-center gap-1 text-[#132b4f] shrink-0 font-bold text-[11px]" title="Cadastral Overlay Transparency">
                  <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="hidden lg:inline text-[11px] font-extrabold text-[#132b4f]">Transparency:</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tileOpacity}
                  onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                  className="w-16 lg:w-24 h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-[#D4AF37]"
                  title={`Master Cadastral Transparency: ${Math.round(tileOpacity * 100)}%`}
                />
                <span className="text-[11px] font-mono font-bold text-slate-800 min-w-[32px] text-right">
                  {Math.round(tileOpacity * 100)}%
                </span>

                {/* Quick Opacity Presets for Desktop */}
                <div className="hidden xl:flex items-center gap-1 pl-1">
                  {[
                    { label: '50%', val: 0.5 },
                    { label: '85%', val: 0.85 },
                    { label: '100%', val: 1.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setTileOpacity(preset.val)}
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold cursor-pointer transition-colors ${
                        Math.abs(tileOpacity - preset.val) < 0.05
                          ? 'bg-[#D4AF37] text-slate-950 font-black shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                      title={`Set transparency to ${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Floating Auto-Dismiss Notification Pill with Dismiss X button */}
          {searchNotification && (
            <div className="absolute top-12 sm:top-14 left-2 sm:left-3 z-[1250] transition-opacity duration-300 max-w-[calc(100vw-70px)] sm:max-w-md pointer-events-auto">
              <div
                className={`backdrop-blur-md text-[11px] font-bold px-2.5 py-1.5 rounded-full shadow-xl flex items-center justify-between gap-2 border ${
                  searchNotification.includes('❌') || searchNotification.includes('Error') || searchNotification.includes('not found')
                    ? 'bg-rose-950/95 text-rose-200 border-rose-500/60 shadow-rose-950/50'
                    : 'bg-[#0b1b36]/95 text-amber-300 border-amber-400/40 shadow-black/50'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      searchNotification.includes('❌') || searchNotification.includes('Error') || searchNotification.includes('not found')
                        ? 'bg-rose-400 animate-pulse'
                        : 'bg-amber-400 animate-ping'
                    }`}
                  />
                  <span className="truncate">{searchNotification}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchNotification(null)}
                  className="p-0.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white cursor-pointer shrink-0 ml-1 transition-colors"
                  title="Dismiss notification"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

        {/* 
          ====================================================================
          INTERACTIVE CURSOR ROUTE & DISTANCE MEASUREMENT BANNER
          Matches user requirement:
          "bhai dakho is ma aisa system lagaou aik jis per ma click kru to mery 
          current location se aik line ka saath aik cursuer attach ho jay. or ma 
          usy jis plot ka upe rrakho us tk ka route ban jay or us se distance ajay"
          ====================================================================
        */}
        {isMeasureMode && (
          <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[2400] bg-cyan-950/95 border-2 border-cyan-400 text-white rounded-2xl px-3 sm:px-3.5 py-2 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2.5 animate-fade-in pointer-events-auto w-[94vw] max-w-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0 text-cyan-300">
                <Crosshair className="w-4 h-4 animate-spin" />
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-black text-cyan-300 flex items-center gap-1.5">
                  <span>Interactive Route & Distance Tool</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                </div>
                <div className="text-[11px] text-cyan-100/90 truncate mt-0.5">
                  {measureState?.locked 
                    ? `Route Locked: ${measureState.distMeters >= 1000 ? (measureState.distMeters / 1000).toFixed(2) + ' km' : Math.round(measureState.distMeters) + ' m'}. Click again to re-measure.`
                    : 'Move cursor over any plot to see dynamic line & distance. Click plot to lock.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMeasureMode(false)}
              className="p-1.5 bg-cyan-900/80 text-cyan-200 hover:text-white hover:bg-cyan-800 rounded-lg cursor-pointer shrink-0 transition-colors"
              title="Close Measure Tool"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating Active Direct Route Banner with Instant Clear Route Button */}
        {activeRouteInfo && (
          <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[2500] bg-[#0b1b36]/95 border-2 border-emerald-400 text-white rounded-2xl px-3 sm:px-3.5 py-2 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2.5 animate-fade-in pointer-events-auto w-[94vw] max-w-md">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0 text-emerald-300">
                <Route className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-black text-emerald-300 flex items-center gap-1.5 truncate">
                  <span>Direct Route</span>
                  <span className="text-[10px] text-emerald-200/90 font-mono">({activeRouteInfo.distanceKm} km • ~{activeRouteInfo.durationMinutes} min)</span>
                </div>
                <div className="text-[10px] text-slate-200 truncate flex items-center gap-1">
                  <span>{activeRouteInfo.originLabel}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-amber-300 font-bold">{activeRouteInfo.destLabel}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearRoute}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-md active:scale-95"
              title="Clear Route"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {/* Floating Plot Pinpoint Adjustment Mode Banner */}
        {isPlotCalibrationMode && (
          <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[2600] bg-purple-950/95 text-white px-3 sm:px-4 py-2 rounded-2xl border-2 border-purple-400 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2.5 animate-pulse pointer-events-auto w-[94vw] max-w-md">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
              <span className="text-xs font-bold tracking-wide truncate">
                🎯 Map par Plot #{targetPlotInfo?.plotNumber || ''} ki location par click karein
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPlotCalibrationMode(false)}
              className="p-1 rounded-lg bg-purple-800 hover:bg-purple-700 text-white cursor-pointer shrink-0 transition-colors"
              title="Cancel Pin Adjustment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}



        {/* Admin Password Modal for Exact Plot GPS Calibration & Pin Adjustment */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-[3500] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-[#0b1b36] border-2 border-amber-400 rounded-2xl p-4 sm:p-5 w-full max-w-sm text-white shadow-2xl animate-fade-in pointer-events-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-300">Admin Authorization</h3>
                    <p className="text-[10px] text-slate-300">
                      {pendingCalibrationAction === 'modal' ? 'Exact Plot GPS Calibration' : 'Plot Pin Adjustment Access'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setPasswordInput('');
                  }}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-colors"
                  title="Close Dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleVerifyAdminPassword} className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {pendingCalibrationAction === 'modal'
                    ? 'Exact Plot GPS Calibration formula aur zameen offsets update karne ke liye password enter karein:'
                    : 'Plot ki exact location aur pinpoint adjust karne ke liye password enter karein:'}
                </p>

                <div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter admin password..."
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono tracking-wider"
                  />
                  {passwordError && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordError('');
                      setPasswordInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock Access</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 
          ====================================================================
          EXACT GPS CALIBRATION MODAL (FORMULA: Lat B - Lat A, Lng B - Lng A)
          Protected by Admin Authorization
          ====================================================================
        */}
        {showCalibrationModal && (
          <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto bottom-14 sm:bottom-20 sm:right-14 z-[2600] w-auto sm:w-[380px] max-h-[78vh] overflow-y-auto bg-[#0b1b36]/95 border-2 border-amber-400/90 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md text-white animate-fade-in pointer-events-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700 mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                      Exact Plot GPS Calibration
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                      🔓 Authorized
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono">
                    ΔLat = Lat B - Lat A | ΔLng = Lng B - Lng A
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminUnlocked(false);
                    setShowCalibrationModal(false);
                    setIsPlotCalibrationMode(false);
                    setSearchNotification('🔒 GPS Calibration Locked');
                  }}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-lg cursor-pointer transition-colors"
                  title="Lock GPS Calibration"
                >
                  <Lock className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalibrationModal(false)}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-colors"
                  title="Close Dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-700/60 mb-3">
              <button
                type="button"
                onClick={() => setCalibrationTab('formula')}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  calibrationTab === 'formula'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎯 2-Point GPS Formula
              </button>
              <button
                type="button"
                onClick={() => setCalibrationTab('nudge')}
                className={`py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                  calibrationTab === 'nudge'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🕹️ 1-Plot Quick Nudge
              </button>
            </div>

            {calibrationTab === 'formula' ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold">Asli Zameen Formula:</span> Zameen par khare ho kar apna GPS note karein (Point A) aur map par jahan plot dikh raha hai wahan Pin Drop karein (Point B). Farq nikal kar exact alignment apply karein.
                </p>

                {/* Point A: Zameen Ka Asli GPS */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Point A (Zameen Ka Asli GPS)
                    </span>
                    <button
                      type="button"
                      onClick={handleGetDeviceGps}
                      className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-md cursor-pointer transition-colors"
                    >
                      📍 Use Phone GPS
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Lat A</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="31.350357"
                        value={gpsPointA?.lat ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGpsPointA((prev) => ({
                            lat: isNaN(val) ? 0 : val,
                            lng: prev?.lng ?? 74.343000,
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Lng A</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="74.343018"
                        value={gpsPointA?.lng ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGpsPointA((prev) => ({
                            lat: prev?.lat ?? 31.350000,
                            lng: isNaN(val) ? 0 : val,
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Point B: Map Par Plot Ka Pin Drop */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-purple-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-purple-300 flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5 text-purple-400" />
                      Point B (Map Plot Pin Drop)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleUseSearchedPlotForB}
                        className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 cursor-pointer"
                        title="Use coordinates of current searched plot"
                      >
                        Active Plot
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPinDropMode(!isPinDropMode)}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          isPinDropMode
                            ? 'bg-purple-600 text-white border-purple-300 animate-pulse'
                            : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-400/50'
                        }`}
                      >
                        {isPinDropMode ? 'Click Map Now...' : '🎯 Drop Pin On Map'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Lat B</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="31.350387"
                        value={gpsPointB?.lat ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGpsPointB((prev) => ({
                            lat: isNaN(val) ? 0 : val,
                            lng: prev?.lng ?? 74.342883,
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] font-mono text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Lng B</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="74.342883"
                        value={gpsPointB?.lng ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGpsPointB((prev) => ({
                            lat: prev?.lat ?? 31.350000,
                            lng: isNaN(val) ? 0 : val,
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] font-mono text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation / Offset Output */}
                {gpsPointA && gpsPointB && (
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-400/50 text-[11px] space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-amber-300 font-bold border-b border-slate-800 pb-1">
                      <span>Formula Calculation:</span>
                      <span className="text-[10px] text-slate-400 font-sans">Lat B - Lat A</span>
                    </div>
                    {(() => {
                      const diff = calculateGpsOffsetDifference(gpsPointA.lat, gpsPointA.lng, gpsPointB.lat, gpsPointB.lng);
                      return (
                        <>
                          <div className="flex justify-between text-slate-300">
                            <span>ΔLat Offset:</span>
                            <span className="font-bold text-amber-400">
                              {diff.latOffset >= 0 ? `+${diff.latOffset.toFixed(6)}` : diff.latOffset.toFixed(6)}°
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({diff.latFeet >= 0 ? `+${diff.latFeet.toFixed(1)}ft` : `${diff.latFeet.toFixed(1)}ft`} N/S)
                              </span>
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>ΔLng Offset:</span>
                            <span className="font-bold text-amber-400">
                              {diff.lngOffset >= 0 ? `+${diff.lngOffset.toFixed(6)}` : diff.lngOffset.toFixed(6)}°
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({diff.lngFeet >= 0 ? `+${diff.lngFeet.toFixed(1)}ft` : `${diff.lngFeet.toFixed(1)}ft`} E/W)
                              </span>
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1 text-[10px]">
                            <span>Ground Shift:</span>
                            <span className="text-cyan-300 font-bold">
                              {diff.totalMeters.toFixed(1)}m ({diff.totalFeet.toFixed(1)} ft) • ~{diff.approxPlotsShift.toFixed(1)} plots
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={handleApplyGpsCalibration}
                  disabled={!gpsPointA || !gpsPointB}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 text-xs font-black rounded-xl shadow-lg cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Apply Exact Calibration & Align</span>
                </button>
              </div>
            ) : (
              /* Nudge Tab */
              <div>
                <p className="text-[11px] text-slate-300 leading-snug mb-3">
                  Nudge plot markers by 1 plot width (~35 feet / 10.6m) to align with cadastral lines:
                </p>
                {/* Directional Pad */}
                <div className="flex flex-col items-center gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => handleNudge(0.00010, 0)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Nudge North (+1 Plot ~36ft)"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>North (+11m / 36ft)</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleNudge(0, -0.00010)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Nudge West (-1 Plot ~31ft)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>West (-9.5m)</span>
                    </button>
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/50 flex flex-col items-center justify-center text-[9px] font-black text-amber-300">
                      <span>1P</span>
                      <span className="text-[7px] text-slate-400">~35ft</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNudge(0, 0.00010)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Nudge East (+1 Plot ~31ft)"
                    >
                      <span>East (+9.5m)</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNudge(-0.00010, 0)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Nudge South (-1 Plot ~36ft)"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>South (-11m / 36ft)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Current Active Offsets & Reset */}
            <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-2">
              <div className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <span>Lat Offset: {calibratedOffsets.latOffset >= 0 ? `+${calibratedOffsets.latOffset.toFixed(6)}` : calibratedOffsets.latOffset.toFixed(6)}</span>
                <span>Lng Offset: {calibratedOffsets.lngOffset >= 0 ? `+${calibratedOffsets.lngOffset.toFixed(6)}` : calibratedOffsets.lngOffset.toFixed(6)}</span>
              </div>
              <button
                type="button"
                onClick={handleResetCalibration}
                className="w-full py-1 text-center text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
              >
                Reset to Standard Baseline (0.015178, -0.073888)
              </button>
            </div>
          </div>
        )}

        {/* 
          ====================================================================
          SIMPLE FREELY MOVING SCREEN ARROW POINTING TO PLOT
          Matches user requirement:
          "or phir BLOCK deading jo top per aati ha yaeh nahi iske jagah simple arrow 
          hona chiaye. jo freely pori screen per move kra. or plot ki traf ishara kra."
          ====================================================================
        */}
        {screenArrowPos && targetPlotLocation && (
          <button
            type="button"
            onClick={() => safeFlyTo(targetPlotLocation, 19)}
            style={{
              left: `${screenArrowPos.x}px`,
              top: `${screenArrowPos.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-[1250] cursor-pointer group pointer-events-auto transition-transform duration-100 ease-out animate-fade-in"
            title={`Plot #${screenArrowPos.plotNumber} • ${screenArrowPos.distMeters >= 1000 ? (screenArrowPos.distMeters / 1000).toFixed(1) + ' km' : screenArrowPos.distMeters + ' m'}. Click to fly to plot.`}
          >
            <div className="flex items-center gap-1.5 bg-[#0b1b36]/95 hover:bg-[#132b4f] border-2 border-red-500 hover:border-amber-400 text-white pl-1.5 pr-2.5 py-1 rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all hover:scale-110 active:scale-95">
              {/* Freely-Rotating Red Compass Needle */}
              <div 
                style={{ transform: `rotate(${screenArrowPos.angleDeg}deg)` }}
                className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-md transition-transform duration-150 ease-out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" strokeWidth="1" className="w-4 h-4 drop-shadow">
                  <path d="M12 2L20 21L12 17L4 21L12 2Z" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-black leading-none">
                <span className="text-amber-300">Plot #{screenArrowPos.plotNumber}</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  {screenArrowPos.distMeters >= 1000
                    ? `${(screenArrowPos.distMeters / 1000).toFixed(1)}km`
                    : `${screenArrowPos.distMeters}m`}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Sleek Floating Instruction Tip when Editor is Active */}
        {isEditorOpen && (
          <div className="absolute top-2.5 sm:top-3.5 right-12 sm:right-14 z-[1200] pointer-events-none animate-in fade-in slide-in-from-right duration-200">
            <div className="bg-[#0B132B]/95 text-white border border-red-500/80 rounded-xl px-2.5 py-1 text-[11px] font-bold shadow-xl flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>
                {activeEditorTool === 'arrow' && '➔ Arrow: Click Start Point, then Target'}
                {activeEditorTool === 'box' && '▢ Box: Click First Corner, then Opposite Corner'}
                {activeEditorTool === 'text' && '✎ Text: Click on Map to Add Note'}
                {activeEditorTool === 'draw' && '✏️ Draw: Drag on Map to Sketch'}
              </span>
            </div>
          </div>
        )}

        {/* Text Input Modal for Map Annotations */}
        {textInputModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div 
              className="bg-[#0B132B] border border-[#D4AF37] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                    <Type className="w-4 h-4" />
                  </div>
                  <h4 className="text-white text-sm font-black font-sans">
                    Add Map Label / Note
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setTextInputModal(null)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Plot Description or Note:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={textInputModal.text}
                  onChange={(e) => setTextInputModal({ ...textInputModal, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTextAnnotation();
                  }}
                  placeholder="e.g. Corner Plot, 10 Marla, Deal Done..."
                  className="w-full bg-[#1C2541] border border-slate-700 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Quick Preset Tags */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1">
                  {['Corner Plot', '5 Marla', '10 Marla', '1 Kanal', 'Main Boulevard', 'Park Facing', 'Deal Done', 'My Plot'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTextInputModal({ ...textInputModal, text: tag })}
                      className="px-2 py-0.5 bg-[#1C2541] hover:bg-[#D4AF37]/20 border border-slate-700 hover:border-[#D4AF37] text-[10.5px] text-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTextInputModal(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTextAnnotation}
                  disabled={!textInputModal.text.trim()}
                  className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow transition-colors"
                >
                  Pin to Map
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 
          ====================================================================
          SLEEK COMPACT RIGHT CONTROLS DOCK (Mobile & PC Responsive, No Collapsing)
          - When Pencil (Editor) is active: other options hide, and editor tools
            (Arrow, Box, Text, Draw, Colors, Undo, Clear, Close) appear directly beneath.
          - When Editor is closed: regular options (Navigation, Route, Calibration, Fullscreen, Slider) appear.
          ====================================================================
        */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-[1200] flex flex-col items-center gap-1.5 pointer-events-auto max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar">
          
          {/* 1. Map Markup / Annotation Editor Toggle Button (Pencil Icon) */}
          <button
            type="button"
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
              isEditorOpen 
                ? 'bg-red-500 text-white font-black border-red-400 ring-2 ring-red-300 shadow-red-500/50' 
                : 'bg-white/95 backdrop-blur-md text-slate-800 hover:text-red-600 hover:bg-red-50 border-slate-200'
            }`}
            title={isEditorOpen ? "Close Editor (Return to Map Options)" : "Open Map Markup Editor (Arrows, Boxes, Text, Draw)"}
          >
            {isEditorOpen ? <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Pencil className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
          </button>

          {isEditorOpen ? (
            /* 
              ============================================================
              EDITOR PROPERTIES & TOOLS (Rendered directly below pencil)
              All other controls are hidden while editor is open
              ============================================================
            */
            <div className="flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              
              {/* Tool 1: Arrow */}
              <button
                type="button"
                onClick={() => setActiveEditorTool('arrow')}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
                  activeEditorTool === 'arrow'
                    ? 'bg-red-500 text-white font-black border-red-400 ring-2 ring-red-300 shadow-red-500/50'
                    : 'bg-white/95 backdrop-blur-md text-slate-800 hover:text-red-600 hover:bg-red-50 border-slate-200'
                }`}
                title="Arrow Tool: Click start point then target point"
              >
                <ArrowUpRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Tool 2: Box / Rectangle */}
              <button
                type="button"
                onClick={() => setActiveEditorTool('box')}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
                  activeEditorTool === 'box'
                    ? 'bg-red-500 text-white font-black border-red-400 ring-2 ring-red-300 shadow-red-500/50'
                    : 'bg-white/95 backdrop-blur-md text-slate-800 hover:text-red-600 hover:bg-red-50 border-slate-200'
                }`}
                title="Box Tool: Click 2 opposite corners to draw rectangle highlight"
              >
                <Square className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Tool 3: Text Label */}
              <button
                type="button"
                onClick={() => setActiveEditorTool('text')}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
                  activeEditorTool === 'text'
                    ? 'bg-red-500 text-white font-black border-red-400 ring-2 ring-red-300 shadow-red-500/50'
                    : 'bg-white/95 backdrop-blur-md text-slate-800 hover:text-red-600 hover:bg-red-50 border-slate-200'
                }`}
                title="Text Tool: Click any point on map to attach label"
              >
                <Type className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Tool 4: Freehand Draw */}
              <button
                type="button"
                onClick={() => setActiveEditorTool('draw')}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
                  activeEditorTool === 'draw'
                    ? 'bg-red-500 text-white font-black border-red-400 ring-2 ring-red-300 shadow-red-500/50'
                    : 'bg-white/95 backdrop-blur-md text-slate-800 hover:text-red-600 hover:bg-red-50 border-slate-200'
                }`}
                title="Draw Tool: Drag mouse/touch to sketch curves"
              >
                <Pencil className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Mini Divider */}
              <div className="w-6 h-[1px] bg-slate-300 dark:bg-slate-700 my-0.5" />

              {/* Color Palette (Vertical stack of 5 color chips with Red as default) */}
              <div className="flex flex-col items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm">
                {[
                  { name: 'Red', hex: '#EF4444' },
                  { name: 'White', hex: '#FFFFFF' },
                  { name: 'Gold', hex: '#D4AF37' },
                  { name: 'Sky Blue', hex: '#38BDF8' },
                  { name: 'Emerald', hex: '#10B981' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setEditorColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${
                      editorColor === c.hex
                        ? 'scale-125 border-slate-900 ring-2 ring-red-400 shadow-md'
                        : 'border-slate-300 hover:scale-110 opacity-80'
                    }`}
                    title={`Color: ${c.name}`}
                  />
                ))}
              </div>

              {/* Mini Divider */}
              <div className="w-6 h-[1px] bg-slate-300 dark:bg-slate-700 my-0.5" />

              {/* Undo Button */}
              <button
                type="button"
                onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
                disabled={annotations.length === 0}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-md text-slate-700 hover:text-slate-950 disabled:opacity-30 shadow-md border border-slate-200 transition-all cursor-pointer"
                title="Undo last annotation"
              >
                <Undo2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Clear All Button */}
              <button
                type="button"
                onClick={() => setAnnotations([])}
                disabled={annotations.length === 0}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-30 shadow-md border border-rose-200 transition-all cursor-pointer"
                title="Clear all annotations"
              >
                <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>
          ) : (
            /* 
              ============================================================
              REGULAR CONTROLS (Shown when Editor is closed)
              ============================================================
            */
            <>
              {/* 1. Reset Map Search & Highlights Button (Moved from top bar to right dock as requested) */}
              <button
                type="button"
                onClick={handleResetAllSearch}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer bg-white/95 backdrop-blur-md text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-slate-200 active:scale-95"
                title="Reset search inputs, plot highlights and route"
              >
                <RotateCcw className="w-4 h-4 text-slate-700" />
              </button>

              {/* 2. Live Navigation / Exact GPS Tracking Button */}
              <button
                type="button"
                onClick={toggleLiveLocation}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
                  isLiveTracking
                    ? 'bg-blue-600 text-white animate-pulse border-blue-400'
                    : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-blue-50 border-slate-200'
                }`}
                title={isLiveTracking ? 'Live GPS Active' : 'Start Live GPS Navigation'}
              >
                <Navigation className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* 3. Direct Route Button */}
              <button
                type="button"
                onClick={() => {
                  if (targetPlotLocation || selectedPlot || activeCadastralPlot) {
                    handleDrawDirectRoute();
                  } else {
                    setIsMeasureMode(!isMeasureMode);
                  }
                }}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
                  activeRouteInfo
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/50 animate-pulse'
                    : isMeasureMode
                    ? 'bg-cyan-500 text-white animate-pulse border-cyan-300 shadow-cyan-500/50'
                    : 'bg-white/95 backdrop-blur-md text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200'
                }`}
                title={
                  activeRouteInfo
                    ? 'Direct Route Active (Click to Redraw)'
                    : 'Direct Route: Draw route from My Location to Plot'
                }
              >
                <Route className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* 3.5. 3D Dragon Mascot & Guide Toggle Button (Default ON on first open; toggleable from right toolbar) */}
              {/* User: "just jo ma eagle liiye chahta tha mana wo dragon ma convert krwa dia... just eagle ko badal kr dragon ma convert kr do" */}
              <button
                type="button"
                onClick={handleToggleDragonMascot}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer relative ${
                  isDragonEnabled
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-amber-500/50 ring-2 ring-amber-400/30'
                    : 'bg-white/95 backdrop-blur-md text-slate-700 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                }`}
                title={
                  isDragonEnabled
                    ? '🐉 3D Dragon Guide: ACTIVE (Click to toggle Off)'
                    : '🐉 3D Dragon Guide: OFF (Click to toggle On)'
                }
              >
                <span className="text-base select-none" role="img" aria-label="Dragon">🐉</span>
                {isDragonEnabled && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold">
                    ✓
                  </span>
                )}
              </button>

              {/* 3.6. Dragon Flame Breath & Roar Trigger */}
              {isDragonEnabled && (
                <button
                  type="button"
                  onClick={handleTriggerDragonRoar}
                  className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border border-orange-500/60 bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 text-white font-black hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="🔥 Unleash Dragon Roar & Flame Breath!"
                >
                  <span className="text-sm select-none" role="img" aria-label="Flame">🔥</span>
                </button>
              )}

              {/* 4. Exact Plot GPS Calibration & Pin Adjustment Button (Protected Admin Action) */}
              <button
                type="button"
                onClick={() => {
                  if (targetPlotInfo) {
                    handleRequestAdjustPin();
                  } else {
                    handleRequestCalibrationModal();
                  }
                }}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer relative ${
                  isPlotCalibrationMode
                    ? 'bg-purple-600 text-white animate-pulse border-purple-400 shadow-purple-500/50'
                    : showCalibrationModal
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-300'
                    : isAdminUnlocked
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white/95 backdrop-blur-md text-purple-700 hover:text-purple-900 hover:bg-purple-50 border-slate-200'
                }`}
                title={
                  !isAdminUnlocked
                    ? 'Exact Plot GPS Calibration (Admin Only)'
                    : isPlotCalibrationMode
                    ? 'Adjust Pin Mode Active: Click map to place pinpoint'
                    : targetPlotInfo
                    ? `Adjust Pin for Plot #${targetPlotInfo.plotNumber}`
                    : 'Exact Plot GPS Calibration Unlocked'
                }
              >
                <Crosshair className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isPlotCalibrationMode ? 'animate-spin' : ''}`} />
                {!isAdminUnlocked && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center text-[7.5px] font-black border border-white shadow">
                    🔒
                  </span>
                )}
              </button>

              {/* 5. Toggle Fullscreen (100%) vs 80% Screen Size (Only ONE Fullscreen toggle on map) */}
              <button
                type="button"
                onClick={() => setIsFullScreenMap(!isFullScreenMap)}
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg shadow-md border transition-all cursor-pointer ${
                  isFullScreenMap 
                    ? 'bg-amber-400 text-slate-950 border-amber-500' 
                    : 'bg-white/95 backdrop-blur-md text-slate-700 hover:text-slate-900 border-slate-200'
                }`}
                title={isFullScreenMap ? "Switch to 80% Screen Size" : "Full Screen View (100%)"}
              >
                {isFullScreenMap ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* Mobile View: Master Transparency Slider positioned directly below icons in the right panel */}
              <div 
                className="md:hidden flex flex-col items-center bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200 mt-1 pointer-events-auto w-8 sm:w-9 shrink-0"
                title={`Master Transparency: ${Math.round(tileOpacity * 100)}%`}
              >
                <Sliders className="w-3.5 h-3.5 text-[#D4AF37] mb-1" />
                <div className="h-16 flex items-center justify-center my-0.5">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={tileOpacity}
                    onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                    className="accent-[#D4AF37] cursor-pointer h-14 w-1.5 bg-slate-200 rounded appearance-none [writing-mode:vertical-lr] [direction:rtl]"
                    title={`Master Transparency: ${Math.round(tileOpacity * 100)}%`}
                  />
                </div>
                <span className="text-[8px] font-black text-slate-700 mt-0.5 font-mono">
                  {Math.round(tileOpacity * 100)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* The Leaflet Map Canvas */}
        <div className="w-full h-full overflow-hidden relative">
          <div
            ref={mapContainerRef}
            className="w-full h-full bg-[#0B132B]"
          />
        </div>

        {/* 
          ========================================================================
          MAP LAYER SWITCHER & DIRECT WHATSAPP CONTACT (Bottom-Left Corner)
          User requirement:
          "map layers ka icon ko bottum per la aou. ya uske niche whatsapp ka icon da do. 
          taake mujh se contact kr skain wo ."
          ========================================================================
        */}
        {!cleanView && isDedicatedView && (
          <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-[1200] pointer-events-auto flex flex-col items-center gap-2">
            {/* Layer Selection Popover Panel (Opens Above the Button) */}
            {showLayerMenu && (
              <div className="absolute bottom-full mb-3 left-0 bg-[#0B132B]/95 border-2 border-[#D4AF37]/80 rounded-2xl p-3 w-64 sm:w-72 shadow-2xl backdrop-blur-xl text-white animate-fade-in pointer-events-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Map Layers &amp; View
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLayerMenu(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Close Layers Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 Layer Options with Miniature Image Previews */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {/* 1. Satellite View */}
                  <button
                    type="button"
                    onClick={() => handleSwitchBaseLayer('satellite')}
                    className={`flex flex-col items-center p-1 rounded-xl border text-center transition-all cursor-pointer group ${
                      baseLayer === 'satellite'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 shadow-md shadow-amber-500/20'
                        : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                    }`}
                  >
                    <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-600 mb-1 relative bg-emerald-950">
                      <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-amber-900 to-slate-900 flex items-center justify-center">
                        <span className="text-xs">🛰️</span>
                      </div>
                      {baseLayer === 'satellite' && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-slate-900 ring-1 ring-emerald-300" />
                      )}
                    </div>
                    <span className={`text-[9px] font-black leading-tight ${baseLayer === 'satellite' ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
                      Satellite
                    </span>
                  </button>

                  {/* 2. Street View */}
                  <button
                    type="button"
                    onClick={() => handleSwitchBaseLayer('street')}
                    className={`flex flex-col items-center p-1 rounded-xl border text-center transition-all cursor-pointer group ${
                      baseLayer === 'street'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 shadow-md shadow-amber-500/20'
                        : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                    }`}
                  >
                    <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-600 mb-1 relative bg-slate-800">
                      <div className="w-full h-full bg-gradient-to-br from-sky-900 via-slate-700 to-amber-950 flex items-center justify-center">
                        <span className="text-xs">🗺️</span>
                      </div>
                      {baseLayer === 'street' && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-slate-900 ring-1 ring-emerald-300" />
                      )}
                    </div>
                    <span className={`text-[9px] font-black leading-tight ${baseLayer === 'street' ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
                      Street
                    </span>
                  </button>

                  {/* 3. Dark View */}
                  <button
                    type="button"
                    onClick={() => handleSwitchBaseLayer('esri-dark')}
                    className={`flex flex-col items-center p-1 rounded-xl border text-center transition-all cursor-pointer group ${
                      baseLayer === 'esri-dark'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 shadow-md shadow-amber-500/20'
                        : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                    }`}
                  >
                    <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-600 mb-1 relative bg-slate-950">
                      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                        <span className="text-xs">🌙</span>
                      </div>
                      {baseLayer === 'esri-dark' && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-slate-900 ring-1 ring-emerald-300" />
                      )}
                    </div>
                    <span className={`text-[9px] font-black leading-tight ${baseLayer === 'esri-dark' ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
                      Dark
                    </span>
                  </button>
                </div>

                {/* Cadastral Layer Opacity Control */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                    <span>Plots Cadastral Opacity</span>
                    <span className="text-amber-300 font-mono">{Math.round(tileOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={tileOpacity}
                    onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                    className="w-full accent-[#D4AF37] h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Miniature Floating Icon-Only Button with Layer Thumbnail (No Text as requested) */}
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="w-11 h-11 p-1 bg-[#0B132B]/95 hover:bg-[#132b4f] text-white rounded-2xl border-2 border-[#D4AF37] shadow-2xl backdrop-blur-md cursor-pointer transition-all active:scale-95 flex items-center justify-center group"
              title="Switch Map Layers (Satellite View, Street View, Dark View)"
            >
              {/* Icon-sized thumbnail image */}
              <div className="w-full h-full rounded-xl overflow-hidden border border-amber-400/80 relative flex items-center justify-center shadow-inner">
                {baseLayer === 'satellite' ? (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-800 via-stone-800 to-slate-900 flex items-center justify-center">
                    <span className="text-sm">🛰️</span>
                  </div>
                ) : baseLayer === 'street' ? (
                  <div className="w-full h-full bg-gradient-to-br from-sky-800 via-slate-600 to-amber-900 flex items-center justify-center">
                    <span className="text-sm">🗺️</span>
                  </div>
                ) : (
                  <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                    <span className="text-sm">🌙</span>
                  </div>
                )}
              </div>
            </button>

            {/* Direct WhatsApp Contact Button right below Map Layers */}
            <a
              href={generateWhatsAppLink(
                '03001535898',
                'Assalam-o-Alaikum, I am exploring LDA City plots on the Geo-Map and would like to contact you regarding available plots and deals.'
              )}
              target="_blank"
              rel="noreferrer"
              className="w-11 h-11 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl shadow-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border-2 border-white/50 group relative"
              title="Chat with us on WhatsApp: 0300 1535898 / 0326 4509700"
            >
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full animate-ping pointer-events-none" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white drop-shadow">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </a>
          </div>
        )}

        {/* Slide-out Plot Directory Drawer (Overlays when toggled) */}
        {showSidebar && (
          <aside
            id="map-plots-sidebar-drawer"
            className="absolute left-0 top-0 bottom-0 z-[1002] w-80 sm:w-96 max-w-[88%] bg-white/98 backdrop-blur-2xl border-r border-slate-200 shadow-2xl flex flex-col transition-all duration-300 text-slate-800"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-[#bd8b2e]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#132b4f]">Plot Directory</h3>
                  <p className="text-[11px] text-[#bd8b2e]">Select any plot to fly on map</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Search & Block Filter */}
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search plot number, size..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Block Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {allBlocks.map((blk) => (
                  <button
                    key={`side-${blk}`}
                    type="button"
                    onClick={() => setSidebarBlock(blk)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      sidebarBlock === blk
                        ? 'bg-[#132b4f] text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {blk === 'All' ? 'All Blocks' : blk}
                  </button>
                ))}
              </div>
            </div>

            {/* Plots List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredSidebarPlots.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No plots match your filter.
                </div>
              ) : (
                filteredSidebarPlots.map((plot) => {
                  const isSelected = selectedPlot?.id === plot.id;
                  return (
                    <div
                      key={plot.id}
                      onClick={() => {
                        onSelectPlot(plot);
                        safeFlyTo(plot.center, 18);
                        setTargetPlotLocation(plot.center);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-[#bd8b2e] shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#132b4f] flex items-center gap-1.5">
                            <span>Plot #{plot.plotNumber}</span>
                            <span className="text-[10px] text-[#bd8b2e] font-normal">
                              ({plot.size})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {plot.sector} • {plot.block}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            plot.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {plot.status}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#bd8b2e]">
                          {formatPKR(plot.price)}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          Fly to map →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 
        ========================================================================
        BOTTOM SECTION: ACTIVE ROUTE DETAILS (When direct route is drawn)
        User: "or jab koi plot ko search krta hn to bottum per aik info tab open ho jata ha 
        block c. 10 marla etc or jis per co ordinates likha hua hota hn isko open nahi hona chiae."
        ========================================================================
      */}
      {!cleanView && activeRouteInfo && (
        <div className={`space-y-2 mt-2 transition-all ${
          isFullScreenMap 
            ? 'fixed bottom-3 left-16 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[3000] sm:w-[96%] max-w-4xl' 
            : 'w-[96%] sm:w-[88%] lg:w-[82%] max-w-7xl'
        }`}>
          {/* Active Route Details (When direct route is drawn) */}
          <div className="bg-white border border-emerald-300 rounded-xl p-3 shadow-md flex items-center justify-between gap-3 text-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                    Direct Route Active
                  </div>
                  <div className="text-xs font-bold text-[#132b4f] flex items-center gap-1.5">
                    <span>{activeRouteInfo.originLabel}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-[#bd8b2e]">{activeRouteInfo.destLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-800 block">
                    {activeRouteInfo.distanceKm} km
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    ~{activeRouteInfo.durationMinutes} mins drive
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearRoute}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Clear Route"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
