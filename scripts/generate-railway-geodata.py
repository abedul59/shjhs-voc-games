"""Rebuild the Taiwan/Japan railway map assets from the cited open geodata.

Install shapely and pyshp, then run with three locally downloaded source files:
python3 scripts/generate-railway-geodata.py --countries ne_10m_admin_0_countries.geojson \
  --admin1 ne_10m_admin_1_states_provinces.shp --n02 N02-25_GML.zip
"""
import argparse
import json,math,zipfile,collections,heapq
from pathlib import Path
import shapefile
from shapely.geometry import shape,Point
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--countries',required=True,type=Path)
parser.add_argument('--admin1',required=True,type=Path)
parser.add_argument('--n02',required=True,type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
country=json.load(open(args.countries))
chinese_names=json.load(open(root/'data/railway-japan-zh-source.json'))
selected={f['properties']['ADMIN']:f for f in country['features'] if f['properties'].get('ADMIN') in ('Taiwan','Japan')}
projections={'taiwan':{'lon0':119,'lat0':26,'scale':100,'cos':math.cos(math.radians(23.5))},'japan':{'lon0':122,'lat0':47,'scale':100,'cos':math.cos(math.radians(35))}}
def project(lon,lat,key):
 p=projections[key];return (round((lon-p['lon0'])*p['scale']*p['cos'],2),round((p['lat0']-lat)*p['scale'],2))
def rings(geom):
 if geom.geom_type=='Polygon':yield geom.exterior;yield from geom.interiors
 elif geom.geom_type=='MultiPolygon':
  for poly in geom.geoms:yield from rings(poly)
outlines={}
for key,name,tol in [('taiwan','Taiwan',.0005),('japan','Japan',.0005)]:
 geom=shape(selected[name]['geometry']).simplify(tol,preserve_topology=True)
 pieces=[]
 for ring in rings(geom):
  coords=[project(lon,lat,key) for lon,lat in ring.coords]
  if len(coords)<4:continue
  pieces.append('M'+' '.join((f'{x:g},{y:g}' if i==0 else f'L{x:g},{y:g}') for i,(x,y) in enumerate(coords[:-1]))+'Z')
 west,south,east,north=geom.bounds
 x0,y0=project(west,north,key);x1,y1=project(east,south,key)
 outlines[key]={'path':' '.join(pieces),'bounds':{'x':x0-12,'y':y0-12,'width':x1-x0+24,'height':y1-y0+24},
                'source':'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/','projection':projections[key]}
 print(key,'path len',len(outlines[key]['path']),'parts',len(pieces))
(root/'data/railway-outlines.json').write_text(json.dumps(outlines,ensure_ascii=False,separators=(',',':'))+'\n')
rail=json.load(open(root/'data/railway-taiwan.json'))
for station in rail['stations']:
 station['x'],station['y']=project(station['lon'],station['lat'],'taiwan')
rail['outlineSource']='Natural Earth 1:10m Admin 0 countries'
(root/'data/railway-taiwan.json').write_text(json.dumps(rail,ensure_ascii=False,indent=2)+'\n')
# Japan JR station data from 2025 MLIT National Land Numerical Information N02.
z=zipfile.ZipFile(args.n02)
station_features=json.loads(z.read('N02-25_GML/UTF-8/N02-25_Station.geojson'))['features']
line_features=json.loads(z.read('N02-25_GML/UTF-8/N02-25_RailroadSection.geojson'))['features']
operators={'北海道旅客鉄道':'hokkaido','東日本旅客鉄道':'east','東海旅客鉄道':'central','西日本旅客鉄道':'west','四国旅客鉄道':'shikoku','九州旅客鉄道':'kyushu'}
areas={'hokkaido':'JR 北海道','east':'JR 東日本','central':'JR 東海','west':'JR 西日本','shikoku':'JR 四國','kyushu':'JR 九州'}
# Natural Earth prefecture geometry and Traditional Chinese names.
reader=shapefile.Reader(str(args.admin1),encoding='utf-8')
fields=[field[0] for field in reader.fields[1:]]
prefs=[]
for sr in reader.iterShapeRecords():
 p=dict(zip(fields,sr.record))
 if p.get('admin')!='Japan':continue
 geom=shape(sr.shape.__geo_interface__)
 prefs.append({'id':p['iso_3166_2'],'name':p['name_zht'] or p['name_ja'],'ja':p['name_ja'],'geometry':geom,'bounds':geom.bounds})
assert len(prefs)==47
# A few boundary stations fall on the wrong side of Natural Earth's 1:10m
# simplified prefecture polygons. Use their verified station prefectures.
prefecture_overrides={'jp:central:004982':'JP-25','jp:east:003010':'JP-11',
 'jp:east:004253':'JP-14','jp:west:004434':'JP-31','jp:kyushu:009619':'JP-43'}
# Station feature line geometry's midpoint; group_code merges transfers within 300 m.
by_area={key:{} for key in areas}
line_stations=collections.defaultdict(list)
for feature in station_features:
 p=feature['properties'];operator=operators.get(p['N02_004'])
 if not operator:continue
 # 留萌線 ended passenger operation on 2026-03-31; 海峡線 has no regular
 # passenger service. Their interchange stations remain via active JR lines.
 if operator=='hokkaido' and p['N02_003'] in ('留萌線','海峡線'):continue
 code=p['N02_005g'];sid=f'jp:{operator}:{code}'
 coords=feature['geometry']['coordinates'];lon=sum(x for x,y in coords)/len(coords);lat=sum(y for x,y in coords)/len(coords)
 station=by_area[operator].setdefault(sid,{'id':sid,'name':p['N02_005'],'operator':operator,'points':[],'lines':set(),'lineNames':set()})
 station['points'].append((lon,lat));station['lines'].add(p['N02_003']);station['lineNames'].add(p['N02_003'])
 line_stations[(operator,p['N02_003'])].append((sid,coords))
for operator,stations in by_area.items():
 for station in stations.values():
  lon=sum(x for x,y in station['points'])/len(station['points']);lat=sum(y for x,y in station['points'])/len(station['points'])
  point=Point(lon,lat)
  inside=[p for p in prefs if p['bounds'][0]-.02<=lon<=p['bounds'][2]+.02 and p['bounds'][1]-.02<=lat<=p['bounds'][3]+.02 and p['geometry'].covers(point)]
  prefecture=(inside or [min(prefs,key=lambda p:p['geometry'].distance(point))])[0]
  if station['id'] in prefecture_overrides:
   prefecture=next(p for p in prefs if p['id']==prefecture_overrides[station['id']])
  station['lon']=round(lon,6);station['lat']=round(lat,6);station['x'],station['y']=project(lon,lat,'japan')
  station['prefecture']=prefecture['id'];station['prefectureName']=prefecture['name']
  station['zhName']=chinese_names['overrides'].get(station['id']) or chinese_names['names'].get(station['name']+'駅')
  if not station['zhName']:raise ValueError('Missing Chinese station name: '+station['id'])
  station['lines']=sorted(station['lines']);station['line']=station['lines'][0];del station['lineNames'];del station['points']
# Topology: station endpoints are present in the railroad section geometry. Multi-source Dijkstra over each operating line.
line_tracks=collections.defaultdict(list)
for feature in line_features:
 p=feature['properties'];operator=operators.get(p['N02_004'])
 if operator and not (operator=='hokkaido' and p['N02_003'] in ('留萌線','海峡線')):
  line_tracks[(operator,p['N02_003'])].append(feature['geometry']['coordinates'])
all_links={op:set() for op in areas}
line_links=collections.defaultdict(set)
missing_sources=collections.Counter()
for key,station_rows in line_stations.items():
 op,line=key
 graph=collections.defaultdict(dict)
 for coords in line_tracks[key]:
  for a,b in zip(coords,coords[1:]):
   a,b=tuple(a),tuple(b)
   weight=math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])
   graph[a][b]=weight;graph[b][a]=weight
 owners={};dist={};heap=[]
 for sid,coords in station_rows:
  for point in [tuple(coords[0]),tuple(coords[-1])]:
   if point not in graph:missing_sources[key]+=1;continue
   owners[point]=sid;dist[point]=0;heapq.heappush(heap,(0,point))
 while heap:
  d,node=heapq.heappop(heap)
  if d!=dist[node]:continue
  owner=owners[node]
  for other,w in graph[node].items():
   nd=d+w
   if nd+1e-12<dist.get(other,float('inf')):
    dist[other]=nd;owners[other]=owner;heapq.heappush(heap,(nd,other))
 for a,neighbors in graph.items():
  if a not in owners:continue
  for b in neighbors:
   if b in owners and owners[a]!=owners[b]:
    pair=tuple(sorted((owners[a],owners[b])))
    all_links[op].add(pair)
    line_links[key].add(pair)
 print(op,line,'stations',len(set(sid for sid,_ in station_rows)),'links',sum(1 for a,b in all_links[op] if a in set(sid for sid,_ in station_rows) and b in set(sid for sid,_ in station_rows)))
