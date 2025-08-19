import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import "leaflet-geometryutil"; 
import "../styles/MapComponent.css"; 

export default function MapComponent({ onPolygonComplete, selectedLocation }) {
  const mapRef = useRef(null);
  const drawnItemsRef = useRef(new L.FeatureGroup());
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map").setView([19.07, 72.87], 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.addLayer(drawnItemsRef.current);

      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItemsRef.current },
        draw: {
          polygon: true,
          rectangle: true,
          circle: false,
          marker: false,
          polyline: false,
        },
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItemsRef.current.addLayer(layer);

        const latlngs = layer.getLatLngs()[0].map((p) => [p.lat, p.lng]);
        const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);

        if (onPolygonComplete) {
          onPolygonComplete(latlngs, area.toFixed(2));
        }

        layer.bindPopup(`Area: ${area.toFixed(2)} m²`).openPopup();
      });
    }
  }, [onPolygonComplete]);

  // 🟢 Watch for selectedLocation updates
  useEffect(() => {
    if (mapRef.current && selectedLocation) {
      const [lat, lon] = selectedLocation;

      // Move map to location
      mapRef.current.setView([lat, lon], 15);

      // Add or update marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      } else {
        markerRef.current = L.marker([lat, lon]).addTo(mapRef.current);
      }
    }
  }, [selectedLocation]);

  return <div id="map"></div>;
}
