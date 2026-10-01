"""Estimate village areas from the NLSC boundary paths already used by Happy Farm.

The SVG paths are scaled separately for each district. Normalize each village's
shoelace area by its district sum, then multiply by the official district area.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XINHUA = json.loads((ROOT / 'data/xinhua-villages.json').read_text())
NEIGHBORS = json.loads((ROOT / 'data/farm-neighbor-districts.json').read_text())
DISTRICT_KM2 = {
    '新化區': 62.0579, '永康區': 40.2753, '左鎮區': 74.9025,
    '山上區': 27.8780, '歸仁區': 55.7913, '新市區': 47.8096,
}


def path_area(path):
    total = 0.0
    for ring in re.findall(r'M([^M]+)', path):
        points = [(float(x), float(y)) for x, y in re.findall(r'(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)', ring)]
        if len(points) > 2:
            total += abs(sum(x * points[(i + 1) % len(points)][1] - points[(i + 1) % len(points)][0] * y
                             for i, (x, y) in enumerate(points))) / 2
    return total


districts = [{'name': '新化區', **XINHUA}, *NEIGHBORS['districts']]
areas = {}
for district in districts:
    raw = {village['id']: path_area(village['path']) for village in district['villages']}
    total = sum(raw.values())
    if not total:
        raise ValueError(f"No polygon area for {district['name']}")
    for village in district['villages']:
        areas[village['id']] = round(raw[village['id']] / total * DISTRICT_KM2[district['name']], 3)

output = {
    'source': 'NLSC village boundaries scaled to Tainan Civil Affairs Bureau 115/8 district areas',
    'sourceUrl': 'https://data.tainan.gov.tw/Resource/46e014c9-0e5a-4734-9b98-23ab163e6517',
    'method': 'Village polygon shoelace area divided by sum of district village polygons, multiplied by official district km²; estimates due to simplified map paths.',
    'km2': areas,
}
(ROOT / 'data/farm-village-areas.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Wrote {len(areas)} village areas')
