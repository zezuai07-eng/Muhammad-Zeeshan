import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createWingFlapAudioBuffer,
  createFireBreathAudioBuffer,
  createDragonRoarAudioBuffer,
  getAudioContext,
} from './utils/audioSynthesis';

export interface DragonOverlayProps {
  targetPopupRect: DOMRect | { left: number; top: number; right: number; width?: number; height?: number } | null;
  modelPath?: string;
  zIndex?: number;
  muted?: boolean;
  onDragonStateChange?: (state: DragonActionState) => void;
  allowPatrolWhenIdle?: boolean;
}

export type DragonActionState =
  | 'PATROL_ORBIT'
  | 'FLYING_TO_POPUP'
  | 'LANDED_IDLE'
  | 'WALKING_TO_TOP_RIGHT'
  | 'PERCHED_RIGHT'
  | 'TAKING_OFF';

interface ParticleData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const PARTICLE_COUNT = 340;

export const DragonOverlay: React.FC<DragonOverlayProps> = ({
  targetPopupRect,
  modelPath = '/models/dragon.glb',
  zIndex = 2500,
  muted = false,
  onDragonStateChange,
  allowPatrolWhenIdle = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const dragonRootRef = useRef<THREE.Group | null>(null);
  const headNodeRef = useRef<THREE.Object3D | null>(null);
  const fireParticlesRef = useRef<THREE.Points | null>(null);
  const fireLightRef = useRef<THREE.PointLight | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // 3D Spatial Audio References
  const audioListenerRef = useRef<THREE.AudioListener | null>(null);
  const wingFlapAudioRef = useRef<THREE.PositionalAudio | null>(null);
  const fireAudioRef = useRef<THREE.PositionalAudio | null>(null);
  const roarAudioRef = useRef<THREE.PositionalAudio | null>(null);
  const lastFlapTimeRef = useRef<number>(0);
  const mutedRef = useRef<boolean>(muted);

  useEffect(() => {
    mutedRef.current = muted;
    if (audioListenerRef.current) {
      audioListenerRef.current.setMasterVolume(muted ? 0 : 1);
    }
  }, [muted]);

  // Movement & State references
  const dragonStateRef = useRef<DragonActionState>('PATROL_ORBIT');
  const targetWorldPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 4.5, 0));
  const startWalkPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const endWalkPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const walkProgressRef = useRef<number>(0);
  const walkTimerRef = useRef<number | null>(null);
  const particlesDataRef = useRef<ParticleData[]>([]);
  const isFireForcedRef = useRef<boolean>(false);
  const forcedFireTimerRef = useRef<number | null>(null);

  const actionsRef = useRef<{
    fly: THREE.AnimationAction | null;
    flap: THREE.AnimationAction | null;
    idle: THREE.AnimationAction | null;
    walk: THREE.AnimationAction | null;
    takeoff: THREE.AnimationAction | null;
  }>({ fly: null, flap: null, idle: null, walk: null, takeoff: null });
  const currentActionNameRef = useRef<string | null>(null);

  const setDragonState = (newState: DragonActionState) => {
    dragonStateRef.current = newState;
    if (onDragonStateChange) {
      onDragonStateChange(newState);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 1. AudioListener attached to camera
    const ctx = getAudioContext();
    const listener = new THREE.AudioListener();
    // @ts-expect-error Three.js allows assigning existing context
    listener.context = ctx;
    camera.add(listener);
    audioListenerRef.current = listener;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Lighting (Warm amber highlights matching luxury PropTech gold accents)
    scene.add(new THREE.AmbientLight(0xfff8ee, 1.6));
    const dirLight1 = new THREE.DirectionalLight(0xffd580, 2.8);
    dirLight1.position.set(12, 16, 12);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 1.4);
    dirLight2.position.set(-12, -6, 10);
    scene.add(dirLight2);

    const fireLight = new THREE.PointLight(0xff5500, 0, 10);
    scene.add(fireLight);
    fireLightRef.current = fireLight;

    const firePoints = createFireParticleSystem();
    scene.add(firePoints);
    fireParticlesRef.current = firePoints;

    particlesDataRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: 9999,
      y: 9999,
      z: 9999,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 1.0,
      maxLife: 0.6 + Math.random() * 0.45,
    }));

    // 2. Positional Audio Setup
    setupSpatialAudio(listener);

    // 3. Load Model
    loadModelWithFallback(scene, modelPath);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Global hook to trigger roar & fire on demand
    const handleGlobalRoar = () => {
      triggerFireRoar();
    };
    // @ts-expect-error custom global hook
    window.__triggerDragonFireRoar = handleGlobalRoar;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      if (mixerRef.current) mixerRef.current.update(delta);
      updateDragonPosition(delta, elapsed);
      updateFireParticles(delta, elapsed);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
      if (forcedFireTimerRef.current) clearTimeout(forcedFireTimerRef.current);
      if (wingFlapAudioRef.current?.isPlaying) wingFlapAudioRef.current.stop();
      if (fireAudioRef.current?.isPlaying) fireAudioRef.current.stop();
      if (roarAudioRef.current?.isPlaying) roarAudioRef.current.stop();
      renderer.dispose();
      // @ts-expect-error clean up global hook
      delete window.__triggerDragonFireRoar;
    };
  }, [modelPath]);

  // Spatial Audio Configuration
  const setupSpatialAudio = (listener: THREE.AudioListener) => {
    try {
      const ctx = listener.context;

      // Wing Flap
      const wingAudio = new THREE.PositionalAudio(listener);
      wingAudio.setBuffer(createWingFlapAudioBuffer(ctx));
      wingAudio.setRefDistance(4);
      wingAudio.setMaxDistance(45);
      wingAudio.setRolloffFactor(1.2);
      wingAudio.setVolume(0.8);
      wingFlapAudioRef.current = wingAudio;

      // Fire Breath
      const fireAudio = new THREE.PositionalAudio(listener);
      fireAudio.setBuffer(createFireBreathAudioBuffer(ctx));
      fireAudio.setLoop(true);
      fireAudio.setRefDistance(3);
      fireAudio.setMaxDistance(45);
      fireAudio.setRolloffFactor(1.5);
      fireAudio.setVolume(0.95);
      fireAudioRef.current = fireAudio;

      // Dragon Roar
      const roarAudio = new THREE.PositionalAudio(listener);
      roarAudio.setBuffer(createDragonRoarAudioBuffer(ctx));
      roarAudio.setRefDistance(5);
      roarAudio.setMaxDistance(60);
      roarAudio.setRolloffFactor(1.0);
      roarAudio.setVolume(1.0);
      roarAudioRef.current = roarAudio;
    } catch (e) {
      console.warn('Audio setup error:', e);
    }
  };

  const attachAudioToDragon = (dragon: THREE.Group, head: THREE.Object3D) => {
    if (wingFlapAudioRef.current) dragon.add(wingFlapAudioRef.current);
    if (fireAudioRef.current) head.add(fireAudioRef.current);
    if (roarAudioRef.current) head.add(roarAudioRef.current);
  };

  const triggerFireRoar = () => {
    if (roarAudioRef.current && !mutedRef.current) {
      if (roarAudioRef.current.isPlaying) roarAudioRef.current.stop();
      roarAudioRef.current.play();
    }
    isFireForcedRef.current = true;
    if (forcedFireTimerRef.current) clearTimeout(forcedFireTimerRef.current);
    forcedFireTimerRef.current = window.setTimeout(() => {
      isFireForcedRef.current = false;
    }, 4500);
  };

  useEffect(() => {
    if (walkTimerRef.current) clearTimeout(walkTimerRef.current);

    if (targetPopupRect) {
      const cardWidth = targetPopupRect.width || 220;
      const leftTargetX = targetPopupRect.left + 28;
      const leftTargetY = targetPopupRect.top - 16;
      const rightTargetX = (targetPopupRect.right || targetPopupRect.left + cardWidth) - 28;

      const topLeftWorld = screenToWorld(leftTargetX, leftTargetY, 0);
      const topRightWorld = screenToWorld(rightTargetX, leftTargetY, 0);

      targetWorldPosRef.current.copy(topLeftWorld);
      startWalkPosRef.current.copy(topLeftWorld);
      endWalkPosRef.current.copy(topRightWorld);

      transitionToAnimation('fly', 0.35);
      setDragonState('FLYING_TO_POPUP');

      // Initial wing flap sound
      if (wingFlapAudioRef.current && !mutedRef.current) {
        if (wingFlapAudioRef.current.isPlaying) wingFlapAudioRef.current.stop();
        wingFlapAudioRef.current.play();
      }
    } else {
      if (fireAudioRef.current?.isPlaying) fireAudioRef.current.stop();
      if (allowPatrolWhenIdle) {
        transitionToAnimation('fly', 0.4);
        setDragonState('PATROL_ORBIT');
      } else {
        targetWorldPosRef.current.set(-20, 14, 0);
        transitionToAnimation('fly', 0.4);
        setDragonState('TAKING_OFF');
      }
    }
  }, [targetPopupRect, allowPatrolWhenIdle]);

  const screenToWorld = (screenX: number, screenY: number, targetZ = 0): THREE.Vector3 => {
    if (!cameraRef.current) return new THREE.Vector3();
    const camera = cameraRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const ndcX = (screenX / width) * 2 - 1;
    const ndcY = -(screenY / height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
    const worldPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, worldPoint);
    return worldPoint;
  };

  const transitionToAnimation = (newActionName: string, duration = 0.35) => {
    const actions = actionsRef.current;
    // @ts-expect-error dynamic lookup
    const nextAction = actions[newActionName] || actions.fly;
    // @ts-expect-error dynamic lookup
    const prevAction = currentActionNameRef.current ? actions[currentActionNameRef.current] : null;

    if (!nextAction) return;

    if (prevAction && prevAction !== nextAction) {
      nextAction.reset();
      nextAction.enabled = true;
      nextAction.play();
      prevAction.crossFadeTo(nextAction, duration, true);
    } else {
      nextAction.reset();
      nextAction.enabled = true;
      nextAction.play();
    }

    currentActionNameRef.current = newActionName;
  };

  const updateDragonPosition = (delta: number, elapsed: number) => {
    const dragon = dragonRootRef.current;
    if (!dragon) return;

    const state = dragonStateRef.current;

    if (state === 'PATROL_ORBIT') {
      // Majestic soaring patrol orbit high above the terrain
      const orbitX = Math.sin(elapsed * 0.4) * 6.5;
      const orbitY = 4.2 + Math.cos(elapsed * 0.28) * 1.5;
      const targetPos = new THREE.Vector3(orbitX, orbitY, 0);

      // Periodical wing flap sound
      if (wingFlapAudioRef.current && !mutedRef.current) {
        if (elapsed - lastFlapTimeRef.current > 1.6) {
          lastFlapTimeRef.current = elapsed;
          if (wingFlapAudioRef.current.isPlaying) wingFlapAudioRef.current.stop();
          wingFlapAudioRef.current.play();
        }
      }

      dragon.position.lerp(targetPos, Math.min(1, delta * 2.2));
      const lookTarget = targetPos.clone().add(
        new THREE.Vector3(Math.cos(elapsed * 0.4) * 2, -Math.sin(elapsed * 0.28) * 0.5, 0.4)
      );
      dragon.lookAt(lookTarget);
      dragon.rotation.z = Math.cos(elapsed * 0.4) * 0.22;
    } else if (state === 'FLYING_TO_POPUP') {
      const target = targetWorldPosRef.current;
      const currentPos = dragon.position;
      const dist = currentPos.distanceTo(target);

      // Flap sound during flight descent
      if (wingFlapAudioRef.current && !mutedRef.current) {
        if (elapsed - lastFlapTimeRef.current > 0.5) {
          lastFlapTimeRef.current = elapsed;
          if (wingFlapAudioRef.current.isPlaying) wingFlapAudioRef.current.stop();
          wingFlapAudioRef.current.play();
        }
      }

      if (dist > 0.08) {
        const flySpeed = Math.min(7.0, dist * 3.0 + 1.4);
        currentPos.lerp(target, Math.min(1, delta * flySpeed));
        const lookTarget = target.clone().add(new THREE.Vector3(0, 0, 0.25));
        dragon.lookAt(lookTarget);
        dragon.rotation.z = Math.sin(elapsed * 5) * 0.12;
      } else {
        currentPos.copy(target);
        transitionToAnimation('idle', 0.4);
        dragon.rotation.set(0.12, 0, 0);
        setDragonState('LANDED_IDLE');

        if (wingFlapAudioRef.current?.isPlaying) wingFlapAudioRef.current.stop();

        // After 5 seconds, walk along the top edge of the card
        walkTimerRef.current = window.setTimeout(() => {
          if (dragonStateRef.current === 'LANDED_IDLE') {
            transitionToAnimation('walk', 0.45);
            walkProgressRef.current = 0;
            setDragonState('WALKING_TO_TOP_RIGHT');
          }
        }, 5000);
      }
    } else if (state === 'WALKING_TO_TOP_RIGHT') {
      walkProgressRef.current += delta * 0.25;
      const t = Math.min(1, walkProgressRef.current);
      dragon.position.lerpVectors(startWalkPosRef.current, endWalkPosRef.current, t);
      dragon.position.y += Math.sin(t * Math.PI * 8) * 0.015; // gentle footstep bobbing
      dragon.rotation.set(0, 0, 0);
      dragon.lookAt(endWalkPosRef.current.clone().add(new THREE.Vector3(1, 0, 0.2)));

      if (t >= 1) {
        transitionToAnimation('idle', 0.45);
        dragon.rotation.set(0.12, -0.35, 0);
        setDragonState('PERCHED_RIGHT');

        // Play roar and start fire audio
        if (roarAudioRef.current && !mutedRef.current) {
          roarAudioRef.current.play();
        }
        if (fireAudioRef.current && !fireAudioRef.current.isPlaying && !mutedRef.current) {
          fireAudioRef.current.play();
        }
      }
    } else if (state === 'PERCHED_RIGHT') {
      // Subtle organic breathing motion while perched
      dragon.position.y = endWalkPosRef.current.y + Math.sin(elapsed * 2.2) * 0.02;
    }

    // Scale fire volume with camera proximity
    if (fireAudioRef.current && cameraRef.current) {
      const isFireActive = dragonStateRef.current === 'PERCHED_RIGHT' || isFireForcedRef.current;
      if (isFireActive) {
        const headPos = new THREE.Vector3();
        if (headNodeRef.current) headNodeRef.current.getWorldPosition(headPos);
        else dragon.getWorldPosition(headPos);

        const distToCamera = cameraRef.current.position.distanceTo(headPos);
        const proximityVol = THREE.MathUtils.clamp(1.2 - distToCamera / 20, 0.3, 1.0);
        fireAudioRef.current.setVolume(proximityVol * (mutedRef.current ? 0 : 1.0));

        if (!fireAudioRef.current.isPlaying && !mutedRef.current) {
          fireAudioRef.current.play();
        }
      } else {
        if (fireAudioRef.current.isPlaying) fireAudioRef.current.stop();
      }
    }
  };

  const createFireParticleSystem = (): THREE.Points => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 9999;
      positions[i * 3 + 1] = 9999;
      positions[i * 3 + 2] = 9999;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6;
      colors[i * 3 + 2] = 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 230, 1)');
    grad.addColorStop(0.25, 'rgba(255, 185, 45, 0.95)');
    grad.addColorStop(0.55, 'rgba(235, 55, 15, 0.65)');
    grad.addColorStop(0.85, 'rgba(160, 20, 0, 0.25)');
    grad.addColorStop(1, 'rgba(60, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.58,
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      })
    );
  };

  const updateFireParticles = (delta: number, elapsed: number) => {
    if (!fireParticlesRef.current) return;

    const positions = fireParticlesRef.current.geometry.attributes.position.array as Float32Array;
    const colors = fireParticlesRef.current.geometry.attributes.color.array as Float32Array;
    const pData = particlesDataRef.current;
    const isFireActive = dragonStateRef.current === 'PERCHED_RIGHT' || isFireForcedRef.current;

    let muzzlePos = new THREE.Vector3();
    let muzzleDir = new THREE.Vector3(1, -0.32, 0.2);

    if (headNodeRef.current) {
      headNodeRef.current.getWorldPosition(muzzlePos);
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(headNodeRef.current.quaternion);
      muzzlePos.addScaledVector(forward, 0.45);
      muzzleDir.copy(forward).normalize();
      muzzleDir.y -= 0.2;
      muzzleDir.x += 0.35;
      muzzleDir.normalize();
    } else if (dragonRootRef.current) {
      dragonRootRef.current.getWorldPosition(muzzlePos);
      muzzlePos.y += 0.65;
      muzzlePos.x += 0.55;
    }

    if (fireLightRef.current) {
      if (isFireActive) {
        fireLightRef.current.position.copy(muzzlePos);
        fireLightRef.current.intensity = 3.6 + Math.sin(elapsed * 28) * 1.4 + Math.random() * 0.9;
      } else {
        fireLightRef.current.intensity = 0;
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = pData[i];
      p.life += delta;

      if (isFireActive) {
        if (p.life >= p.maxLife) {
          p.life = 0;
          p.maxLife = 0.52 + Math.random() * 0.48;
          p.x = muzzlePos.x + (Math.random() - 0.5) * 0.08;
          p.y = muzzlePos.y + (Math.random() - 0.5) * 0.08;
          p.z = muzzlePos.z + (Math.random() - 0.5) * 0.08;

          const speed = 4.4 + Math.random() * 3.4;
          p.vx = (muzzleDir.x + (Math.random() - 0.5) * 0.55) * speed;
          p.vy = (muzzleDir.y + (Math.random() - 0.35) * 0.5) * speed;
          p.vz = (muzzleDir.z + (Math.random() - 0.5) * 0.5) * speed;
        }

        p.x += p.vx * delta;
        p.y += p.vy * delta + delta * 0.55;
        p.z += p.vz * delta;

        const t = p.life / p.maxLife;
        const idx = i * 3;
        positions[idx] = p.x;
        positions[idx + 1] = p.y;
        positions[idx + 2] = p.z;

        if (t < 0.2) {
          colors[idx] = 1.0;
          colors[idx + 1] = 0.95;
          colors[idx + 2] = 0.5;
        } else if (t < 0.55) {
          colors[idx] = 1.0;
          colors[idx + 1] = 0.48;
          colors[idx + 2] = 0.05;
        } else if (t < 0.85) {
          colors[idx] = 0.88;
          colors[idx + 1] = 0.14;
          colors[idx + 2] = 0.02;
        } else {
          colors[idx] = 0.3 * (1 - t);
          colors[idx + 1] = 0.05 * (1 - t);
          colors[idx + 2] = 0.01 * (1 - t);
        }
      } else {
        positions[i * 3] = 9999;
        positions[i * 3 + 1] = 9999;
        positions[i * 3 + 2] = 9999;
      }
    }

    fireParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    fireParticlesRef.current.geometry.attributes.color.needsUpdate = true;
  };

  const loadModelWithFallback = (scene: THREE.Scene, path: string) => {
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => setupLoadedGltf(scene, gltf),
      undefined,
      (err) => {
        console.warn('Could not load dragon GLB, building procedural dragon:', err);
        buildRiggedProceduralDragon(scene);
      }
    );
  };

  const setupLoadedGltf = (scene: THREE.Scene, gltf: any) => {
    if (dragonRootRef.current) scene.remove(dragonRootRef.current);
    const model = gltf.scene;

    const names = ['jaw_022', 'jaw', 'head_021', 'head', 'snout', 'mouth', 'dragon_head'];
    let foundHead: THREE.Object3D | null = null;
    model.traverse((child: THREE.Object3D) => {
      if (!foundHead && names.some((n) => child.name.toLowerCase().includes(n))) {
        foundHead = child;
      }
    });
    const head = foundHead || model;
    headNodeRef.current = head;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z);
    const scale = maxAxis > 0 ? 2.5 / maxAxis : 1;
    model.scale.set(scale, scale, scale);

    // Orient model so head (+Z) faces along group's forward
    model.rotation.y = Math.PI;

    const dragonGroup = new THREE.Group();
    dragonGroup.position.set(0, 4.5, 0);
    dragonGroup.add(model);

    scene.add(dragonGroup);
    dragonRootRef.current = dragonGroup;

    attachAudioToDragon(dragonGroup, head);

    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;

    const availableClips: THREE.AnimationClip[] = gltf.animations || [];
    const findClip = (keys: string[]) => availableClips.find((c) => keys.some((k) => c.name.toLowerCase().includes(k)));

    const flyClip = findClip(['flying', 'flaping', 'fly']) || availableClips[0];
    const flapClip = findClip(['flaping', 'flap']) || flyClip;
    const idleClip = findClip(['idol', 'idle', 'stand']) || availableClips[0];
    const walkClip = findClip(['walk', 'walking', 'stride']) || availableClips[0];
    const takeoffClip = findClip(['take off', 'takeoff']) || flyClip;

    actionsRef.current = {
      fly: mixer.clipAction(flyClip),
      flap: mixer.clipAction(flapClip),
      idle: mixer.clipAction(idleClip),
      walk: mixer.clipAction(walkClip),
      takeoff: mixer.clipAction(takeoffClip),
    };

    // Start with fly or idle depending on whether target is present
    if (targetPopupRect) {
      transitionToAnimation('fly', 0.2);
    } else {
      transitionToAnimation('fly', 0.2);
    }
  };

  const buildRiggedProceduralDragon = (scene: THREE.Scene) => {
    if (dragonRootRef.current) scene.remove(dragonRootRef.current);

    const dragonGroup = new THREE.Group();
    dragonGroup.position.set(0, 4.5, 0);

    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.35, metalness: 0.5 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf97316, emissiveIntensity: 1.5 });

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 8), scaleMat);
    body.rotation.x = Math.PI / 2;
    dragonGroup.add(body);

    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.2, 6), bellyMat);
    belly.position.set(0, -0.15, 0);
    body.add(belly);

    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0.3, 1.0);

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), scaleMat);
    head.position.set(0, 0.4, 0.5);
    head.rotation.x = Math.PI / 3;
    neckGroup.add(head);
    headNodeRef.current = head;

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    eyeL.position.set(0.18, 0.5, 0.4);
    neckGroup.add(eyeL);
    body.add(neckGroup);

    const wingLeft = new THREE.Group();
    wingLeft.position.set(0.5, 0.2, 0.2);
    const wingLMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.8), wingMat);
    wingLMesh.position.set(0.8, 0, -0.2);
    wingLeft.add(wingLMesh);
    body.add(wingLeft);

    const wingRight = new THREE.Group();
    wingRight.position.set(-0.5, 0.2, 0.2);
    const wingRMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.8), wingMat);
    wingRMesh.position.set(-0.8, 0, -0.2);
    wingRight.add(wingRMesh);
    body.add(wingRight);

    dragonGroup.scale.set(1.4, 1.4, 1.4);
    scene.add(dragonGroup);
    dragonRootRef.current = dragonGroup;

    attachAudioToDragon(dragonGroup, head);

    const mixer = new THREE.AnimationMixer(dragonGroup);
    mixerRef.current = mixer;

    const flyTimes = [0, 0.2, 0.4, 0.6, 0.8];
    const flyClip = new THREE.AnimationClip('fly', 0.8, [
      new THREE.VectorKeyframeTrack('dragon_wing_left.rotation[z]', flyTimes, [0, 0.7, -0.6, 0.7, 0]),
      new THREE.VectorKeyframeTrack('dragon_wing_right.rotation[z]', flyTimes, [0, -0.7, 0.6, -0.7, 0]),
    ]);

    const idleTimes = [0, 1.2, 2.4];
    const idleClip = new THREE.AnimationClip('idle', 2.4, [
      new THREE.VectorKeyframeTrack('dragon_body.scale', idleTimes, [1, 1, 1, 1.04, 1.04, 1, 1, 1, 1]),
    ]);

    const walkTimes = [0, 0.4, 0.8, 1.2];
    const walkClip = new THREE.AnimationClip('walk', 1.2, [
      new THREE.VectorKeyframeTrack('dragon_wing_left.rotation[z]', walkTimes, [0.15, 0.1, 0.15, 0.1]),
    ]);

    actionsRef.current = {
      fly: mixer.clipAction(flyClip),
      flap: mixer.clipAction(flyClip),
      idle: mixer.clipAction(idleClip),
      walk: mixer.clipAction(walkClip),
      takeoff: mixer.clipAction(flyClip),
    };
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex,
      }}
    />
  );
};
