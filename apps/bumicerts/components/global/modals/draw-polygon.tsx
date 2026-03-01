import { Button } from "@/components/ui/button";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import { VisuallyHidden } from "radix-ui";

export const DrawPolygonModalId = "draw-polygon";

type DrawPolygonModalProps = {
  onSubmit: (polygonJSONString: string) => void;
};

type Point = { lng: number; lat: number };

/**
 * Converts an array of points to GeoJSON Polygon format.
 * Ensures the polygon is closed (first and last coordinates are equal).
 */
function pointsToGeoJSON(points: Point[]): string {
  if (points.length < 3) {
    throw new Error("Polygon must have at least 3 points");
  }

  // Convert points to coordinates
  const coordinates = points.map((point) => {
    if (point.lng === undefined || point.lat === undefined) {
      throw new Error("Invalid point format: missing lng or lat");
    }
    return [point.lng, point.lat] as [number, number];
  });

  // Close the polygon by ensuring first and last coordinates are equal
  const firstCoord = coordinates[0];
  const lastCoord = coordinates[coordinates.length - 1];
  if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
    coordinates.push([firstCoord[0], firstCoord[1]]);
  }

  const geoJson = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {},
  };

  return JSON.stringify(geoJson);
}

/**
 * Processes polygon data from various formats and returns GeoJSON string or null.
 */
function processPolygonData(data: unknown): string | null {
  // Clear data if null or empty array
  if (data === null || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  // Handle array of points: [{lng, lat}, ...]
  if (Array.isArray(data) && data.length > 0) {
    try {
      return pointsToGeoJSON(data as Point[]);
    } catch (error) {
      console.error("Error processing polygon data:", error);
      return null;
    }
  }

  // Handle GeoJSON string
  if (typeof data === "string") {
    try {
      JSON.parse(data); // Validate JSON
      return data;
    } catch (error) {
      console.error("Error parsing GeoJSON string:", error);
      return null;
    }
  }

  // Handle GeoJSON object
  if (data && typeof data === "object") {
    try {
      JSON.parse(JSON.stringify(data)); // Validate JSON
      return JSON.stringify(data);
    } catch (error) {
      console.error("Error processing GeoJSON object:", error);
      return null;
    }
  }

  return null;
}

const DrawPolygonModal = ({ onSubmit }: DrawPolygonModalProps) => {
  const { popModal, stack, hide } = useModal();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [polygonData, setPolygonData] = useState<string | null>(null);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== "https://polygons-gainforest.vercel.app") {
        return;
      }

      // Check for polygon-data message type
      if (event.data?.type === "polygon-data") {
        const processed = processPolygonData(event.data.data);
        setPolygonData(processed);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!polygonData) {
      return;
    }

    onSubmit(polygonData);

    // Pop / Hide the modal
    if (stack.length === 1) {
      hide().then(() => {
        popModal();
      });
    } else {
      popModal();
    }
  }, [polygonData, onSubmit, stack.length, hide, popModal]);

  return (
    <ModalContent className="px-0 py-0" dismissible={false}>
      <VisuallyHidden.Root>
        <ModalHeader>
          <ModalTitle>Draw Polygon</ModalTitle>
          <ModalDescription>Draw a polygon on the map</ModalDescription>
        </ModalHeader>
      </VisuallyHidden.Root>
      <div className="w-full relative">
        <iframe
          ref={iframeRef}
          src="https://polygons-gainforest.vercel.app/draw"
          className="w-full h-[500px] overflow-hidden rounded-lg"
          title="Draw Polygon"
        />
        {stack.length > 1 && (
          <Button
            className="absolute top-3 left-3 rounded-full"
            variant={"outline"}
            size={"icon-sm"}
            onClick={() => {
              stack.length > 1 && popModal();
            }}
          >
            <ChevronLeft />
          </Button>
        )}
      </div>
      <ModalFooter>
        <Button onClick={handleSubmit} disabled={!polygonData}>
          Done
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};

export default DrawPolygonModal;
