"""Build four representative passenger-rail maps from official route maps and Wikipedia coordinates.

python3 scripts/generate-railway-world.py \
  --countries /path/to/ne_50m_admin_0_countries.geojson

Official route-map links are stored below. The route sequences select major stations;
they are game connections, not a timetable or a claim that intermediate stops do not exist.
Natural Earth country boundaries are public-domain map data.
"""

import argparse
import json
import math
import re
import time
import unicodedata
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
HEADERS = {'User-Agent': 'SHJHSRailwayTour/1.0 (educational game; contact via GitHub repository)'}
CACHE_PATH = ROOT / 'data/railway-world-coordinate-source.json'

COUNTRIES = {
    'uk': {
        'admin': 'United Kingdom', 'name': '英國', 'flag': '🇬🇧', 'language': 'en',
        'source': 'https://www.nationalrail.co.uk/travel-information/maps-of-the-national-rail-network/',
        'routes': {
            'east-coast': ('東岸主線', "London King's Cross|Peterborough|Grantham|Newark North Gate|Doncaster|York|Darlington|Durham|Newcastle|Berwick-upon-Tweed|Edinburgh Waverley"),
            'west-coast': ('西岸主線', 'London Euston|Milton Keynes Central|Rugby|Coventry|Birmingham International|Birmingham New Street|Wolverhampton|Stafford|Crewe|Warrington Bank Quay|Wigan North Western|Preston|Lancaster|Carlisle|Glasgow Central'),
            'great-western': ('大西部主線', 'London Paddington|Reading|Didcot Parkway|Swindon|Chippenham|Bath Spa|Bristol Temple Meads|Taunton|Exeter St Davids|Newton Abbot|Plymouth|Truro|Penzance'),
            'midland': ('米德蘭主線', 'London St Pancras|Luton|Bedford|Kettering|Market Harborough|Leicester|Loughborough|East Midlands Parkway|Derby|Chesterfield|Sheffield'),
        },
    },
    'france': {
        'admin': 'France', 'name': '法國', 'flag': '🇫🇷', 'language': 'fr',
        'source': 'https://www.sncf-reseau.com/fr/cartes/atlas-du-reseau-ferre-francais',
        'routes': {
            'southeast': ('巴黎—里昂—地中海', 'Paris-Gare-de-Lyon|Le Creusot TGV|Mâcon-Loché TGV|Lyon-Part-Dieu|Valence TGV|Avignon TGV|Aix-en-Provence TGV|Marseille-Saint-Charles|Toulon|Cannes|Nice-Ville'),
            'atlantic-west': ('巴黎—南特', 'Paris-Montparnasse|Massy TGV|Le Mans|Angers-Saint-Laud|Nantes'),
            'atlantic-south': ('巴黎—波爾多—土魯斯', 'Paris-Montparnasse|Massy TGV|Saint-Pierre-des-Corps|Poitiers|Angoulême|Bordeaux-Saint-Jean|Agen|Montauban-Ville-Bourbon|Toulouse-Matabiau'),
            'north': ('巴黎—里爾—加萊', 'Paris-Nord|Arras|Lille-Europe|Calais-Fréthun'),
            'east': ('巴黎—史特拉斯堡', 'Paris-Est|Champagne-Ardenne TGV|Meuse TGV|Lorraine TGV|Strasbourg-Ville|Colmar|Mulhouse-Ville'),
        },
    },
    'germany': {
        'admin': 'Germany', 'name': '德國', 'flag': '🇩🇪', 'language': 'de',
        'source': 'https://www.bahn.de/service/fahrplaene/streckennetz',
        'routes': {
            'berlin-munich': ('柏林—慕尼黑', 'Berlin Hauptbahnhof|Berlin Südkreuz|Lutherstadt Wittenberg Hauptbahnhof|Leipzig Hauptbahnhof|Erfurt Hauptbahnhof|Bamberg|Nürnberg Hauptbahnhof|Ingolstadt Hauptbahnhof|München Hauptbahnhof'),
            'hamburg-munich': ('漢堡—慕尼黑', 'Hamburg Hauptbahnhof|Hamburg-Harburg|Hannover Hauptbahnhof|Göttingen|Kassel-Wilhelmshöhe|Fulda|Würzburg Hauptbahnhof|Nürnberg Hauptbahnhof|München Hauptbahnhof'),
            'rhine': ('萊茵河幹線', 'Köln Hauptbahnhof|Bonn Hauptbahnhof|Koblenz Hauptbahnhof|Mainz Hauptbahnhof|Frankfurt (Main) Hauptbahnhof|Mannheim Hauptbahnhof|Karlsruhe Hauptbahnhof|Baden-Baden|Offenburg|Freiburg (Breisgau) Hauptbahnhof'),
            'berlin-ruhr': ('柏林—魯爾—科隆', 'Berlin Hauptbahnhof|Wolfsburg Hauptbahnhof|Hannover Hauptbahnhof|Bielefeld Hauptbahnhof|Hamm (Westfalen) Hauptbahnhof|Dortmund Hauptbahnhof|Bochum Hauptbahnhof|Essen Hauptbahnhof|Duisburg Hauptbahnhof|Düsseldorf Hauptbahnhof|Köln Hauptbahnhof'),
            'southwest': ('法蘭克福—斯圖加特—慕尼黑', 'Frankfurt (Main) Hauptbahnhof|Mannheim Hauptbahnhof|Heidelberg Hauptbahnhof|Stuttgart Hauptbahnhof|Ulm Hauptbahnhof|Augsburg Hauptbahnhof|München Hauptbahnhof'),
        },
    },
    'australia': {
        'admin': 'Australia', 'name': '澳洲', 'flag': '🇦🇺', 'language': 'en',
        'source': 'https://transportnsw.info/routes/train',
        'extraSources': ['https://www.queenslandrailtravel.com.au/Planyourtrip/networkmap',
                         'https://www.vline.com.au/Maps-stations-stops/Network-Maps',
                         'https://transwa.wa.gov.au/plan-your-journey/train-lines/prospector'],
        'routes': {
            'sydney-melbourne': ('雪梨—墨爾本', 'Sydney Central|Campbelltown|Moss Vale|Goulburn|Cootamundra|Junee|Wagga Wagga|Albury|Wangaratta|Benalla|Seymour|Melbourne Southern Cross'),
            'sydney-brisbane': ('雪梨—布里斯本', 'Sydney Central|Strathfield|Hornsby|Gosford|Wyong|Broadmeadow|Maitland|Dungog|Taree|Wauchope|Coffs Harbour|Grafton|Casino|Brisbane Roma Street'),
            'brisbane-cairns': ('布里斯本—凱恩斯', 'Brisbane Roma Street|Nambour|Gympie North|Maryborough West|Bundaberg|Gladstone|Rockhampton|Mackay|Proserpine|Townsville|Cairns'),
            'sydney-dubbo': ('雪梨—杜博', 'Sydney Central|Parramatta|Penrith|Katoomba|Lithgow|Bathurst|Orange|Dubbo'),
            'melbourne-ballarat': ('墨爾本—巴拉瑞特', 'Melbourne Southern Cross|Footscray|Sunshine|Melton|Bacchus Marsh|Ballarat|Ararat'),
            'perth-kalgoorlie': ('伯斯—卡爾古利', 'East Perth|Midland|Northam|Merredin|Southern Cross|Kalgoorlie'),
        },
    },
}

