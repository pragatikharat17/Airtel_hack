import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Site } from '../types'

interface Stadium3DProps {
  sites: Site[]
  phase: string
  selectedSite: string | null
  filteredSites: Site[]
  onSelectSite: (site: Site) => void
}

const SITE_ANGLES: Record<string, number> = {
  M1: 0,
  M2: 45,
  M3: 90,
  M4: 135,
  M5: 180,
  M6: 225,
  S1: 270,
  S2: 315,
}

function riskColour(load: number | null) {
  if (load === null) return '#6b7280'
  if (load >= 95) return '#ef4444'
  if (load >= 80) return '#f97316'
  if (load >= 60) return '#eab308'
  return '#22c55e'
}

function AnimatedNode({
  site,
  phase,
  selected,
  filtered,
  onClick,
}: {
  site: Site
  phase: string
  selected: boolean
  filtered: boolean
  onClick: () => void
}) {
  const pulseRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2.5) * 0.18
      pulseRef.current.scale.setScalar(scale)
    }
  })

  const angle = ((SITE_ANGLES[site.site] ?? 0) * Math.PI) / 180
  const isSmallCell = site.type?.includes('Small')
  const radius = isSmallCell ? 3.5 : 5.2

  const x = Math.sin(angle) * radius
  const z = Math.cos(angle) * radius

  const phaseRow = site.phases.find(p => p.phase === phase)
  const load = phaseRow?.last_4g_anchor_load_pct ?? null
  const colour = riskColour(load)

  return (
    <group position={[x, 0.65, z]}>
      {/* Pulsing outer ring */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[selected ? 0.48 : 0.38, 24, 24]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={filtered ? 0.08 : 0.22}
        />
      </mesh>

      {/* Main network node */}
      <mesh
        onClick={onClick}
        scale={selected ? 1.25 : 1}
      >
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={filtered ? '#475569' : colour}
          emissive={filtered ? '#000000' : colour}
          emissiveIntensity={selected ? 1.8 : 0.8}
          metalness={0.5}
          roughness={0.25}
        />
      </mesh>

      {/* 5G marker */}
      {site.has_5g_bool && (
        <mesh position={[0.22, 0.22, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color="#a78bfa" />
        </mesh>
      )}

      <Html position={[0, 0.65, 0]} center distanceFactor={10}>
        <button
          onClick={onClick}
          className="text-center whitespace-nowrap cursor-pointer"
          style={{
            color: filtered ? '#64748b' : 'white',
            background: 'rgba(8,15,34,0.85)',
            border: `1px solid ${colour}`,
            borderRadius: '6px',
            padding: '3px 7px',
            fontSize: '10px',
            fontWeight: 700,
            boxShadow: `0 0 10px ${colour}55`,
          }}
        >
          {site.site}
          <div style={{ color: colour, fontSize: '9px' }}>
            {load !== null ? `${load.toFixed(0)}%` : 'N/A'}
          </div>
        </button>
      </Html>
    </group>
  )
}

function StadiumScene({
  sites,
  phase,
  selectedSite,
  filteredSites,
  onSelectSite,
}: Stadium3DProps) {
  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight position={[0, 8, 0]} intensity={2} color="#60a5fa" />
      <pointLight position={[5, 4, 5]} intensity={1.5} color="#a78bfa" />

      {/* Stadium base */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[7.2, 7.7, 0.5, 64]} />
        <meshStandardMaterial
          color="#172c4d"
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>

      {/* Outer stadium ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[6.3, 0.22, 12, 100]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.7}
        />
      </mesh>

      {/* Inner seating ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <torusGeometry args={[4.8, 0.35, 12, 100]} />
        <meshStandardMaterial
          color="#334f7b"
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Stadium field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[3.5, 64]} />
        <meshStandardMaterial
          color="#147d63"
          roughness={0.9}
        />
      </mesh>

      {/* Field centre circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.85, 0.9, 48]} />
        <meshBasicMaterial color="#86efac" />
      </mesh>

      {/* Field centre point */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
        <meshBasicMaterial color="#86efac" />
      </mesh>

      {/* Conceptual network connection lines */}
{sites.map(site => {
  const angle = ((SITE_ANGLES[site.site] ?? 0) * Math.PI) / 180
  const radius = site.type?.includes('Small') ? 3.5 : 5.2

  const x = Math.sin(angle) * radius
  const z = Math.cos(angle) * radius

  const phaseRow = site.phases.find(p => p.phase === phase)
  const colour = riskColour(
    phaseRow?.last_4g_anchor_load_pct ?? null
  )

  return (
    <Line
      key={`line-${site.site}`}
      points={[[0, 0.25, 0], [x, 0.45, z]]}
      color={colour}
      lineWidth={1.5}
      transparent
      opacity={0.55}
    />
  )
})}

      {/* Network nodes */}
      {sites.map(site => (
        <AnimatedNode
          key={site.site}
          site={site}
          phase={phase}
          selected={selectedSite === site.site}
          filtered={!filteredSites.some(s => s.site === site.site)}
          onClick={() => onSelectSite(site)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={9}
        maxDistance={18}
        minPolarAngle={0.5}
        maxPolarAngle={1.5}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  )
}

export function Stadium3D(props: Stadium3DProps) {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        height: 460,
        background:
          'radial-gradient(circle at center, #1b3157 0%, #101b35 65%, #0b1428 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 9, 13], fov: 45 }}
        dpr={[1, 2]}
      >
        <StadiumScene {...props} />
      </Canvas>
    </div>
  )
}