import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

/**
 * Carte Leaflet (OpenStreetMap) dans une WebView.
 * Fonctionne dans Expo Go (Android) sans configuration native.
 */
export default function MapWebView({
  center = { latitude: -18.9137, longitude: 47.5361 },
  zoom = 12,
  markers = [],
  polylines = [],
}) {
  const html = useMemo(() => {
    const safeJson = (v) =>
      JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

    const data = {
      center: [center.latitude, center.longitude],
      zoom,
      markers: markers.map((m) => ({
        lat: m.latitude,
        lon: m.longitude,
        title: m.title || "",
        color: m.color || "blue",
      })),
      polylines: polylines.map((p) => ({
        coords: (p.coords || []).map(([lat, lon]) => [lat, lon]),
        color: p.color || "#FF6D00",
        weight: p.weight || 5,
        dashArray: p.dashArray || null,
        opacity: p.opacity ?? 0.9,
      })),
    };

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
      .chip { font-family: -apple-system, Roboto, Arial, sans-serif; font-size: 12px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const DATA = ${safeJson(data)};
      const map = L.map('map', { zoomControl: true }).setView(DATA.center, DATA.zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const bounds = [];

      const iconHtml = (color) =>
        \`<div style="width:12px;height:12px;border-radius:6px;background:\${color};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>\`;
      const divIcon = (color) =>
        L.divIcon({ className: 'chip', html: iconHtml(color), iconSize: [12,12], iconAnchor: [6,6] });

      (DATA.polylines || []).forEach((p) => {
        if (!p.coords || p.coords.length < 2) return;
        const line = L.polyline(p.coords, {
          color: p.color,
          weight: p.weight,
          opacity: p.opacity,
          dashArray: p.dashArray || undefined,
        }).addTo(map);
        try { bounds.push(...line.getLatLngs()); } catch {}
      });

      (DATA.markers || []).forEach((m) => {
        const marker = L.marker([m.lat, m.lon], { icon: divIcon(m.color) }).addTo(map);
        if (m.title) marker.bindPopup(m.title);
        bounds.push([m.lat, m.lon]);
      });

      if (bounds.length > 1) {
        try {
          map.fitBounds(bounds, { padding: [24, 24] });
        } catch {}
      }
    </script>
  </body>
</html>`;
  }, [center.latitude, center.longitude, markers, polylines, zoom]);

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={{ backgroundColor: '#f3f4f6' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#f3f4f6" },
});