TITLE_OVERRIDES = {
    'uk': {"London King's Cross": "London King's Cross railway station", 'London Euston': 'Euston railway station',
           'London Paddington': 'Paddington railway station', 'London St Pancras': 'St Pancras railway station'},
    'france': {'Paris-Gare-de-Lyon': 'Paris-Gare-de-Lyon', 'Paris-Montparnasse': 'Gare de Paris-Montparnasse',
               'Paris-Nord': 'Gare de Paris-Nord', 'Paris-Est': 'Gare de Paris-Est',
               'Agen': "Gare d'Agen", 'Aix-en-Provence TGV': "Gare d'Aix-en-Provence TGV",
               'Angers-Saint-Laud': "Gare d'Angers-Saint-Laud", 'Angoulême': "Gare d'Angoulême",
               'Arras': "Gare d'Arras", 'Avignon TGV': "Gare d'Avignon TGV",
               'Le Creusot TGV': 'Gare du Creusot TGV', 'Le Mans': 'Gare du Mans',
               'Mâcon-Loché TGV': 'Gare de Mâcon-Loché-TGV'},
    'germany': {},
    'australia': {'Sydney Central': 'Central railway station, Sydney',
                  'Melbourne Southern Cross': 'Southern Cross railway station',
                  'Brisbane Roma Street': 'Roma Street railway station',
                  'East Perth': 'East Perth railway station',
                  'Northam': 'Northam railway station, Western Australia',
                  'Southern Cross': 'Southern Cross railway station, Western Australia',
                  'Bathurst': 'Bathurst railway station, New South Wales',
                  'Gladstone': 'Gladstone railway station, Queensland',
                  'Grafton': 'Grafton railway station, New South Wales',
                  'Melton': 'Melton railway station, Melbourne',
                  'Midland': 'Midland railway station, Perth',
                  'Penrith': 'Penrith railway station, Sydney',
                  'Orange': 'Orange railway station, New South Wales'},
}


