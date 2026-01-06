import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Crosshair } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Fix for default Leaflet markers in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
    initialLat?: number | null;
    initialLng?: number | null;
    onLocationSelect: (lat: number, lng: number) => void;
    className?: string;
    readOnly?: boolean;
}

// Sub-component to handle map clicks and updates
const MapEvents = ({
    onSelect,
    readOnly
}: {
    onSelect: (lat: number, lng: number) => void;
    readOnly: boolean;
}) => {
    useMapEvents({
        click(e) {
            if (!readOnly) {
                onSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
};

// Sub-component to center map when position changes
const MapRecenter = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

export const LocationPicker = ({
    initialLat,
    initialLng,
    onLocationSelect,
    className = "h-64 w-full rounded-md",
    readOnly = false
}: LocationPickerProps) => {
    // Default to Kampala if no location provided
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );

    const defaultCenter = useMemo(() => ({ lat: 0.3476, lng: 32.5825 }), []); // Kampala
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (initialLat && initialLng) {
            setPosition({ lat: initialLat, lng: initialLng });
        }
    }, [initialLat, initialLng]);

    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) {
            toast({
                title: "Geolocation unavailable",
                description: "Your browser does not support geolocation.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = { lat: latitude, lng: longitude };
                setPosition(newPos);
                onLocationSelect(latitude, longitude);
                setLoading(false);
                toast({ title: "Location updated", description: "Map centered on your device location." });
            },
            (err) => {
                console.error(err);
                setLoading(false);
                toast({
                    title: "Location error",
                    description: "Could not access your device location.",
                    variant: "destructive"
                });
            },
            { enableHighAccuracy: true }
        );
    }, [onLocationSelect, toast]);

    const handleMarkerDragEnd = useMemo(
        () => ({
            dragend(e: any) {
                if (readOnly) return;
                const marker = e.target;
                const newPos = marker.getLatLng();
                setPosition(newPos);
                onLocationSelect(newPos.lat, newPos.lng);
            },
        }),
        [readOnly, onLocationSelect]
    );

    return (
        <div className="space-y-2">
            <div className="relative border rounded-md overflow-hidden bg-muted/20">
                {!readOnly && (
                    <div className="absolute top-2 right-2 z-[1000] bg-white rounded-md shadow-sm">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleLocateMe}
                            disabled={loading}
                            className="h-8 px-2 text-xs gap-1"
                        >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
                            Locate Me
                        </Button>
                    </div>
                )}

                <MapContainer
                    center={position || defaultCenter}
                    zoom={13}
                    scrollWheelZoom={!readOnly}
                    className={className}
                    style={{ height: '300px', width: '100%', zIndex: 0 }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapEvents onSelect={(lat, lng) => {
                        const newPos = { lat, lng };
                        setPosition(newPos);
                        onLocationSelect(lat, lng);
                    }} readOnly={readOnly} />

                    {position && <MapRecenter lat={position.lat} lng={position.lng} />}

                    {position && (
                        <Marker
                            position={position}
                            draggable={!readOnly}
                            eventHandlers={handleMarkerDragEnd}
                        >
                            <Popup>
                                {readOnly ? "Selected Location" : "Drag me to adjust position"}
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {readOnly
                    ? "Map view of selected location"
                    : "Click on the map or drag the marker to pin the exact location."}
            </p>
        </div>
    );
};