print('missing graph source endpoints',sum(missing_sources.values()),missing_sources.most_common(10))
def line_order(operator,line,ids):
 remaining=set(ids);neighbors=collections.defaultdict(set)
 for a,b in line_links[(operator,line)]:
  if a in remaining and b in remaining:neighbors[a].add(b);neighbors[b].add(a)
 locations=by_area[operator]
 def position(sid):return (locations[sid]['y'],locations[sid]['x'],sid)
 ordered=[]
 while remaining:
  endpoints=[sid for sid in remaining if len(neighbors[sid] & remaining)<=1]
  start=min(endpoints or remaining,key=position)
  stack=[start]
  while stack:
   sid=stack.pop()
   if sid not in remaining:continue
   remaining.remove(sid);ordered.append(sid)
   stack.extend(sorted(neighbors[sid] & remaining,key=position,reverse=True))
 return ordered
output_dir=root/'public/railway';output_dir.mkdir(parents=True,exist_ok=True)
index={'source':'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html','sourceYear':2025,'license':'CC BY 4.0','regions':[]}
for op,area_name in areas.items():
 stations=list(by_area[op].values());stations.sort(key=lambda s:(s['prefecture'],s['name'],s['id']))
 ids=set(s['id'] for s in stations)
 links=sorted([list(pair) for pair in all_links[op] if set(pair)<=ids])
 degrees=collections.Counter(x for pair in links for x in pair)
 isolated=[s for s in stations if degrees[s['id']]==0]
 line_groups=collections.defaultdict(list);pref_groups=collections.defaultdict(list)
 for st in stations:
  for line in st['lines']:line_groups[line].append(st['id'])
  pref_groups[st['prefecture']].append(st['id'])
 data={'id':op,'name':area_name,'country':'japan','stations':stations,'links':links,
       'lines':[{'id':line,'name':line,'stationIds':line_order(op,line,sids)} for line,sids in sorted(line_groups.items())],
       'prefectures':[{'id':pid,'name':next(p['name'] for p in prefs if p['id']==pid),'stationIds':sids} for pid,sids in sorted(pref_groups.items())]}
 (output_dir/f'japan-{op}.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 index['regions'].append({'id':op,'name':area_name,'stationCount':len(stations),'stationIds':[s['id'] for s in stations],
    'lineCount':len(line_groups),'prefectureCount':len(pref_groups)})
 print('AREA',op,len(stations),'links',len(links),'isolated',len(isolated),'file bytes',(output_dir/f'japan-{op}.json').stat().st_size)
 if isolated:print('ISOLATED',[(s['name'],s['lines']) for s in isolated[:15]])
(root/'data/railway-japan-index.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':'))+'\n')
print('total',sum(len(x) for x in by_area.values()))