def title_for(country, name):
    if name in TITLE_OVERRIDES[country]:
        return TITLE_OVERRIDES[country][name]
    if country == 'uk':
        return f'{name} railway station'
    if country == 'france':
        return f'Gare de {name}'
    if country == 'germany':
        return f'Bahnhof {name}' if 'Hauptbahnhof' not in name else name
    return f'{name} railway station'


def coordinates_for(country, names):
    language = COUNTRIES[country]['language']
    titles = {name: title_for(country, name) for name in names}
    cache = json.loads(CACHE_PATH.read_text()) if CACHE_PATH.exists() else {}
    result = {name: cache[country][name] for name in names if name in cache.get(country, {})}
    remaining = [name for name in names if name not in result]
    for offset in range(0, len(remaining), 25):
        batch = remaining[offset:offset + 25]
        request_args = {'params': {
            'action': 'query', 'prop': 'coordinates|pageprops', 'titles': '|'.join(titles[name] for name in batch),
            'format': 'json', 'redirects': 1, 'colimit': 50,
        }, 'headers': HEADERS, 'timeout': 30}
        for attempt in range(4):
            response = requests.get(f'https://{language}.wikipedia.org/w/api.php', **request_args)
            if response.status_code != 429:
                break
            time.sleep(5 * (attempt + 1))
        response.raise_for_status()
        payload = response.json()['query']
        aliases = {entry['from']: entry['to'] for key in ('normalized', 'redirects') for entry in payload.get(key, [])}
        pages = {page['title']: page for page in payload['pages'].values()}
        wikidata_ids = [page.get('pageprops', {}).get('wikibase_item') for page in pages.values()
                        if not page.get('coordinates') and page.get('pageprops', {}).get('wikibase_item')]
        wikidata_points = {}
        if wikidata_ids:
            response = requests.get('https://www.wikidata.org/w/api.php', params={
                'action': 'wbgetentities', 'ids': '|'.join(wikidata_ids), 'props': 'claims', 'format': 'json',
            }, headers=HEADERS, timeout=30)
            response.raise_for_status()
            for item_id, entity in response.json().get('entities', {}).items():
                for claim in entity.get('claims', {}).get('P625', []):
                    point = claim.get('mainsnak', {}).get('datavalue', {}).get('value', {})
                    if point.get('globe') == 'http://www.wikidata.org/entity/Q2':
                        wikidata_points[item_id] = point
                        break
        for name in batch:
            title = titles[name]
            for _ in range(3):
                title = aliases.get(title, title)
            page = pages.get(title, {})
            point = next((point for point in page.get('coordinates', []) if point.get('globe') == 'earth'), None)
            point = point or wikidata_points.get(page.get('pageprops', {}).get('wikibase_item'))
            if point and 'longitude' in point:
                point = {'lat': point['latitude'], 'lon': point['longitude']}
            if point:
                result[name] = {'lat': point['lat'], 'lon': point['lon'], 'wikiTitle': page['title']}
        cache[country] = result
        CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + '\n')
        time.sleep(1)
    missing = sorted(set(names) - result.keys())
    if missing:
        raise ValueError(f'{country}: coordinates unavailable for {missing}')
    return result


