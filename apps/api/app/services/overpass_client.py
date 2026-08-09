import httpx
import urllib.parse
from typing import Dict, List, Any, Optional

OVERPASS_ENDPOINTS = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
]

HEADERS = {
    "User-Agent": "RintisHikingAppStage1/1.0 (contact: azzaky@example.com)",
    "Accept": "application/json, text/plain, */*"
}

def execute_overpass_query(query: str) -> Optional[Dict[str, Any]]:
    """
    Executes an Overpass QL query trying multiple server mirrors.
    Tries POST, falling back to GET on HTTP errors (like 406).
    """
    for endpoint in OVERPASS_ENDPOINTS:
        print(f"[OverpassClient] Trying endpoint: {endpoint}")
        try:
            # 1. Try POST request
            response = httpx.post(endpoint, data={"data": query}, headers=HEADERS, timeout=45.0)
            if response.status_code == 200:
                print(f"[OverpassClient] Success with {endpoint} (POST)!")
                return response.json()
            
            print(f"[OverpassClient] POST to {endpoint} returned status {response.status_code}. Trying GET...")
            
            # 2. Try GET request fallback
            encoded_query = urllib.parse.quote(query)
            response = httpx.get(f"{endpoint}?data={encoded_query}", headers=HEADERS, timeout=45.0)
            if response.status_code == 200:
                print(f"[OverpassClient] Success with {endpoint} (GET)!")
                return response.json()
                
            print(f"[OverpassClient] GET to {endpoint} returned status {response.status_code}.")
        except Exception as e:
            print(f"[OverpassClient] Failed to query {endpoint}: {e}")
            
    print("[OverpassClient] All Overpass API endpoints failed.")
    return None

def fetch_trail_geometry(osm_relation_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetches the relation members (ways & nodes) and constructs a GeoJSON LineString.
    """
    query = f"""[out:json][timeout:60];
relation({osm_relation_id});
(._; >;);
out body;"""

    data = execute_overpass_query(query)
    if not data or "elements" not in data:
        return None

    elements = data["elements"]
    
    # Separate nodes, ways, and relations
    nodes = {e["id"]: e for e in elements if e["type"] == "node"}
    ways = {e["id"]: e for e in elements if e["type"] == "way"}
    relations = [e for e in elements if e["type"] == "relation"]
    
    if not relations:
        print(f"[OverpassClient] Relation {osm_relation_id} not found in Overpass data.")
        return None
        
    relation = relations[0]
    
    # Get all way members in the relation
    way_members = [m for m in relation.get("members", []) if m["type"] == "way"]
    if not way_members:
        print(f"[OverpassClient] Relation {osm_relation_id} has no way members.")
        return None
        
    # Extract coordinates for each way in order
    flat_coordinates = []
    for member in way_members:
        way_id = member["ref"]
        if way_id in ways:
            way_el = ways[way_id]
            for node_id in way_el.get("nodes", []):
                if node_id in nodes:
                    node_el = nodes[node_id]
                    pt = [node_el["lon"], node_el["lat"]]
                    # Avoid duplicate sequential coordinates
                    if not flat_coordinates or flat_coordinates[-1] != pt:
                        flat_coordinates.append(pt)
                        
    if not flat_coordinates:
        print(f"[OverpassClient] No valid coordinates extracted for relation {osm_relation_id}.")
        return None
        
    # Return as GeoJSON LineString geometry
    return {
        "type": "LineString",
        "coordinates": flat_coordinates
    }

def fetch_trail_waypoints(osm_relation_id: int) -> List[Dict[str, Any]]:
    """
    Queries for nodes within 500m of the relation's path and maps them to Rintis waypoints.
    """
    query = f"""[out:json][timeout:60];
relation({osm_relation_id})->.route;
(.route; >;)->.all;
(
  node(around.all:500)["tourism"="camp_site"];
  node(around.all:500)["natural"="peak"];
  node(around.all:500)["amenity"="drinking_water"];
  node(around.all:500)["waterway"="spring"];
  node(around.all:500)["tourism"="information"];
  node(around.all:500)["hiking"="waypoint"];
  node(around.all:500)["name"~"Pos|Camp|Puncak|Sumber|Pintu",i];
);
out meta;"""

    data = execute_overpass_query(query)
    if not data or "elements" not in data:
        return []

    elements = data["elements"]
    waypoints = []
    
    for el in elements:
        if el["type"] != "node":
            continue
            
        tags = el.get("tags", {})
        name = tags.get("name")
        
        # Fallback names
        if not name:
            name = tags.get("ref") or tags.get("description") or f"Waypoint {el['id']}"
            
        # Standardize typing based on tags
        wp_type = "pos"
        name_lower = name.lower()
        
        # Camp site check
        if (tags.get("tourism") == "camp_site" or 
            tags.get("camp_site") == "yes" or 
            "camp" in name_lower or 
            "sabana" in name_lower or
            tags.get("shelter_type") == "lean_to"):
            wp_type = "camp"
        # Peak check
        elif (tags.get("natural") == "peak" or 
              "puncak" in name_lower or 
              "peak" in name_lower):
            wp_type = "peak"
        # Water source check
        elif (tags.get("amenity") == "drinking_water" or 
              tags.get("natural") == "water_point" or 
              tags.get("waterway") == "spring" or 
              "sumber air" in name_lower or 
              "mata air" in name_lower or 
              "air" in name_lower):
            wp_type = "water_source"
        # Trailhead check
        elif (tags.get("highway") == "trailhead" or 
              "basecamp" in name_lower or 
              "base camp" in name_lower or
              "pintu masuk" in name_lower or 
              "pintu rimba" in name_lower):
            wp_type = "trailhead"
        # Pos check
        elif ("pos" in name_lower or 
              tags.get("tourism") == "information" or 
              tags.get("hiking") == "waypoint"):
            wp_type = "pos"

        # Clean elevation tag
        elevation = None
        ele_tag = tags.get("ele")
        if ele_tag:
            try:
                cleaned = "".join(c for c in ele_tag if c.isdigit() or c in ".-")
                elevation = float(cleaned)
            except ValueError:
                pass
                
        waypoints.append({
            "name": name,
            "type": wp_type,
            "lat": el["lat"],
            "lng": el["lon"],
            "elevation_m": elevation,
            "osm_node_id": el["id"],
            "osm_version": el.get("version"),
            "osm_last_edited": el.get("timestamp")
        })
        
    return waypoints
