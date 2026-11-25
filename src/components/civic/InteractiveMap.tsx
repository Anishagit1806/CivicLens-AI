'use client';

import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badges';
import type { CivicIssuePublic, IssueSeverity } from '@/types/civic';

interface InteractiveMapProps {
  issues: CivicIssuePublic[];
  heightClass?: string;
  selectableCoords?: { latitude: number; longitude: number } | null;
  onSelectCoords?: (coords: { latitude: number; longitude: number }) => void;
}

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  critical: '#b91c1c',
  high: '#b45309',
  medium: '#0369a1',
  low: '#475569',
};

export function InteractiveMap({
  issues,
  heightClass = 'h-[440px]',
  selectableCoords = null,
  onSelectCoords,
}: InteractiveMapProps) {
  const { t } = useApp();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const layerGroupRef = useRef<import('leaflet').LayerGroup | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(issues[0]?.id ?? null);
  const [mapReady, setMapReady] = useState(false);

  const center = useMemo<[number, number]>(() => {
    if (selectableCoords) {
      return [selectableCoords.latitude, selectableCoords.longitude];
    }
    const first = issues[0];
    if (first) {
      return [first.latitude, first.longitude];
    }
    return [13.0827, 80.2707];
  }, [issues, selectableCoords]);

  useEffect(() => {
    let active = true;
    async function initMap() {
      if (!containerRef.current || mapInstanceRef.current) return;
      const L = await import('leaflet');
      if (!active || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom: 12,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = group;

      if (onSelectCoords) {
        map.on('click', (evt: import('leaflet').LeafletMouseEvent) => {
          const lat = Math.round(evt.latlng.lat * 100000) / 100000;
          const lng = Math.round(evt.latlng.lng * 100000) / 100000;
          onSelectCoords({ latitude: lat, longitude: lng });
        });
      }

      setMapReady(true);
    }

    void initMap();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function syncMarkers() {
      if (!mapReady || !layerGroupRef.current || !mapInstanceRef.current) return;
      const L = await import('leaflet');
      const group = layerGroupRef.current;
      group.clearLayers();

      for (const issue of issues) {
        const color = SEVERITY_COLORS[issue.severity];
        const marker = L.circleMarker([issue.latitude, issue.longitude], {
          radius: issue.severity === 'critical' ? 10 : 8,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.92,
        });

        marker.bindPopup(
          `<div style="min-width:190px;font-family:system-ui,sans-serif">
            <div style="font-size:11px;font-weight:700;color:#475569">${issue.referenceCode}</div>
            <div style="font-size:13px;font-weight:700;margin:4px 0;color:#0f172a">${issue.title.replace(/</g, '&lt;')}</div>
            <div style="font-size:12px;color:#334155">Priority: <strong>${issue.priorityScore}</strong></div>
            <a href="/issues/${issue.id}" style="display:inline-block;margin-top:6px;font-size:12px;font-weight:600;color:#0b4f6c;text-decoration:underline">Open report &rarr;</a>
          </div>`
        );

        marker.on('click', () => {
          setSelectedId(issue.id);
        });

        marker.addTo(group);
      }

      if (selectableCoords) {
        const pinIcon = L.divIcon({
          className: 'civiclens-selected-pin',
          html: `<div style="width:20px;height:20px;border-radius:9999px;background:#0b4f6c;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        L.marker([selectableCoords.latitude, selectableCoords.longitude], {
          icon: pinIcon,
        }).addTo(group);
      }
    }

    void syncMarkers();
  }, [issues, mapReady, selectableCoords]);

  function focusIssueOnMap(issue: CivicIssuePublic) {
    setSelectedId(issue.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([issue.latitude, issue.longitude], 14, {
        animate: true,
      });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:col-span-2">
        <div
          ref={containerRef}
          className={`${heightClass} w-full`}
          role="region"
          aria-label={
            onSelectCoords
              ? 'Interactive coordinate picker map. Click on the map or use the latitude and longitude inputs.'
              : 'Interactive civic infrastructure issue map'
          }
        />
        {onSelectCoords ? (
          <div className="border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-700">
            Click anywhere on the map to set report coordinates. Selected:{' '}
            <span className="font-mono font-semibold">
              {selectableCoords
                ? `${selectableCoords.latitude.toFixed(5)}, ${selectableCoords.longitude.toFixed(5)}`
                : 'Not set'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Synchronized keyboard-accessible issue pin directory */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900">
          Mapped Issues ({issues.length})
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Keyboard-accessible pin index synchronized with map markers.
        </p>

        <ul className="mt-3 max-h-[370px] space-y-2 overflow-y-auto pr-1">
          {issues.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-600">
              {t.explorer.emptyTitle}
            </li>
          ) : (
            issues.map((issue) => {
              const isSelected = selectedId === issue.id;
              return (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => focusIssueOnMap(issue)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[#0b4f6c] bg-[#0b4f6c]/5'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-600">
                        {issue.referenceCode}
                      </span>
                      <span className="text-xs font-bold text-[#0b4f6c]">
                        {issue.priorityScore.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-900">
                      {issue.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-600">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{issue.locationText}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <SeverityBadge severity={issue.severity} />
                      <StatusBadge status={issue.status} />
                    </div>
                  </button>
                  <div className="mt-1 px-1">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="text-[11px] font-semibold text-[#0b4f6c] hover:underline"
                    >
                      {t.explorer.viewDetails} &rarr;
                    </Link>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