def slug(value):
    ascii_text = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', ascii_text).strip('-')


def geometry_rings(geometry, country):
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for polygon in polygons:
        outer = polygon[0]
        if country == 'france' and not any(-6.2 <= lon <= 10 and 41 <= lat <= 52 for lon, lat in outer):
            continue  # The game uses metropolitan France, including Corsica.
        for ring in polygon:
            if len(ring) >= 4:
                yield ring


def build():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--countries', type=Path, required=True)
    args = parser.parse_args()
    features = json.loads(args.countries.read_text())['features']
    outlines_path = ROOT / 'data/railway-outlines.json'
    outlines = json.loads(outlines_path.read_text())
    output = {'source': 'Official route maps, Wikipedia station coordinates and Natural Earth boundaries', 'countries': {}}
    for key, config in COUNTRIES.items():
        feature = next(item for item in features if item['properties']['ADMIN'] == config['admin'])
        rings = list(geometry_rings(feature['geometry'], key))
        all_points = [point for ring in rings for point in ring]
        west = min(point[0] for point in all_points)
        east = max(point[0] for point in all_points)
        south = min(point[1] for point in all_points)
        north = max(point[1] for point in all_points)
        cosine = math.cos(math.radians((south + north) / 2))
        scale = 1000 / max((east - west) * cosine, north - south)
        def project(lon, lat):
            return (round((lon - west) * cosine * scale, 2), round((north - lat) * scale, 2))
        paths = []
        for ring in rings:
            points = [project(lon, lat) for lon, lat in ring]
            paths.append('M' + ' '.join((f'{x:g},{y:g}' if i == 0 else f'L{x:g},{y:g}') for i, (x, y) in enumerate(points[:-1])) + 'Z')
        width, height = project(east, south)
        outlines[key] = {'path': ' '.join(paths), 'bounds': {'x': -12, 'y': -12, 'width': width + 24, 'height': height + 24},
                         'source': 'Natural Earth 1:50m Admin 0 countries',
                         'projection': {'lon0': west, 'lat0': north, 'scale': scale, 'cos': cosine}}
        routes = [(route_id, label, sequence.split('|')) for route_id, (label, sequence) in config['routes'].items()]
        names = list(dict.fromkeys(name for _, _, sequence in routes for name in sequence))
        coordinates = coordinates_for(key, names)
        stations = []
        for name in names:
            point = coordinates[name]
            x, y = project(point['lon'], point['lat'])
            stations.append({'id': f'{key}:{slug(name)}', 'name': name, 'lat': point['lat'], 'lon': point['lon'],
                             'x': x, 'y': y, 'wikiTitle': point['wikiTitle'], 'wikiLanguage': config['language']})
        by_name = {station['name']: station for station in stations}
        if len(set(station['id'] for station in stations)) != len(stations):
            raise ValueError(f'{key}: duplicate station IDs')
        lines = []
        regions = []
        for route_id, label, sequence in routes:
            ids = [by_name[name]['id'] for name in sequence]
            regions.append({'id': route_id, 'name': label, 'startId': ids[0], 'stationIds': ids})
            lines.extend([a, b, label] for a, b in zip(ids, ids[1:]))
            for name in sequence:
                by_name[name].setdefault('lines', []).append(label)
        for station in stations:
            station['line'] = station['lines'][0]
        output['countries'][key] = {field: config[field] for field in ('name', 'flag', 'source')}
        output['countries'][key].update({'id': key, 'stations': stations, 'links': lines, 'regions': regions,
                                         'wikiLanguage': config['language'], 'extraSources': config.get('extraSources', [])})
        print(key, len(stations), 'stations', len(regions), 'regions')
    outlines_path.write_text(json.dumps(outlines, ensure_ascii=False, separators=(',', ':')) + '\n')
    (ROOT / 'data/railway-world.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    build()
